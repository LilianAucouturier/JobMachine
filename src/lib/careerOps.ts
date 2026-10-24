/**
 * Agent IA Career-Ops pour NextStep
 * Évalue la pertinence des offres d'emploi, calcule un score ATS aérospatial (Safran, Airbus, Dassault, etc.)
 * et génère des recommandations d'adaptation pour le CV et la lettre de motivation.
 */

export interface CareerOpsEvaluation {
  fitScore: number // 0 à 100
  tier: 'Tier 1 (Constructeur Aéro)' | 'Tier 2 (Ingénierie Aéro)' | 'Tech & Industrie' | 'Général'
  domaines: string[]
  pointsForts: string[]
  cvBulletPoints: string[]
  pitchAccroche: string
  motsClesAts: string[]
  isAero: boolean
}

// Référentiel des acteurs aéronautiques majeurs
const AERO_TIER_1 = [
  'safran',
  'airbus',
  'dassault',
  'thales',
  'arianegroup',
  'ariane',
  'mbda',
  'cnes',
  'esa',
  'atr',
  'collins',
  'liebherr',
  'naval group',
]

const AERO_TIER_2 = [
  'akkodis',
  'alten',
  'capgemini',
  'expleo',
  'segula',
  'sopra steria',
  'ausy',
  'apside',
  'altran',
  'groupe sfeir',
]

const AERO_KEYWORDS = [
  { term: 'avionique', weight: 15 },
  { term: 'systèmes embarqués', weight: 15 },
  { term: 'embarqué', weight: 10 },
  { term: 'aéronautique', weight: 20 },
  { term: 'aérospatial', weight: 20 },
  { term: 'spatial', weight: 15 },
  { term: 'do-178', weight: 15 },
  { term: 'do-254', weight: 15 },
  { term: 'matlab', weight: 10 },
  { term: 'simulink', weight: 10 },
  { term: 'c++', weight: 10 },
  { term: 'python', weight: 8 },
  { term: 'propulsion', weight: 15 },
  { term: 'aérodynamique', weight: 15 },
  { term: 'catia', weight: 10 },
  { term: 'bancs de test', weight: 10 },
  { term: 'temps réel', weight: 10 },
  { term: 'en 9100', weight: 15 },
  { term: 'easa', weight: 10 },
  { term: 'cycle en v', weight: 8 },
  { term: 'milsim', weight: 10 },
  { term: 'arinc', weight: 15 },
  { term: 'can bus', weight: 10 },
]

export function evaluateJobOffer(titre: string, entreprise: string, description: string, typeContrat?: string): CareerOpsEvaluation {
  const fullText = `${titre} ${entreprise} ${description || ''}`.toLowerCase()
  const entLower = (entreprise || '').toLowerCase()

  // 1. Détection du Tier Entreprise
  let tierScore = 40
  let tier: CareerOpsEvaluation['tier'] = 'Général'
  let isAero = false

  if (AERO_TIER_1.some((comp) => entLower.includes(comp))) {
    tierScore = 100
    tier = 'Tier 1 (Constructeur Aéro)'
    isAero = true
  } else if (AERO_TIER_2.some((comp) => entLower.includes(comp))) {
    tierScore = 80
    tier = 'Tier 2 (Ingénierie Aéro)'
    isAero = true
  } else if (
    fullText.includes('aéronautique') ||
    fullText.includes('aérospatial') ||
    fullText.includes('aérien') ||
    fullText.includes('aviation') ||
    fullText.includes('satellite')
  ) {
    tierScore = 75
    tier = 'Tech & Industrie'
    isAero = true
  }

  // 2. Mots-clés et compétences détectées
  const matchedKeywords: string[] = []
  let keywordScore = 0

  for (const item of AERO_KEYWORDS) {
    if (fullText.includes(item.term)) {
      matchedKeywords.push(item.term)
      keywordScore += item.weight
    }
  }

  // 3. Domaines d'expertise identifiés
  const domaines: string[] = []
  if (fullText.includes('avionique') || fullText.includes('do-178') || fullText.includes('arinc')) {
    domaines.push('Avionique & Certification')
  }
  if (fullText.includes('embarqué') || fullText.includes('temps réel') || fullText.includes('c++')) {
    domaines.push('Logiciel Embarqué Temps Réel')
  }
  if (fullText.includes('matlab') || fullText.includes('simulink') || fullText.includes('modélisation')) {
    domaines.push('Modélisation & Simulation')
  }
  if (fullText.includes('test') || fullText.includes('validation') || fullText.includes('banc')) {
    domaines.push('Intégration & Bancs d\'Essais')
  }
  if (fullText.includes('propulsion') || fullText.includes('moteur') || fullText.includes('turbine')) {
    domaines.push('Propulsion & Énergie')
  }
  if (fullText.includes('satellite') || fullText.includes('lanceur') || fullText.includes('orbite')) {
    domaines.push('Systèmes Spatiaux')
  }
  if (domaines.length === 0) {
    domaines.push('Ingénierie Générale & Gestion de Projet')
  }

  // 4. Bonus Contrat (Stages / Alternances / Jeunes diplômés IPSA)
  let contractBonus = 0
  const cLower = (typeContrat || '').toLowerCase()
  if (cLower.includes('alternance') || cLower.includes('stage') || cLower.includes('cdi')) {
    contractBonus = 10
  }

  // 5. Calcul Final du Fit Score (Plafond 100, Base mini 35)
  const rawScore = Math.round(tierScore * 0.45 + Math.min(keywordScore, 45) + contractBonus)
  const fitScore = Math.min(Math.max(rawScore, isAero ? 55 : 35), 98)

  // 6. Points forts pour la candidature
  const pointsForts: string[] = []
  if (isAero) pointsForts.push(`Cible stratégique du secteur aéronautique (${entreprise || 'Industrie'})`)
  if (matchedKeywords.length >= 2) pointsForts.push(`Forte convergence technique : ${matchedKeywords.slice(0, 3).join(', ')}`)
  if (domaines.length > 0) pointsForts.push(`Spécialité dominante : ${domaines[0]}`)

  // 7. Recommandations concrètes d'adaptation du CV
  const cvBulletPoints: string[] = [
    `Mettre en avant vos projets d'ingénierie école/IPSA appliqués aux systèmes critiques (${matchedKeywords[0] || 'cycle en V'}).`,
    `Quantifier vos réalisations techniques (ex: respect des contraintes temps réel, réduction des temps de tests, modélisation).`,
    `Spécifier votre maîtrise des outils demandés : ${matchedKeywords.slice(0, 4).join(', ') || 'C++, Python, Git'}.`,
    `Mentionner votre intérêt pour les défis actuels de ${entreprise || 'la structure'} (décarbonation, fiabilité, autonomie).`,
  ]

  // 8. Phrase d'accroche pour lettre de motivation / message LinkedIn
  const nomCible = entreprise ? `au sein de ${entreprise}` : 'dans vos équipes'
  const pitchAccroche = `Diplômé d'une formation d'ingénieur spécialisée, je suis particulièrement attentif aux innovations menées ${nomCible}. Fort d'une solide expérience sur ${domaines[0] || 'les systèmes aéronautiques'} et la pratique de ${matchedKeywords.slice(0, 2).join(' et ') || 'projets d\'ingénierie complexes'}, je serais ravi de contribuer à vos prochains jalons de développement.`

  return {
    fitScore,
    tier,
    domaines,
    pointsForts,
    cvBulletPoints,
    pitchAccroche,
    motsClesAts: matchedKeywords,
    isAero,
  }
}
