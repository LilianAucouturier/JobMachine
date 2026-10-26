/**
 * Estimateur Prédictif de Salaires Client-Side (Teal-Style)
 * 100% exécutable dans le navigateur sans coût serveur.
 * Calibre les grilles selon le poste, la localisation, la séniorité, le type de contrat et l'entreprise.
 */

export interface PredictedSalary {
  formatted: string // ex: "42k€ - 48k€ / an" ou "1 200€ - 1 500€ / mois"
  min: number
  max: number
  median: number
  currency: string
  period: 'an' | 'mois' | 'jour'
  isExplicit: boolean // true si extrait de l'annonce, false si prédit par le modèle
  confidence: 'certifiée' | 'haute' | 'estimée'
  factors: string[]
}

// Grilles de référence annuelles brutes (en milliers d'euros) pour les diplômés ingénieurs / tech en France
const DOMAIN_BENCHMARKS: Record<string, { junior: [number, number]; mid: [number, number]; senior: [number, number] }> = {
  aero: {
    junior: [40, 46],
    mid: [48, 58],
    senior: [60, 78],
  },
  embedded: {
    junior: [41, 47],
    mid: [49, 60],
    senior: [62, 80],
  },
  software: {
    junior: [39, 45],
    mid: [47, 56],
    senior: [58, 75],
  },
  data_ai: {
    junior: [43, 50],
    mid: [52, 65],
    senior: [68, 88],
  },
  project: {
    junior: [39, 45],
    mid: [48, 57],
    senior: [60, 76],
  },
  generic: {
    junior: [38, 44],
    mid: [45, 54],
    senior: [56, 72],
  },
}

// Entreprises avec primes conventionnelles ou salaires supérieurs à la moyenne
const TIER_1_COMPANIES = ['safran', 'airbus', 'dassault', 'thales', 'arianegroup', 'mbda', 'cnes', 'esa', 'google', 'apple', 'meta']

/**
 * Tente d'extraire un salaire explicite déjà présent dans le texte ou les métadonnées
 */
function extractExplicitSalary(text: string): PredictedSalary | null {
  if (!text) return null

  // Regex pour les salaires annuels en k€ (ex: "45k - 50k", "45k€ - 52k€", "42 k€", "45 000 - 55 000 €")
  const kPattern = /(\d{2})\s*(?:k[€e]?)?\s*[-–àa]\s*(\d{2})\s*k[€e]?/i
  const kMatch = text.match(kPattern)
  if (kMatch) {
    const min = parseInt(kMatch[1], 10)
    const max = parseInt(kMatch[2], 10)
    return {
      formatted: `${min}k€ - ${max}k€ / an`,
      min: min * 1000,
      max: max * 1000,
      median: Math.round(((min + max) / 2) * 1000),
      currency: '€',
      period: 'an',
      isExplicit: true,
      confidence: 'certifiée',
      factors: ["Mention explicite dans l'annonce"],
    }
  }

  // Regex pour les salaires avec milliers complets (ex: "40 000 € à 48 000 €")
  const fullYearPattern = /(\d{2})[\s.]?000\s*(?:€|eur)?\s*[-–àa]\s*(\d{2})[\s.]?000\s*(?:€|eur)/i
  const fullMatch = text.match(fullYearPattern)
  if (fullMatch) {
    const min = parseInt(fullMatch[1], 10)
    const max = parseInt(fullMatch[2], 10)
    return {
      formatted: `${min}k€ - ${max}k€ / an`,
      min: min * 1000,
      max: max * 1000,
      median: Math.round(((min + max) / 2) * 1000),
      currency: '€',
      period: 'an',
      isExplicit: true,
      confidence: 'certifiée',
      factors: ["Mention explicite dans l'annonce"],
    }
  }

  // Regex pour les gratifications de stage ou alternance (ex: "1 200 € / mois", "1000 - 1400 € / mois")
  const monthlyPattern = /(?:gratification|salaire|rémunération)?\s*[:]?\s*(\d{3,4})\s*(?:[-–àa]\s*(\d{3,4}))?\s*€\s*\/?\s*mois/i
  const mMatch = text.match(monthlyPattern)
  if (mMatch) {
    const min = parseInt(mMatch[1], 10)
    const max = mMatch[2] ? parseInt(mMatch[2], 10) : min
    return {
      formatted: min === max ? `${min}€ / mois` : `${min}€ - ${max}€ / mois`,
      min,
      max,
      median: Math.round((min + max) / 2),
      currency: '€',
      period: 'mois',
      isExplicit: true,
      confidence: 'certifiée',
      factors: ["Mention mensuelle explicite dans l'annonce"],
    }
  }

  return null
}

/**
 * Prédit la fourchette salariale probable pour une offre donnée
 */
