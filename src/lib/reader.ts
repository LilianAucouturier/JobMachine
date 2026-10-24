/**
 * Service Jina Reader (r.jina.ai) pour NextStep
 * Convertit n'importe quelle URL d'offre d'emploi en Markdown propre et extrait les métadonnées.
 */

export interface ParsedJobData {
  url: string
  titre: string
  entreprise: string
  localisation: string
  type_contrat: string
  experience_requise: string
  description: string
  source: string
  mots_cles: string
}

export async function fetchJobWithJinaReader(targetUrl: string): Promise<ParsedJobData> {
  const cleanUrl = targetUrl.trim()
  if (!cleanUrl) {
    throw new Error('Veuillez fournir une URL valide.')
  }

  // Appel via Jina Reader r.jina.ai
  const jinaUrl = `https://r.jina.ai/${cleanUrl}`
  
  const response = await fetch(jinaUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Return-Format': 'markdown',
      'X-No-Cache': 'true',
    },
  })

  if (!response.ok) {
    // Fallback avec format texte direct si JSON non supporté
    const textRes = await fetch(jinaUrl)
    if (!textRes.ok) {
      throw new Error(`Échec de récupération via Jina Reader (Status ${response.status})`)
    }
    const markdown = await textRes.text()
    return parseJobMarkdown(cleanUrl, markdown, '')
  }

  const json = await response.json()
  const data = json.data || json
  const markdown = data.content || data.text || ''
  const pageTitle = data.title || ''

  return parseJobMarkdown(cleanUrl, markdown, pageTitle)
}

function parseJobMarkdown(url: string, markdown: string, pageTitle: string): ParsedJobData {
  let source = 'Web'
  const urlLower = url.toLowerCase()
  if (urlLower.includes('linkedin.com')) source = 'LinkedIn'
  else if (urlLower.includes('welcometothejungle.com') || urlLower.includes('wttj')) source = 'WTTJ'
  else if (urlLower.includes('indeed.com')) source = 'Indeed'
  else if (urlLower.includes('safran-group.com') || urlLower.includes('safran')) source = 'Safran'
  else if (urlLower.includes('airbus.com')) source = 'Airbus'
  else if (urlLower.includes('dassault-aviation.com') || urlLower.includes('dassault')) source = 'Dassault'
  else if (urlLower.includes('thalesgroup.com') || urlLower.includes('thales')) source = 'Thales'

  // Détection du Titre
  let titre = ''
  if (pageTitle) {
    titre = pageTitle.split(/[-–—|•]/)[0].trim()
  }
  if (!titre) {
    const h1Match = markdown.match(/^#\s+(.+)$/m)
    if (h1Match) titre = h1Match[1].trim()
  }
  if (!titre) titre = 'Offre sans titre'

  // Détection de l'entreprise
  let entreprise = ''
  if (source !== 'Web' && source !== 'LinkedIn' && source !== 'WTTJ' && source !== 'Indeed') {
    entreprise = source
  } else if (pageTitle) {
    const parts = pageTitle.split(/[-–—|•]/)
    if (parts.length >= 2) {
      entreprise = parts[1].trim()
    }
  }

  // Type de contrat
  let type_contrat = ''
  const mdLower = (titre + ' ' + markdown).toLowerCase()
  if (mdLower.includes('alternance') || mdLower.includes('apprentissage') || mdLower.includes('contrat pro')) {
    type_contrat = 'Alternance'
  } else if (mdLower.includes('stage') || mdLower.includes('internship') || mdLower.includes('stagiaire')) {
    type_contrat = 'Stage'
  } else if (mdLower.includes('cdi') || mdLower.includes('full-time') || mdLower.includes('temps plein')) {
    type_contrat = 'CDI'
  } else if (mdLower.includes('cdd') || mdLower.includes('fixed-term')) {
    type_contrat = 'CDD'
  } else if (mdLower.includes('freelance') || mdLower.includes('indépendant')) {
    type_contrat = 'Freelance'
  }

  // Expérience
  let experience_requise = '-'
  const expMatch = mdLower.match(/(\d+)\s*(?:à|-)\s*(\d+)\s*(?:ans|années|years)/) || mdLower.match(/(\d+)\s*(?:ans|années|years)/)
  if (expMatch) {
    const n = parseInt(expMatch[1], 10)
    if (n <= 1) experience_requise = '0-1 an'
    else if (n <= 3) experience_requise = '1-3 ans'
    else if (n <= 5) experience_requise = '3-5 ans'
    else experience_requise = '5+ ans'
  } else if (type_contrat === 'Stage' || type_contrat === 'Alternance' || mdLower.includes('débutant') || mdLower.includes('junior')) {
    experience_requise = '0-1 an'
  }

  // Localisation
  let localisation = ''
  const cities = ['Paris', 'Toulouse', 'Bordeaux', 'Marseille', 'Lyon', 'Nantes', 'Lille', 'Strasbourg', 'Rennes', 'Toulon', 'Marignane', 'Blagnac', 'Vélizy', 'Évry', 'Saint-Cloud']
  for (const city of cities) {
    if (new RegExp(`\\b${city}\\b`, 'i').test(markdown) || new RegExp(`\\b${city}\\b`, 'i').test(pageTitle)) {
      localisation = city
      break
    }
  }

  // Mots-clés extraits
  const keywordsList: string[] = []
  const techTerms = ['Aéronautique', 'Spatial', 'Systèmes embarqués', 'C++', 'Python', 'MATLAB', 'Simulink', 'Catia', 'Avionique', 'DO-178C', 'Qualité', 'Mécanique', 'Gestion de projet', 'Communication']
  for (const term of techTerms) {
    if (new RegExp(`\\b${term}\\b`, 'i').test(markdown)) {
      keywordsList.push(term)
    }
  }

  return {
    url,
    titre,
    entreprise,
    localisation,
    type_contrat,
    experience_requise,
    description: markdown,
    source,
    mots_cles: keywordsList.join(', '),
  }
}
