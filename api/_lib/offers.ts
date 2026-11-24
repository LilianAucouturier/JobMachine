import { timingSafeEqual } from 'node:crypto'

export interface RequestLike {
  headers?: Record<string, string | string[] | undefined>
}

export interface OfferEvaluation {
  fitScore: number
  tier: string
  isAero: boolean
  matchedKeywords: string[]
}

export interface FormattedOffer {
  user_id: string
  titre: string
  entreprise: string
  url: string
  localisation: string
  type_contrat: string
  experience_requise: string
  reference: string
  source: string
  mots_cles: string
  description: string
  evaluation: OfferEvaluation
}

const AERO_MAJORS = [
  'safran',
  'airbus',
  'dassault',
  'thales',
  'arianegroup',
  'mbda',
  'cnes',
  'esa',
  'atr',
  'collins',
  'liebherr',
  'naval group',
]

const AERO_TECH = [
  'avionique',
  'systèmes embarqués',
  'embarqué',
  'do-178',
  'do-254',
  'matlab',
  'simulink',
  'c++',
  'aéronautique',
  'aérospatial',
  'propulsion',
  'aérodynamique',
  'catia',
  'temps réel',
  'en 9100',
  'arinc',
]

/**
 * Validates that a URL uses http: or https: and returns its normalized href, or ''.
 */
export function isSafeHttpUrl(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return ''
    }
    return parsed.href
  } catch {
    return ''
  }
}

function isPrivateOrReservedIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!match) return false

  const a = Number(match[1])
  const b = Number(match[2])
  const c = Number(match[3])
  const d = Number(match[4])

  if (a > 255 || b > 255 || c > 255 || d > 255) return true
  if (a === 0) return true
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a >= 224) return true
  return false
}

function isPrivateOrReservedIpv6(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:1') return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  if (lower.startsWith('fe80:') || /^fe[89ab][0-9a-f]:/.test(lower)) return true
  if (lower.startsWith('::ffff:')) return true
  return false
}

/**
 * Validates that a URL is public http(s), without credentials or local/private hosts.
 */
export function isSafePublicUrl(raw: unknown): string {
  const safeHref = isSafeHttpUrl(raw)
  if (!safeHref) return ''

  try {
    const parsed = new URL(safeHref)
    if (parsed.username || parsed.password) return ''

    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (!host) return ''
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return ''
    }

    if (isPrivateOrReservedIpv4(host) || isPrivateOrReservedIpv6(host)) {
      return ''
    }

    return parsed.href
  } catch {
    return ''
  }
}

export function timingSafeSecretMatch(provided: unknown, expected: string | undefined): boolean {
  if (!expected || typeof provided !== 'string' || !provided) {
    return false
  }
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(a, b)
}

function getHeaderValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string
): string {
  if (!headers) return ''
  const target = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      if (Array.isArray(value)) return (value[0] || '').trim()
      return typeof value === 'string' ? value.trim() : ''
    }
  }
  return ''
}

/**
 * Extracts a secret exclusively from X-Webhook-Secret or Authorization: Bearer headers.
 */
export function extractHeaderSecret(req: RequestLike): string {
  const headerSecret = getHeaderValue(req.headers, 'x-webhook-secret')
  if (headerSecret) return headerSecret

  const authHeader = getHeaderValue(req.headers, 'authorization')
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  return bearerMatch ? bearerMatch[1].trim() : ''
}

/**
 * Authorizes an incoming API request via webhook secret header or strict same-origin headers.
 */
