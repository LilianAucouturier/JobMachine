/**
 * Agent IA Career-Ops pour NextStep
 * Évalue la pertinence de n'importe quelle offre d'emploi par rapport au CV et à la LM réelle de l'utilisateur.
 * Calcule un Fit Score sur-mesure, identifie les compétences matchées vs manquantes (ATS gap analysis)
 * et adapte le CV et la lettre de motivation.
 */

export interface CandidateProfile {
  id: string
  nomComplet: string
  prenom?: string
  nom?: string
  email?: string
  telephone?: string
  ville?: string
  codePostal?: string
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  pretentionsSalariales?: string // ex: "45000"
  preavis?: string // ex: "Immédiat", "1 mois", "3 mois"
  autorisationTravail?: boolean // true = Autorisé à travailler sans visa
  besoinSponsorshipVisa?: boolean // false
  statutHandicap?: string // "Non", "Oui", "Ne souhaite pas répondre"
  permisB?: boolean // true
  titreProfessionnel: string // ex: "Ingénieur Systèmes Embarqués", "Chef de Projet", "Data Scientist"...
  anneesExperience: string // "0-1 an", "1-3 ans", "3-5 ans", "5+ ans"
  formation: string // ex: "IPSA - École d'ingénieurs de l'air et de l'espace", "Master Universitaire"...
  secteursCibles: string[] // ex: ["Aéronautique", "Spatial", "Défense"] ou ["Web & Tech", "Finance"]...
  entreprisesCibles: string[] // ex: ["Safran", "Airbus", "Dassault", "Thales"]...
  competencesCles: string[] // ex: ["C++", "Python", "DO-178C", "Simulink", "Git"]...
  typesContratsRecherches: string[] // ["Stage", "Alternance", "CDI"]...
  cvTexteBrut: string // Contenu texte intégral extrait du CV
  cvNomFichier?: string
  lmTexteBrut: string // Lettre de motivation de base / pitch
  lmNomFichier?: string
  updatedAt: string
}

export interface CareerOpsEvaluation {
  fitScore: number // 0 à 100
  tierLabel: string // "Entreprise Cible Favorite", "Secteur de Prédilection", "Général"
  domaines: string[]
  pointsForts: string[]
  matchedSkills: string[] // Compétences du CV requises par l'offre
  missingSkills: string[] // Compétences requises par l'offre mais absentes du CV (écart ATS)
  cvBulletPoints: string[] // Recommandations d'adaptation du CV
  pitchAccroche: string // Accroche personnalisée pour message/candidature
  lettreMotivationSurMesure: string // Lettre de motivation personnalisée pour cette offre
  isTopTarget: boolean
}

// Profil par défaut initialisé (personnalisable à volonté par tout utilisateur)
export const DEFAULT_CANDIDATE_PROFILE: CandidateProfile = {
  id: 'default-profile',
  nomComplet: 'Lilian Aucouturier',
  prenom: 'Lilian',
  nom: 'Aucouturier',
  email: 'lilian.aucouturier@ipsa.fr',
  telephone: '+33 6 00 00 00 00',
  ville: 'Paris',
  codePostal: '75013',
  linkedinUrl: 'https://www.linkedin.com/in/lilian-aucouturier',
  githubUrl: 'https://github.com/LilianAucouturier',
  portfolioUrl: '',
  pretentionsSalariales: '42000',
  preavis: 'Immédiat',
  autorisationTravail: true,
  besoinSponsorshipVisa: false,
  statutHandicap: 'Non',
  permisB: true,
  titreProfessionnel: 'Ingénieur Systèmes Embarqués & Aéronautique',
  anneesExperience: '0-1 an',
  formation: 'IPSA - Diplôme d\'Ingénieur Aéronautique & Spatial (2026)',
  secteursCibles: ['Aéronautique', 'Spatial', 'Défense', 'Systèmes Critiques', 'Tech'],
  entreprisesCibles: ['Safran', 'Airbus', 'Dassault Aviation', 'Thales', 'ArianeGroup', 'MBDA'],
  competencesCles: [
    'C++',
    'Python',
    'Systèmes embarqués',
    'Avionique',
    'DO-178C',
    'DO-254',
    'MATLAB',
    'Simulink',
    'Catia V5',
    'Temps réel',
    'Bancs de test',
    'Cycle en V',
    'Git',
  ],
  typesContratsRecherches: ['Stage', 'Alternance', 'CDI'],
  cvTexteBrut: '',
  lmTexteBrut: '',
  updatedAt: new Date().toISOString(),
}

