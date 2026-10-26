/**
 * Moteur Heuristique Universel d'Extraction d'Offres d'Emploi et de Formulaires ATS
 * Inspiré par les leaders du marché (Simplify Copilot, Teal Job Tracker).
 * 100% exécutable côté client dans le navigateur (Bookmarklet & Extension).
 */

import type { CandidateProfile } from '../careerOps'
import { localDb } from '../localDb'

export interface ExtractedJobPosting {
  titre: string
  entreprise: string
  url: string
  localisation: string
  remote: string // "Télétravail total", "Hybride", "Sur site", "Non spécifié"
  salaire: string // ex: "45k€ - 55k€ / an", "1200€ / mois"
  type_contrat: string // "CDI", "CDD", "Stage", "Alternance", "Freelance"
  experience_requise: string // "0-1 an", "1-3 ans", "3-5 ans", "5+ ans", "-"
  reference: string
  source: string // "LinkedIn", "WTTJ", "Indeed", "Workday", "Greenhouse", "Lever", "SmartRecruiters", "Ashby", "Direct"
  description: string
  mots_cles: string
}

export interface MatchScoreResult {
  score: number // ex: 85
  badgeText: string // "Match à 85%"
  badgeColor: 'emerald' | 'teal' | 'amber' | 'slate'
  matchedSkills: string[]
  missingSkills: string[]
  isTargetCompany: boolean
  isTargetSector: boolean
  contractFit: boolean
  seniorityFit: {
    required: string
    candidate: string
    isMatch: boolean
  }
  recommendations: string[]
}

// ---------------------------------------------------------------------------
// 1. DICTIONNAIRE D'HEURISTIQUES REGEX POUR FORMULAIRES ATS (Simplify-Style)
// ---------------------------------------------------------------------------

export const ATS_FORM_MAPPINGS = {
  firstName: /^(first[_\s-]?name|pr[eé]nom|given[_\s-]?name|fname)$/i,
  lastName: /^(last[_\s-]?name|nom([_\s-]?de[_\s-]?famille)?|family[_\s-]?name|surname|lname)$/i,
  fullName: /^(full[_\s-]?name|nom[_\s-]?complet|name|nom)$/i,
  email: /^(e[_\s-]?mail|courriel|adresse[_\s-]?e?mail)$/i,
  phone: /^(phone|t[eé]l[eé]phone|mobile|cell|num[eé]ro([_\s-]?de)?[_\s-]?t[eé]l)$/i,
  linkedin: /^(linkedin([_\s-]?(profile|url))?)$/i,
  github: /^(github([_\s-]?(profile|url|username))?)$/i,
  portfolio: /^(portfolio|website|site[_\s-]?web|personal[_\s-]?(site|url))$/i,
  location: /^(location|ville|city|address|adresse|postal[_\s-]?code|code[_\s-]?postal)$/i,
  salary: /^(salary([_\s-]?(expectation|desired|requirements))?|pr[eé]tentions([_\s-]?salariales)?|r[eé]mun[eé]ration([_\s-]?souhait[eé]e)?)$/i,
  noticePeriod: /^(notice([_\s-]?period)?|pr[eé]avis|disponibilit[eé]|availability)$/i,
  resume: /^(resume|cv|curriculum[_\s-]?vitae)$/i,
  coverLetter: /^(cover[_\s-]?letter|lettre[_\s-]?motivation|motivation)$/i,
}

export type CandidateFieldKey = keyof typeof ATS_FORM_MAPPINGS

/**
 * Identifie automatiquement la nature d'un champ de saisie d'un formulaire ATS
 * en analysant son id, name, placeholder, label et aria-label.
 */