export function isAuthorizedRequest(req: RequestLike): boolean {
  if (timingSafeSecretMatch(extractHeaderSecret(req), process.env.WEBHOOK_SECRET)) {
    return true
  }

  const secFetchSite = getHeaderValue(req.headers, 'sec-fetch-site').toLowerCase()
  if (secFetchSite === 'cross-site') {
    return false
  }

  const originHeader = getHeaderValue(req.headers, 'origin')
  const refererHeader = getHeaderValue(req.headers, 'referer')
  const sourceOriginRaw = originHeader || refererHeader
  if (!sourceOriginRaw) {
    return false
  }

  let sourceUrl: URL
  try {
    sourceUrl = new URL(sourceOriginRaw)
  } catch {
    return false
  }

  if (sourceUrl.protocol !== 'http:' && sourceUrl.protocol !== 'https:') {
    return false
  }

  const allowedHosts = new Set<string>()
  const reqHost = getHeaderValue(req.headers, 'host').toLowerCase()
  if (reqHost) allowedHosts.add(reqHost)

  for (const envHost of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (envHost) {
      const cleaned = envHost.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase()
      if (cleaned) allowedHosts.add(cleaned)
    }
  }

  const sourceHost = sourceUrl.host.toLowerCase()
  if (allowedHosts.has(sourceHost)) {
    return true
  }

  if (process.env.VERCEL !== '1') {
    const sourceHostname = sourceUrl.hostname.toLowerCase()
    if (sourceHostname === 'localhost' || sourceHostname === '127.0.0.1') {
      return true
    }
  }

  return false
}

export function evaluateOffer(titre: string, entreprise: string, description: string): OfferEvaluation {
  const fullText = `${titre} ${entreprise} ${description || ''}`.toLowerCase()
  const entLower = (entreprise || '').toLowerCase()

  let score = 40
  let tier = 'Général'
  let isAero = false

  if (AERO_MAJORS.some((m) => entLower.includes(m))) {
    score = 90
    tier = 'Constructeur Aéronautique & Spatial'
    isAero = true
  } else if (
    fullText.includes('aéronautique') ||
    fullText.includes('aérospatial') ||
    fullText.includes('aviation')
  ) {
    score = 75
    tier = 'Secteur Aérospatial'
    isAero = true
  }

  const matchedKeywords: string[] = []
  for (const kw of AERO_TECH) {
    if (fullText.includes(kw)) {
      matchedKeywords.push(kw)
      score += 5
    }
  }

  return {
    fitScore: Math.min(score, 98),
    tier,
    isAero,
    matchedKeywords,
  }
}

function detectSource(offerUrl: string, rawSource: unknown): string {
  const urlLower = offerUrl.toLowerCase()
  if (urlLower.includes('linkedin.com')) return 'LinkedIn'
  if (urlLower.includes('indeed.com')) return 'Indeed'
  if (
    urlLower.includes('welcometothejungle.com') ||
    urlLower.includes('app.beetween.com') ||
    urlLower.includes('wttj')
  ) {
    return 'WTTJ'
  }
  if (urlLower.includes('greenhouse.io')) return 'Greenhouse'
  if (urlLower.includes('lever.co')) return 'Lever'
  if (urlLower.includes('safran')) return 'Safran'
  if (urlLower.includes('airbus')) return 'Airbus'
  if (urlLower.includes('dassault')) return 'Dassault'
  return typeof rawSource === 'string' && rawSource.trim() ? rawSource.trim() : 'scraper'
}