// Dictionnaire de compétences et synonymes courants pour l'analyse ATS
const COMMON_SKILLS_DICTIONARY = [
  'c++', 'c', 'python', 'java', 'javascript', 'typescript', 'rust', 'go',
  'linux', 'temps réel', 'rtos', 'freertos', 'embarqué', 'embedded',
  'avionique', 'do-178c', 'do-178', 'do-254', 'arinc', 'can', 'ethernet',
  'matlab', 'simulink', 'labview', 'catia', 'solidworks', 'ansys', 'cfd',
  'aérodynamique', 'propulsion', 'mécanique des fluides', 'spatial',
  'react', 'node.js', 'vue', 'docker', 'kubernetes', 'aws', 'azure',
  'sql', 'postgresql', 'mongodb', 'machine learning', 'deep learning',
  'git', 'ci/cd', 'agile', 'scrum', 'cycle en v', 'en 9100', 'iso 9001',
  'anglais courant', 'gestion de projet', 'bancs d\'essai', 'validation',
]

/**
 * Analyse le CV et la Lettre de motivation uploadés pour en extraire le profil automatique
 */
export function analyzeCandidateDocuments(cvText: string, lmText = ''): Partial<CandidateProfile> {
  const fullText = (cvText + '\n' + lmText).toLowerCase()
  const detectedSkills: string[] = []

  // 1. Détection des compétences
  for (const skill of COMMON_SKILLS_DICTIONARY) {
    if (new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(fullText)) {
      const formatted = skill === 'c++' ? 'C++' : skill === 'c' ? 'C' : skill.charAt(0).toUpperCase() + skill.slice(1)
      if (!detectedSkills.includes(formatted)) {
        detectedSkills.push(formatted)
      }
    }
  }

  // 2. Détection du titre ou diplôme
  let titre = ''
  if (fullText.includes('ingénieur') || fullText.includes('engineer')) {
    if (fullText.includes('systèmes embarqués') || fullText.includes('embarqué')) {
      titre = 'Ingénieur Systèmes Embarqués'
    } else if (fullText.includes('aéronautique') || fullText.includes('aérospatial')) {
      titre = 'Ingénieur Aéronautique & Spatial'
    } else if (fullText.includes('logiciel') || fullText.includes('software')) {
      titre = 'Ingénieur Logiciel'
    } else {
      titre = 'Ingénieur Généraliste'
    }
  } else if (fullText.includes('développeur') || fullText.includes('developer')) {
    titre = 'Développeur Logiciel'
  } else if (fullText.includes('chef de projet') || fullText.includes('project manager')) {
    titre = 'Chef de Projet Technique'
  }

  // 3. Détection de la formation
  let formation = ''
  if (fullText.includes('ipsa')) formation = 'IPSA - École d\'ingénieurs de l\'air et de l\'espace'
  else if (fullText.includes('isae') || fullText.includes('supaero')) formation = 'ISAE-Supaero'
  else if (fullText.includes('estaca')) formation = 'ESTACA'
  else if (fullText.includes('epita')) formation = 'EPITA'
  else if (fullText.includes('master')) formation = 'Master d\'Ingénierie'

  // 4. Détection des secteurs
  const detectedSectors: string[] = []
  if (fullText.includes('aéronautique') || fullText.includes('aviation')) detectedSectors.push('Aéronautique')
  if (fullText.includes('spatial') || fullText.includes('satellite')) detectedSectors.push('Spatial')
  if (fullText.includes('défense') || fullText.includes('militaire')) detectedSectors.push('Défense')
  if (fullText.includes('automobile') || fullText.includes('véhicule')) detectedSectors.push('Automobile')
  if (fullText.includes('énergie') || fullText.includes('nucléaire')) detectedSectors.push('Énergie')
  if (fullText.includes('logiciel') || fullText.includes('informatique') || fullText.includes('tech')) detectedSectors.push('Tech & Logiciel')

  // 5. Détection des entreprises mentionnées
  const knownCompanies = ['Safran', 'Airbus', 'Dassault Aviation', 'Thales', 'ArianeGroup', 'MBDA', 'Renault', 'Stellantis', 'Capgemini', 'Alten']
  const detectedCompanies: string[] = []
  for (const c of knownCompanies) {
    if (fullText.includes(c.toLowerCase()) && !detectedCompanies.includes(c)) {
      detectedCompanies.push(c)
    }
  }

  return {
    titreProfessionnel: titre || undefined,
    formation: formation || undefined,
    secteursCibles: detectedSectors.length > 0 ? detectedSectors : undefined,
    entreprisesCibles: detectedCompanies.length > 0 ? detectedCompanies : undefined,
    competencesCles: detectedSkills.length > 0 ? detectedSkills : undefined,
    cvTexteBrut: cvText,
    lmTexteBrut: lmText,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Évalue une offre d'emploi par rapport au profil candidat personnalisé
 */
export function evaluateJobOffer(
  titre: string,
  entreprise: string,
  description: string,
  typeContrat?: string,
  profile: CandidateProfile = DEFAULT_CANDIDATE_PROFILE
): CareerOpsEvaluation {
  const fullText = `${titre} ${entreprise} ${description || ''}`.toLowerCase()
  const entLower = (entreprise || '').toLowerCase()
  const cvLower = (profile.cvTexteBrut || '').toLowerCase()

  // 1. Matching Entreprise
  let companyScore = 40
  let isTopTarget = false
  let tierLabel = 'Autre secteur'

  const userCompanies = (profile.entreprisesCibles || []).map(c => c.toLowerCase())
  if (userCompanies.some(c => entLower.includes(c) || c.includes(entLower))) {
    companyScore = 100
    isTopTarget = true
    tierLabel = 'Entreprise ciblée'
  } else {
    const userSectors = (profile.secteursCibles || []).map(s => s.toLowerCase())
    if (userSectors.some(s => fullText.includes(s))) {
      companyScore = 80
      tierLabel = `${profile.secteursCibles[0] || 'Secteur ciblé'}`
    }
  }

  // 2. Matching Compétences (Matched vs Missing ATS Skills)
  const matchedSkills: string[] = []
  const missingSkills: string[] = []

  const candidateSkills = profile.competencesCles || []
  for (const skill of candidateSkills) {
    const sLow = skill.toLowerCase()
    if (fullText.includes(sLow)) {
      matchedSkills.push(skill)
    }
  }

  for (const dictSkill of COMMON_SKILLS_DICTIONARY) {
    if (fullText.includes(dictSkill)) {
      const alreadyHas = candidateSkills.some(cs => cs.toLowerCase() === dictSkill) || cvLower.includes(dictSkill)
      const formatted = dictSkill === 'c++' ? 'C++' : dictSkill === 'c' ? 'C' : dictSkill.charAt(0).toUpperCase() + dictSkill.slice(1)
      if (!alreadyHas && !missingSkills.includes(formatted) && missingSkills.length < 5) {
        missingSkills.push(formatted)
      }
    }
  }

  const totalDemand = Math.max(matchedSkills.length + missingSkills.length, 1)
  const skillScore = Math.min((matchedSkills.length / totalDemand) * 40, 40)

  // 3. Matching Contrat
  let contractScore = 10
  if (typeContrat && (profile.typesContratsRecherches || []).some(tc => tc.toLowerCase() === typeContrat.toLowerCase())) {
    contractScore = 20
  }

  // 4. Calcul du Fit Score Global
  const rawFit = Math.round(companyScore * 0.4 + skillScore + contractScore)
  const fitScore = Math.min(Math.max(rawFit, isTopTarget ? 70 : 35), 98)

  // 5. Points forts
  const pointsForts: string[] = []
  if (isTopTarget) pointsForts.push(`Fait partie de vos entreprises cibles (${entreprise})`)
  if (matchedSkills.length > 0) pointsForts.push(`Vos compétences alignées : ${matchedSkills.slice(0, 4).join(', ')}`)
  if (typeContrat && profile.typesContratsRecherches.includes(typeContrat)) {
    pointsForts.push(`Type de contrat recherché : ${typeContrat}`)
  }

  // 6. Conseils d'adaptation CV
  const cvBulletPoints: string[] = []
  if (matchedSkills.length > 0) {
    cvBulletPoints.push(`Détailler vos réalisations en ${matchedSkills.slice(0, 3).join(', ')}.`)
  }
  if (missingSkills.length > 0) {
    cvBulletPoints.push(`Mots-clés absents du profil : ${missingSkills.slice(0, 2).join(', ')} (à ajouter uniquement si maîtrisés).`)
  }
  cvBulletPoints.push(`Mettre en avant la formation (${profile.formation || 'diplôme'}) et les résultats chiffrés.`)

  // 7. Accroche courte & Brouillon de lettre
  const pitchAccroche = `Bonjour, je prépare ma candidature pour le poste de ${titre || profile.titreProfessionnel || 'ingénieur'} chez ${entreprise || 'votre entreprise'}${matchedSkills.length > 0 ? ` (${matchedSkills.slice(0, 2).join(', ')})` : ''}. Seriez-vous disponible pour en échanger brièvement ?`

  const lettreMotivationSurMesure = `Madame, Monsieur,

Je vous soumets ma candidature au poste de ${titre || 'ingénieur'} au sein de ${entreprise || 'votre entreprise'}.

${profile.formation ? `Actuellement issu de ${profile.formation}, ` : ''}j'ai travaillé sur ${matchedSkills.join(', ') || 'des projets techniques et d\'ingénierie'} dans le cadre de mes réalisations précédentes. Les missions décrites dans votre annonce rejoignent directement mon parcours et les compétences que je souhaite mettre en pratique.

Je reste disponible pour un entretien afin d'échanger sur vos attentes et mes expériences.

Cordialement,

${profile.nomComplet || 'Le Candidat'}`

  return {
    fitScore,
    tierLabel,
    domaines: (profile.secteursCibles || []).slice(0, 3),
    pointsForts,
    matchedSkills,
    missingSkills,
    cvBulletPoints,
    pitchAccroche,
    lettreMotivationSurMesure,
    isTopTarget,
  }
}