export function predictSalary(offer: {
  titre: string
  localisation?: string
  type_contrat?: string
  experience_requise?: string
  description?: string
  entreprise?: string
}): PredictedSalary {
  const fullContext = `${offer.titre || ''} ${offer.description || ''} ${offer.type_contrat || ''}`.toLowerCase()
  const loc = (offer.localisation || '').toLowerCase()
  const company = (offer.entreprise || '').toLowerCase()
  const contract = (offer.type_contrat || '').toLowerCase()

  // 1. Vérifier si un salaire explicite est mentionné
  const explicit = extractExplicitSalary(offer.description || '')
  if (explicit) return explicit

  const factors: string[] = []

  // 2. Gestion des Stages & Alternances (Grilles spécifiques)
  if (contract.includes('stage') || fullContext.includes('stagiaire') || fullContext.includes('internship')) {
    const isMajor = TIER_1_COMPANIES.some(c => company.includes(c))
    let min = 950
    let max = 1350
    if (isMajor) {
      min += 200
      max += 250
      factors.push('Majoration grand groupe aéro/tech (+200€)')
    }
    if (loc.includes('paris') || loc.includes('île-de-france')) {
      min += 100
      max += 100
      factors.push('Prime localisation Île-de-France')
    }
    return {
      formatted: `${min}€ - ${max}€ / mois`,
      min,
      max,
      median: Math.round((min + max) / 2),
      currency: '€',
      period: 'mois',
      isExplicit: false,
      confidence: 'haute',
      factors: ['Barème gratifications stages ingénieur BAC+5', ...factors],
    }
  }

  if (contract.includes('alternance') || fullContext.includes('apprentissage') || fullContext.includes('apprenti')) {
    const isMajor = TIER_1_COMPANIES.some(c => company.includes(c))
    let min = 1200
    let max = 1750
    if (isMajor) {
      min += 200
      max += 200
      factors.push('Barème conventionnel avantageux')
    }
    return {
      formatted: `${min}€ - ${max}€ / mois`,
      min,
      max,
      median: Math.round((min + max) / 2),
      currency: '€',
      period: 'mois',
      isExplicit: false,
      confidence: 'haute',
      factors: ['Barème légal & conventionnel alternance M1/M2', ...factors],
    }
  }

  // 3. Gestion des Freelances (Taux Journalier Moyen)
  if (contract.includes('freelance') || contract.includes('indépendant')) {
    let tjmMin = 450
    let tjmMax = 650
    if (fullContext.includes('expert') || fullContext.includes('senior') || fullContext.includes('architecte')) {
      tjmMin += 150
      tjmMax += 200
    }
    return {
      formatted: `${tjmMin}€ - ${tjmMax}€ / jour (TJM)`,
      min: tjmMin,
      max: tjmMax,
      median: Math.round((tjmMin + tjmMax) / 2),
      currency: '€',
      period: 'jour',
      isExplicit: false,
      confidence: 'estimée',
      factors: ['Marché TJM freelance ingénierie'],
    }
  }

  // 4. Salaires CDI / CDD : Détermination du Domaine
  let domainKey = 'generic'
  if (fullContext.includes('embarqué') || fullContext.includes('embedded') || fullContext.includes('avionique') || fullContext.includes('c++') || fullContext.includes('do-178')) {
    domainKey = 'embedded'
    factors.push('Spécialité Systèmes Embarqués & Temps Réel')
  } else if (fullContext.includes('aéronautique') || fullContext.includes('aérospatial') || fullContext.includes('spatial') || fullContext.includes('propulsion') || fullContext.includes('catia')) {
    domainKey = 'aero'
    factors.push('Secteur Aéronautique & Défense')
  } else if (fullContext.includes('data') || fullContext.includes('machine learning') || fullContext.includes('ia') || fullContext.includes('python')) {
    domainKey = 'data_ai'
    factors.push('Spécialité Data Science & IA')
  } else if (fullContext.includes('projet') || fullContext.includes('pm') || fullContext.includes('scrum')) {
    domainKey = 'project'
    factors.push('Gestion de projet technique')
  } else if (fullContext.includes('logiciel') || fullContext.includes('software') || fullContext.includes('web')) {
    domainKey = 'software'
    factors.push('Ingénierie Logicielle')
  }

  // 5. Détermination du Niveau de Séniorité
  const exp = (offer.experience_requise || '').toLowerCase()
  let seniority: 'junior' | 'mid' | 'senior' = 'junior'
  if (exp.includes('5+') || exp.includes('5 ans') || fullContext.includes('senior') || fullContext.includes('lead') || fullContext.includes('expert')) {
    seniority = 'senior'
    factors.push('Profil Confirmé / Senior (5+ ans)')
  } else if (exp.includes('3-5') || exp.includes('3 ans') || fullContext.includes('confirmé')) {
    seniority = 'mid'
    factors.push('Profil Intermédiaire (2-4 ans)')
  } else {
    seniority = 'junior'
    factors.push('Profil Premier Emploi / Junior (0-2 ans)')
  }

  const baseRange = DOMAIN_BENCHMARKS[domainKey][seniority]
  let minK = baseRange[0]
  let maxK = baseRange[1]

  // 6. Facteur Géographique
  if (loc.includes('paris') || loc.includes('île-de-france') || loc.includes('idf') || loc.includes('75') || loc.includes('92')) {
    minK = Math.round(minK * 1.08)
    maxK = Math.round(maxK * 1.08)
    factors.push('Pondération géographique Île-de-France (+8%)')
  } else if (loc.includes('toulouse') || loc.includes('lyon') || loc.includes('bordeaux') || loc.includes('sophia')) {
    factors.push('Bassin d\'emploi métropolitain dynamique')
  } else if (loc.includes('remote') || fullContext.includes('télétravail')) {
    factors.push('Poste télétravail')
  }

  // 7. Facteur Entreprise d'envergure
  if (TIER_1_COMPANIES.some(c => company.includes(c))) {
    minK += 2
    maxK += 3
    factors.push('Prime constructeur / grand groupe (+2-3k€)')
  }

  return {
    formatted: `${minK}k€ - ${maxK}k€ / an`,
    min: minK * 1000,
    max: maxK * 1000,
    median: Math.round(((minK + maxK) / 2) * 1000),
    currency: '€',
    period: 'an',
    isExplicit: false,
    confidence: seniority === 'junior' ? 'haute' : 'estimée',
    factors,
  }
}