function detectContractType(rawContract: unknown, titleLower: string, descLower: string): string {
  let typeContrat = typeof rawContract === 'string' ? rawContract.trim() : ''

  if (
    titleLower.includes('alternance') ||
    titleLower.includes('apprenti') ||
    titleLower.includes('professionnalisation')
  ) {
    typeContrat = 'Alternance'
  } else if (
    titleLower.includes('stage') ||
    titleLower.includes('stagiaire') ||
    titleLower.includes('internship') ||
    titleLower.includes('intern')
  ) {
    typeContrat = 'Stage'
  } else if (
    titleLower.includes('freelance') ||
    titleLower.includes('indépendant') ||
    titleLower.includes('amoa')
  ) {
    typeContrat = 'Freelance'
  } else if (titleLower.includes('cdd') || titleLower.includes('fixed term')) {
    typeContrat = 'CDD'
  } else if (titleLower.includes('cdi') || titleLower.includes('full-time')) {
    typeContrat = 'CDI'
  } else if (!typeContrat) {
    if (descLower.includes('alternance') || descLower.includes('apprentissage')) {
      typeContrat = 'Alternance'
    } else if (descLower.includes('stage') || descLower.includes('internship')) {
      typeContrat = 'Stage'
    } else if (descLower.includes('cdi')) {
      typeContrat = 'CDI'
    }
  }

  return typeContrat
}

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function formatAndScoreOffers(
  rawOffers: unknown[],
  userId: string,
  searchKeywords?: string
): FormattedOffer[] {
  const formattedOffers: FormattedOffer[] = rawOffers
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((offer) => {
      const offerUrl = isSafeHttpUrl(
        offer.url || offer.link || offer.jobUrl || offer.applyUrl || ''
      )
      const source = detectSource(offerUrl, offer.source)

      let localisation =
        typeof (offer.localisation ?? offer.location ?? offer.place) === 'string'
          ? String(offer.localisation ?? offer.location ?? offer.place).trim()
          : ''

      if (!localisation && Array.isArray(offer.offices) && offer.offices.length > 0) {
        localisation = offer.offices
          .map((o) => (o && typeof o === 'object' ? (o as { city?: unknown }).city : ''))
          .filter((city): city is string => typeof city === 'string' && city.trim().length > 0)
          .join(', ')
      }

      const titre = String(
        offer.titre || offer.name || offer.title || offer.positionName || offer.position || 'Offre sans titre'
      ).trim()
      const entreprise = String(
        offer.entreprise || offer.organizationName || offer.company || offer.companyName || ''
      ).trim()

      const originalDesc = String(
        offer.description ||
          offer.descriptionText ||
          offer.descriptionHtml ||
          offer.descriptionHTML ||
          ''
      ).trim()

      const titleLower = titre.toLowerCase()
      const descLower = originalDesc.toLowerCase()
      const typeContrat = detectContractType(
        offer.type_contrat || offer.contractType || offer.contract || '',
        titleLower,
        descLower
      )

      const rawExp =
        offer.experience ||
        offer.experienceLevel ||
        offer.experienceRequired ||
        offer.seniority ||
        offer.experience_requise ||
        ''

      let experienceRequise = '-'
      if (typeof rawExp === 'string' && rawExp.trim()) {
        experienceRequise = rawExp.trim()
      } else if (
        typeContrat === 'Stage' ||
        typeContrat === 'Alternance' ||
        descLower.includes('débutant') ||
        descLower.includes('junior')
      ) {
        experienceRequise = '0-1 an'
      }

      const evaluation = evaluateOffer(titre, entreprise, originalDesc)
      const baseKeywords = typeof offer.mots_cles === 'string' && offer.mots_cles.trim()
        ? [offer.mots_cles.trim()]
        : []
      const combinedKeywords = Array.from(
        new Set([...baseKeywords, ...evaluation.matchedKeywords])
      ).join(', ')

      return {
        user_id: userId,
        titre,
        entreprise,
        url: offerUrl,
        localisation,
        type_contrat: typeContrat,
        experience_requise: experienceRequise,
        reference: String(offer.reference || offer.id || '').trim(),
        source,
        mots_cles: combinedKeywords,
        description: originalDesc,
        evaluation,
      }
    })

  if (!searchKeywords || !searchKeywords.trim()) {
    return formattedOffers
  }

  const searchTerms = removeAccents(searchKeywords)
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 2)

  if (searchTerms.length === 0) {
    return formattedOffers
  }

  return formattedOffers.filter((offer) => {
    const title = removeAccents(offer.titre).toLowerCase()
    const comp = removeAccents(offer.entreprise).toLowerCase()
    return searchTerms.some((term) => title.includes(term) || comp.includes(term))
  })
}