export function identifyFormField(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): CandidateFieldKey | null {
  const hints = [
    el.name,
    el.id,
    el.getAttribute('autocomplete') || '',
    el.getAttribute('placeholder') || '',
    el.getAttribute('aria-label') || '',
    el.getAttribute('data-automation-id') || '',
  ].filter(Boolean).join(' ').toLowerCase()

  // Chercher aussi le texte du label associé
  let labelText = ''
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`)
    if (label) labelText = label.textContent || ''
  }
  if (!labelText && el.closest('label')) {
    labelText = el.closest('label')?.textContent || ''
  }
  const fullText = (hints + ' ' + labelText).trim()

  for (const [key, regex] of Object.entries(ATS_FORM_MAPPINGS)) {
    if (regex.test(fullText) || regex.test(hints)) {
      return key as CandidateFieldKey
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// 2. DICTIONNAIRE ATS DES HARD SKILLS & SYNONYMES (Simplify-Verified)
// ---------------------------------------------------------------------------

export const HARD_SKILLS_CATALOG = [
  // Programmation & Systèmes
  'c++', 'c', 'python', 'rust', 'go', 'java', 'c#', '.net', 'kotlin', 'swift',
  'linux', 'embedded linux', 'rtos', 'freertos', 'vxworks', 'qnx', 'temps réel',
  'embarqué', 'systèmes embarqués', 'avionique', 'do-178c', 'do-178b', 'do-254',
  'arinc', 'arinc 429', 'arinc 664', 'can', 'can bus', 'ethernet', 'afdx',
  'matlab', 'simulink', 'labview', 'fpga', 'vhdl', 'verilog', 'microcontrôleur',
  'stm32', 'arm', 'dsp', 'bancs de test', 'hils', 'dils', 'validation', 'cycle en v',
  
  // CAO & Ingénierie
  'catia', 'catia v5', 'solidworks', 'ansys', 'patran', 'nastran', 'cfd',
  'aérodynamique', 'propulsion', 'mécanique des fluides', 'thermique', 'spatial',
  'structures', 'dimensionnement', 'en 9100', 'iso 9001', 'part 21', 'part 145',
  
  // Web & Cloud
  'typescript', 'javascript', 'react', 'vue', 'angular', 'next.js', 'node.js',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd', 'git', 'github actions',
  'sql', 'postgresql', 'mongodb', 'graphql', 'rest api',
  
  // Data & IA
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'scikit-learn',
  'nlp', 'computer vision', 'opencv', 'pandas', 'numpy',
  
  // Méthodologies & Soft skills techniques
  'agile', 'scrum', 'jira', 'gestion de projet', 'anglais courant', 'anglais technique'
]

/**
 * Clusters de synonymes issus de la décompilation des leaders (Simplify Copilot / Teal)
 * Permet un matching souple (ex: "back-end" <-> "backend", "reactjs" <-> "react", "embedded" <-> "embarqué")
 */
export const SKILL_SYNONYMS: Record<string, string[]> = {
  'c++': ['c++', 'cpp', 'c/c++'],
  'c': ['c', 'c lang', 'langage c'],
  'python': ['python', 'python3', 'py'],
  'embarqué': ['embarqué', 'embarque', 'embedded', 'systèmes embarqués', 'firmware', 'bare-metal'],
  'linux': ['linux', 'embedded linux', 'linux embarqué', 'yocto', 'buildroot', 'kernel'],
  'avionique': ['avionique', 'avionics', 'aéronautique', 'aeronautics', 'aerospace', 'spatial', 'aérospatial'],
  'do-178c': ['do-178', 'do-178b', 'do-178c', 'do-254', 'safety critical', 'sûreté de fonctionnement', 'iso 26262'],
  'arinc': ['arinc', 'arinc 429', 'arinc 664', 'can bus', 'bus can', 'afdx', 'mil-std-1553'],
  'react': ['react', 'react.js', 'reactjs'],
  'vue': ['vue', 'vue.js', 'vuejs'],
  'node.js': ['node', 'node.js', 'nodejs'],
  'typescript': ['typescript', 'ts'],
  'javascript': ['javascript', 'js'],
  'docker': ['docker', 'containers', 'conteneurs'],
  'kubernetes': ['kubernetes', 'k8s'],
  'aws': ['aws', 'amazon web services'],
  'ci/cd': ['ci/cd', 'cicd', 'github actions', 'gitlab ci', 'jenkins'],
  'sql': ['sql', 'postgresql', 'postgres', 'mysql'],
  'agile': ['agile', 'scrum', 'kanban'],
  'machine learning': ['machine learning', 'ml', 'deep learning', 'ia', 'ai'],
}

// ---------------------------------------------------------------------------
// 3. SÉLECTEURS CSS MULTI-PLATEFORMES ATS & JOB BOARDS (Simplify-Calibrated)
// ---------------------------------------------------------------------------

export const PLATFORM_SELECTORS = {
  linkedin: {
    title: [
      '.job-details-jobs-unified-top-card__job-title',
      '.job-details-jobs-unified-top-card__title-container a h2',
      'h1.topcard__title',
      'h1.t-24',
      '.jobs-unified-top-card__job-title',
      'h1'
    ],
    company: [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__title-container span.truncate',
      '[data-tracking-control-name="public_jobs_topcard-org-name"]',
      '.jobs-unified-top-card__company-name'
    ],
    location: [
      '.job-details-jobs-unified-top-card__title-container div.truncate span:nth-child(2)',
      '.job-details-jobs-unified-top-card__tertiary-description-container span.tvm__text',
      '.job-details-jobs-unified-top-card__primary-description',
      '.jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__workplace-type'
    ],
    salary: ['.job-details-preferences-and-skills', '.job-details-jobs-unified-top-card__job-insight'],
    description: [
      '#job-details',
      '.jobs-description-content__text',
      'div[componentkey^="JobDetails_AboutTheJob"] span[data-testid="expandable-text-box"]',
      '.decorated-job-posting__details .description__text',
      '.jobs-box__html-content',
      '.show-more-less-html__markup'
    ],
  },
  wttj: {
    title: ['h1[data-testid="job-header-title"]', 'h1', 'header h1'],
    company: ['[data-testid="job-header-company-name"]', 'header a[href*="/companies/"]'],
    location: ['[data-testid="job-header-metas"]', 'header [data-testid="job-meta-location"]'],
    salary: ['[data-testid="job-header-metas"] span'],
    description: ['[data-testid="job-section-description"]', 'article[data-testid="job-section"]', 'main section'],
  },
  indeed: {
    title: ['h2.jobsearch-JobInfoHeader-title', 'h1[data-testid="simpler-jobTitle"]', 'h1'],
    company: ['[data-testid="inlineHeader-companyName"]', '.jobsearch-CompanyInfoContainer a', '[data-testid="company-name"]'],
    location: ['[data-testid="inlineHeader-companyLocation"]', '[data-testid="job-location"]'],
    salary: ['#salaryInfoAndJobType', '[data-testid="attribute_snippets_section"]', '.salary-snippet-container'],
    description: ['#jobDescriptionText', '.jobsearch-jobDescriptionText'],
  },
  workday: {
    title: ['h2[data-automation-id="jobPostingHeader"]', '[data-automation-id="jobPostingHeader"]', 'h2[data-automation-id="jobTitle"]', 'h1'],
    company: ['[data-automation-id="companyName"]', 'meta[property="og:site_name"]'],
    location: ['div[data-automation-id="locations"] dl dd', '[data-automation-id="locations"]', '[data-automation-id="jobPostingLocation"]'],
    salary: ['[data-automation-id="salary"]', '[data-automation-id="compensation"]'],
    description: ['div[aria-label="Job Posting Description"] div[data-automation-id="jobPostingDescription"]', '[data-automation-id="jobPostingDescription"]'],
  },
  greenhouse: {
    title: ['.app-title', 'h1.heading', '#header h1', 'h1'],
    company: ['.company-name', 'span.company-name'],
    location: ['.location', '.body--metadata'],
    salary: ['.salary', '.compensation'],
    description: ['#content', '#app_body', '.content'],
  },
  lever: {
    title: ['.posting-headline h2', 'h2', 'h1'],
    company: ['header .main-header img[alt]', '.posting-headline .company'],
    location: ['.posting-categories .location', '.sort-by-time.posting-category'],
    salary: ['.salary', '.compensation'],
    description: ['.section-page .section-wrapper', '.content .section', '.posting-description'],
  },
  smartrecruiters: {
    title: ['h1.job-title', '[itemprop="title"]', 'h1'],
    company: ['.company-name', '[itemprop="hiringOrganization"]'],
    location: ['.job-location', '[itemprop="address"]'],
    salary: ['.job-salary'],
    description: ['.job-sections', '[itemprop="description"]'],
  },
  ashby: {
    title: ['h1', '[class*="JobPosting_title"]'],
    company: ['header img[alt]', 'meta[property="og:site_name"]'],
    location: ['[class*="JobPosting_location"]', '[class*="location"]'],
    salary: ['[class*="compensation"]', '[class*="salary"]'],
    description: ['[class*="JobPosting_description"]', '[class*="description"]'],
  },
}

// ---------------------------------------------------------------------------
// 4. MOTEUR DE SCORING SÉMANTIQUE LOCAL (Client-side ATS Matcher)
// ---------------------------------------------------------------------------

/**
 * Calcule un score sémantique et un match ATS rigoureux entre l'offre et le profil candidat
 * Exécuté à 100% dans le navigateur de l'utilisateur (zéro coût, zéro appel API).
 */
export function calculateMatchScore(
  jobDescription: string,
  userProfile?: CandidateProfile | null,
  titre?: string,
  entreprise?: string,
  typeContrat?: string
): MatchScoreResult {
  const profile = userProfile || localDb.getCandidateProfile()
  const fullJobText = `${titre || ''} ${entreprise || ''} ${jobDescription || ''}`.toLowerCase()
  const entLower = (entreprise || '').toLowerCase()
  const cvTextLower = (profile?.cvTexteBrut || '').toLowerCase()

  // 1. Détection des compétences requises par l'offre
  const requiredSkillsInJob: string[] = []
  for (const skill of HARD_SKILLS_CATALOG) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, 'i')
    if (regex.test(fullJobText)) {
      const formatted = skill === 'c++' ? 'C++' : skill === 'c' ? 'C' : skill.charAt(0).toUpperCase() + skill.slice(1)
      if (!requiredSkillsInJob.includes(formatted)) {
        requiredSkillsInJob.push(formatted)
      }
    }
  }

  // 2. Comparaison avec les compétences du profil candidat avec expansion de synonymes (Simplify-Style)
  const candidateSkills = (profile?.competencesCles || []).map(s => s.toLowerCase())
  const matchedSkills: string[] = []
  const missingSkills: string[] = []

  for (const skill of requiredSkillsInJob) {
    const sLow = skill.toLowerCase()
    const synonyms = SKILL_SYNONYMS[sLow] || [sLow]

    const inProfileList = candidateSkills.some(cs =>
      synonyms.some(syn => cs === syn || cs.includes(syn) || syn.includes(cs))
    )
    const inCvText = synonyms.some(syn => cvTextLower.includes(syn))

    if (inProfileList || inCvText) {
      matchedSkills.push(skill)
    } else {
      missingSkills.push(skill)
    }
  }

  // Si aucune compétence catalogue n'a été détectée dans l'offre, tester les compétences spécifiques du candidat
  if (requiredSkillsInJob.length === 0) {
    for (const skill of profile?.competencesCles || []) {
      if (fullJobText.includes(skill.toLowerCase())) {
        matchedSkills.push(skill)
      }
    }
  }

  // 3. Calcul de la composante Compétences (Pondération: 50%)
  const totalSkills = matchedSkills.length + missingSkills.length
  let skillScore = 70 // score par défaut si peu de compétences explicites
  if (totalSkills > 0) {
    skillScore = Math.round((matchedSkills.length / totalSkills) * 100)
  }

  // 4. Calcul de la composante Entreprise Favorite & Secteur (Pondération: 25%)
  let companyScore = 40
  let isTargetCompany = false
  let isTargetSector = false

  const targetCompanies = (profile?.entreprisesCibles || []).map(c => c.toLowerCase())
  if (entLower && targetCompanies.some(c => entLower.includes(c) || c.includes(entLower))) {
    companyScore = 100
    isTargetCompany = true
  } else {
    const targetSectors = (profile?.secteursCibles || []).map(s => s.toLowerCase())
    if (targetSectors.some(s => fullJobText.includes(s))) {
      companyScore = 80
      isTargetSector = true
    }
  }

  // 5. Calcul de la composante Type de Contrat (Pondération: 15%)
  let contractScore = 50
  let contractFit = false
  if (typeContrat && profile?.typesContratsRecherches) {
    const desired = profile.typesContratsRecherches.map(t => t.toLowerCase())
    if (desired.includes(typeContrat.toLowerCase())) {
      contractScore = 100
      contractFit = true
    }
  }

  // 6. Calcul de l'adéquation Expérience / Seniority (Pondération: 10%)
  let requiredSeniority = '-'
  if (fullJobText.includes('stage') || fullJobText.includes('stagiaire') || fullJobText.includes('internship')) {
    requiredSeniority = '0-1 an (Stage)'
  } else if (fullJobText.includes('alternance') || fullJobText.includes('apprenti')) {
    requiredSeniority = '0-1 an (Alternance)'
  } else if (fullJobText.includes('senior') || fullJobText.includes('expert') || fullJobText.includes('5 ans') || fullJobText.includes('5+ ans')) {
    requiredSeniority = '5+ ans'
  } else if (fullJobText.includes('confirmé') || fullJobText.includes('3 ans') || fullJobText.includes('3-5 ans')) {
    requiredSeniority = '3-5 ans'
  } else if (fullJobText.includes('junior') || fullJobText.includes('débutant') || fullJobText.includes('1 an') || fullJobText.includes('1-3 ans')) {
    requiredSeniority = '0-2 ans'
  }

  const seniorityMatch = Boolean(
    profile?.anneesExperience &&
    (requiredSeniority === '-' ||
     requiredSeniority.includes(profile.anneesExperience) ||
     (profile.anneesExperience === '0-1 an' && (requiredSeniority.includes('Stage') || requiredSeniority.includes('0-2 ans'))))
  )
  const seniorityScore = seniorityMatch ? 100 : 60

  // 7. Score Global Pondéré (0 à 100)
  const globalScore = Math.round(
    skillScore * 0.50 +
    companyScore * 0.25 +
    contractScore * 0.15 +
    seniorityScore * 0.10
  )

  // Calibrage intelligent (ne descend pas en dessous de 35% pour une opportunité générale, ni au-delà de 98%)
  const boundedScore = Math.min(Math.max(globalScore, isTargetCompany ? 75 : 35), 98)

  // 8. Badge Color
  let badgeColor: 'emerald' | 'teal' | 'amber' | 'slate' = 'slate'
  if (boundedScore >= 80) badgeColor = 'emerald'
  else if (boundedScore >= 65) badgeColor = 'teal'
  else badgeColor = 'amber'

  // 9. Recommandations concrètes
  const recommendations: string[] = []
  if (missingSkills.length > 0) {
    recommendations.push(`Ajoutez à votre CV les mots-clés ATS attendus : ${missingSkills.slice(0, 3).join(', ')}.`)
  }
  if (matchedSkills.length > 0) {
    recommendations.push(`Valorisez vos réalisations concrètes sur : ${matchedSkills.slice(0, 3).join(', ')}.`)
  }
  if (isTargetCompany) {
    recommendations.push(`Entreprise cible favorite (${entreprise}) : personnalisez votre lettre avec vos projets clés.`)
  }

  return {
    score: boundedScore,
    badgeText: `Match à ${boundedScore}%`,
    badgeColor,
    matchedSkills,
    missingSkills,
    isTargetCompany,
    isTargetSector,
    contractFit,
    seniorityFit: {
      required: requiredSeniority,
      candidate: profile?.anneesExperience || '0-1 an',
      isMatch: seniorityMatch,
    },
    recommendations,
  }
}

// ---------------------------------------------------------------------------
// 5. GÉNÉRATEUR DU CODE JAVASCRIPT DU BOOKMARKLET NEXTSTEP UNIVERSEL
// ---------------------------------------------------------------------------

/**
 * Génère le code bookmarklet (javascript:...) intégrant l'extraction universelle
 * sur LinkedIn, WTTJ, Indeed, Workday, Greenhouse, Lever, SmartRecruiters, Ashby.
 */
export function generateUniversalBookmarkletCode(appOrigin: string): string {
  const extractorBody = `
(function() {
  function getPlatform() {
    var h = window.location.hostname.toLowerCase();
    if (h.includes('linkedin.com')) return 'linkedin';
    if (h.includes('welcometothejungle.com') || h.includes('wttj')) return 'wttj';
    if (h.includes('indeed.')) return 'indeed';
    if (h.includes('myworkdayjobs.com') || h.includes('workday')) return 'workday';
    if (h.includes('greenhouse.io')) return 'greenhouse';
    if (h.includes('lever.co')) return 'lever';
    if (h.includes('smartrecruiters.com')) return 'smartrecruiters';
    if (h.includes('ashbyhq.com')) return 'ashby';
    return 'generic';
  }

  function cleanText(txt) {
    return (txt || '').replace(/\\s+/g, ' ').trim();
  }

  function extractFromPlatform() {
    var p = getPlatform();
    var doc = document;
    var titre = '', entreprise = '', localisation = '', salaire = '', typeContrat = '', desc = '', url = window.location.href;
    var remote = 'Non spécifié';

    // 1. JSON-LD standard Schema.org
    try {
      var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(function(s) {
        try {
          var parsed = JSON.parse(s.textContent);
          var items = Array.isArray(parsed) ? parsed : [parsed];
          items.forEach(function(item) {
            if (item && (item['@type'] === 'JobPosting' || (item['@type'] && item['@type'].indexOf && item['@type'].indexOf('JobPosting') >= 0))) {
              if (item.title && !titre) titre = item.title;
              if (item.hiringOrganization && item.hiringOrganization.name && !entreprise) entreprise = item.hiringOrganization.name;
              if (item.jobLocation) {
                var locObj = item.jobLocation;
                if (locObj.address) {
                  var a = locObj.address;
                  localisation = [a.addressLocality, a.addressRegion, a.addressCountry].filter(Boolean).join(', ');
                } else if (locObj.name) localisation = locObj.name;
              }
              if (item.baseSalary && item.baseSalary.value) {
                var v = item.baseSalary.value;
                salaire = (v.minValue ? v.minValue + ' - ' : '') + (v.value || v.maxValue || '') + ' ' + (item.baseSalary.currency || '€');
              }
              if (item.employmentType && !typeContrat) {
                var emp = String(item.employmentType).toLowerCase();
                if (emp.includes('full') || emp.includes('cdi')) typeContrat = 'CDI';
                else if (emp.includes('contract') || emp.includes('cdd')) typeContrat = 'CDD';
                else if (emp.includes('intern') || emp.includes('stage')) typeContrat = 'Stage';
                else if (emp.includes('apprent') || emp.includes('altern')) typeContrat = 'Alternance';
              }
              if (item.description && !desc) {
                var tmp = doc.createElement('div');
                tmp.innerHTML = item.description;
                desc = tmp.innerText.trim();
              }
            }
          });
        } catch(e) {}
      });
    } catch(e) {}

    // 2. Sélecteurs DOM dédiés selon la plateforme
    if (p === 'linkedin') {
      var tEl = doc.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24, h1');
      if (tEl && (!titre || titre === doc.title)) titre = cleanText(tEl.innerText);
      var cEl = doc.querySelector('.job-details-jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name, [data-tracking-control-name="public_jobs_topcard-org-name"]');
      if (cEl && !entreprise) entreprise = cleanText(cEl.innerText);
      var lEl = doc.querySelector('.job-details-jobs-unified-top-card__primary-description, .jobs-unified-top-card__bullet');
      if (lEl && !localisation) {
        var parts = cleanText(lEl.innerText).split('·');
        localisation = parts.length > 1 ? parts[0].trim() : cleanText(lEl.innerText);
      }
      var dEl = doc.querySelector('#job-details, .jobs-description-content__text, .jobs-box__html-content');
      if (dEl && !desc) desc = cleanText(dEl.innerText);
    } else if (p === 'wttj') {
      var wtTitle = doc.querySelector('h1[data-testid="job-header-title"], h1');
      if (wtTitle && !titre) titre = cleanText(wtTitle.innerText);
      var wtComp = doc.querySelector('[data-testid="job-header-company-name"], header a[href*="/companies/"]');
      if (wtComp && !entreprise) entreprise = cleanText(wtComp.innerText);
      var wtDesc = doc.querySelector('[data-testid="job-section-description"], article');
      if (wtDesc && !desc) desc = cleanText(wtDesc.innerText);
      doc.querySelectorAll('[data-testid="job-header-metas"] span').forEach(function(span) {
        var t = cleanText(span.innerText);
        if (t.includes('€') || t.includes('k€') || t.includes('$')) salaire = t;
        if (t.toLowerCase().includes('télétravail') || t.toLowerCase().includes('remote')) remote = t;
        if (!localisation && (t.includes('France') || t.includes('Paris') || t.includes('Lyon') || t.includes('Toulouse') || t.includes('Bordeaux'))) localisation = t;
      });
    } else if (p === 'indeed') {
      var indTitle = doc.querySelector('h2.jobsearch-JobInfoHeader-title, h1');
      if (indTitle && !titre) titre = cleanText(indTitle.innerText).replace('- job post', '').trim();
      var indComp = doc.querySelector('[data-testid="inlineHeader-companyName"], .jobsearch-CompanyInfoContainer a');
      if (indComp && !entreprise) entreprise = cleanText(indComp.innerText);
      var indLoc = doc.querySelector('[data-testid="inlineHeader-companyLocation"]');
      if (indLoc && !localisation) localisation = cleanText(indLoc.innerText);
      var indSal = doc.querySelector('#salaryInfoAndJobType, [data-testid="attribute_snippets_section"]');
      if (indSal && !salaire) salaire = cleanText(indSal.innerText);
      var indDesc = doc.querySelector('#jobDescriptionText');
      if (indDesc && !desc) desc = cleanText(indDesc.innerText);
    } else if (p === 'workday') {
      var wdTitle = doc.querySelector('[data-automation-id="jobPostingHeader"], h2[data-automation-id="jobTitle"], h1');
      if (wdTitle && !titre) titre = cleanText(wdTitle.innerText);
      var wdLoc = doc.querySelector('[data-automation-id="locations"], [data-automation-id="jobPostingLocation"]');
      if (wdLoc && !localisation) localisation = cleanText(wdLoc.innerText);
      var wdDesc = doc.querySelector('[data-automation-id="jobPostingDescription"]');
      if (wdDesc && !desc) desc = cleanText(wdDesc.innerText);
      entreprise = window.location.hostname.split('.')[0] || 'Workday ATS';
    } else if (p === 'greenhouse' || p === 'lever' || p === 'smartrecruiters' || p === 'ashby') {
      var ghTitle = doc.querySelector('.app-title, .posting-headline h2, h1.job-title, h1');
      if (ghTitle && !titre) titre = cleanText(ghTitle.innerText);
      var ghComp = doc.querySelector('.company-name, header img[alt], [itemprop="hiringOrganization"]');
      if (ghComp && !entreprise) entreprise = cleanText(ghComp.getAttribute('alt') || ghComp.innerText);
      var ghLoc = doc.querySelector('.location, .posting-categories .location, .job-location');
      if (ghLoc && !localisation) localisation = cleanText(ghLoc.innerText);
      var ghDesc = doc.querySelector('#content, #app_body, .section-page, .job-sections, [class*="JobPosting_description"]');
      if (ghDesc && !desc) desc = cleanText(ghDesc.innerText);
    }

    // Fallbacks génériques sur balises HTML
    if (!titre) {
      var fallbackH1 = doc.querySelector('h1');
      if (fallbackH1 && fallbackH1.innerText.length > 3) titre = cleanText(fallbackH1.innerText);
      else titre = doc.title.split(' - ')[0].split(' | ')[0].trim();
    }
    if (!entreprise) {
      var ogSite = doc.querySelector('meta[property="og:site_name"]');
      if (ogSite && ogSite.content) entreprise = ogSite.content;
      else {
        var m = window.location.hostname.replace('www.', '').split('.')[0];
        entreprise = m.charAt(0).toUpperCase() + m.slice(1);
      }
    }
    if (!desc) {
      var article = doc.querySelector('article, main, #main-content, [role="main"]');
      if (article && article.innerText.length > 200) desc = cleanText(article.innerText);
      else desc = cleanText(doc.body.innerText.substring(0, 5000));
    }

    // Détection type de contrat dans le texte
    var fullSample = (titre + ' ' + desc.substring(0, 1500)).toLowerCase();
    if (!typeContrat) {
      if (fullSample.includes('stage') || fullSample.includes('internship') || fullSample.includes('stagiaire')) typeContrat = 'Stage';
      else if (fullSample.includes('alternance') || fullSample.includes('apprentissage') || fullSample.includes('apprenti')) typeContrat = 'Alternance';
      else if (fullSample.includes('freelance') || fullSample.includes('indépendant')) typeContrat = 'Freelance';
      else if (fullSample.includes('cdd')) typeContrat = 'CDD';
      else if (fullSample.includes('cdi')) typeContrat = 'CDI';
      else typeContrat = 'CDI';
    }

    if (!localisation) {
      var matchLoc = desc.match(/(?:localisation|lieu|site|bureau|poste basé à)\\s*[:–-]\\s*([A-Za-zÀ-ÖØ-öø-ÿ\\s,-]{2,30})/i);
      if (matchLoc && matchLoc[1]) localisation = matchLoc[1].trim();
    }

    var extraNotes = [];
    if (salaire) extraNotes.push('💰 Rémunération : ' + salaire);
    if (remote && remote !== 'Non spécifié') extraNotes.push('🏡 Télétravail : ' + remote);
    if (p !== 'generic') extraNotes.push('⚡ Plateforme ATS détectée : ' + p.toUpperCase());

    var enrichedDesc = extraNotes.length > 0 ? ('📌 Infos clés : ' + extraNotes.join(' | ') + '\\n\\n' + desc) : desc;

    return [{
      title: titre || 'Offre sans titre',
      company: entreprise || 'Entreprise inconnue',
      url: url,
      location: localisation || 'Lieu non spécifié',
      source: p,
      type_contrat: typeContrat,
      reference: (url.match(/([0-9]{5,15})/i) || [])[1] || '',
      description: enrichedDesc
    }];
  }

  var jobs = extractFromPlatform();
  var appUrl = '${appOrigin}/offres';
  var encoded = encodeURIComponent(JSON.stringify(jobs));
  window.open(appUrl + '?import_batch=true#batch=' + encoded, '_blank');
})();
  `.replace(/\s+/g, ' ').trim()

  return `javascript:${encodeURI(extractorBody)}`
}
