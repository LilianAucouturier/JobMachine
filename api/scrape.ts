import {
  formatAndScoreOffers,
  isAuthorizedRequest,
  isSafeHttpUrl,
  isSafePublicUrl,
} from './_lib/offers.js'

interface ApiRequest {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  body?: unknown
}

interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (body: unknown) => unknown
}

const MAX_HTML_BYTES = 1_500_000
const MAX_URLS = 10

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtmlText(raw: string): string {
  return stripHtml(raw).slice(0, 12_000)
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    const text = await response.text()
    return text.slice(0, maxBytes)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let result = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        received += value.byteLength
        if (received > maxBytes) {
          result += decoder.decode(value.subarray(0, value.byteLength - (received - maxBytes)), {
            stream: false,
          })
          await reader.cancel().catch(() => undefined)
          break
        }
        result += decoder.decode(value, { stream: true })
      }
    }
    result += decoder.decode()
  } finally {
    reader.releaseLock()
  }

  return result
}

function parseJsonLdOffer(html: string, url: string): Record<string, unknown> | null {
  const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as unknown
      const candidates: unknown[] = []
      if (Array.isArray(parsed)) {
        candidates.push(...parsed)
      } else if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>
        if (Array.isArray(obj['@graph'])) {
          candidates.push(...obj['@graph'])
        } else {
          candidates.push(obj)
        }
      }

      for (const item of candidates) {
        if (!item || typeof item !== 'object') continue
        const job = item as Record<string, unknown>
        const typeField = job['@type']
        const isJobPosting =
          typeField === 'JobPosting' ||
          (Array.isArray(typeField) && typeField.includes('JobPosting'))

        if (!isJobPosting) continue

        const org =
          job.hiringOrganization && typeof job.hiringOrganization === 'object'
            ? String((job.hiringOrganization as Record<string, unknown>).name || '')
            : ''

        let location = ''
        const locObj = job.jobLocation as Record<string, unknown> | undefined
        if (locObj && typeof locObj === 'object') {
          const addr = locObj.address as Record<string, unknown> | undefined
          if (addr && typeof addr === 'object') {
            location = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
              .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
              .join(', ')
          } else if (typeof locObj.name === 'string') {
            location = locObj.name
          }
        }

        const identifier = job.identifier as Record<string, unknown> | undefined
        return {
          titre: typeof job.title === 'string' ? job.title.trim() : '',
          entreprise: org.trim(),
          url,
          localisation: location,
          type_contrat: typeof job.employmentType === 'string' ? job.employmentType : '',
          experience_requise:
            typeof job.experienceRequirements === 'string' ? job.experienceRequirements : '',
          reference:
            identifier && typeof identifier === 'object' && typeof identifier.value === 'string'
              ? identifier.value
              : '',
          source: 'JSON-LD',
          description:
            typeof job.description === 'string' ? decodeHtmlText(job.description) : '',
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }

  return null
}

function parseWttjNextData(html: string, url: string, companySlug: string, jobSlug: string): Record<string, unknown> | null {
  const nextDataMatch = html.match(
    /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i
  )
  if (!nextDataMatch || !nextDataMatch[1]) return null

  try {
    const nextData = JSON.parse(nextDataMatch[1]) as {
      props?: { pageProps?: { job?: Record<string, unknown> } }
    }
    const job = nextData?.props?.pageProps?.job
    if (!job || typeof job !== 'object') return null

    const org =
      job.organization && typeof job.organization === 'object'
        ? String((job.organization as Record<string, unknown>).name || companySlug)
        : companySlug
    const office = job.office as Record<string, unknown> | undefined
    const city = office && typeof office.city === 'string' ? office.city : ''
    const country = office && typeof office.country === 'string' ? office.country : 'France'

    return {
      titre: typeof job.name === 'string' ? job.name : '',
      entreprise: org,
      url,
      localisation: city ? `${city}, ${country}` : '',
      type_contrat: typeof job.contract_type === 'string' ? job.contract_type : '',
      experience_requise: typeof job.experience_level === 'string' ? job.experience_level : '',
      reference: String(job.reference || job.slug || jobSlug),
      source: 'WTTJ',
      description: typeof job.description === 'string' ? decodeHtmlText(job.description) : '',
    }
  } catch {
    return null
  }
}

async function extractOfferFromPublicUrl(targetUrl: string): Promise<Record<string, unknown> | null> {
  const safeUrl = isSafePublicUrl(targetUrl)
  if (!safeUrl) return null

  // 1. Public Greenhouse REST API
  const ghMatch = safeUrl.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/i)
  if (ghMatch) {
    const [, boardToken, jobId] = ghMatch
    try {
      const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
        boardToken
      )}/jobs/${encodeURIComponent(jobId)}`
      const res = await fetch(apiUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>
        const loc = data.location as Record<string, unknown> | undefined
        return {
          titre: typeof data.title === 'string' ? data.title : '',
          entreprise: boardToken.charAt(0).toUpperCase() + boardToken.slice(1),
          url: safeUrl,
          localisation: loc && typeof loc.name === 'string' ? loc.name : '',
          type_contrat: 'CDI',
          reference: jobId,
          source: 'Greenhouse',
          description: typeof data.content === 'string' ? decodeHtmlText(data.content) : '',
        }
      }
    } catch {
      // Fall back to generic HTML extraction
    }
  }

  // 2. Public Lever REST API
  const leverMatch = safeUrl.match(/jobs\.lever\.co\/([^/]+)\/([a-f0-9-]+)/i)
  if (leverMatch) {
    const [, company, postingId] = leverMatch
    try {
      const apiUrl = `https://api.lever.co/v0/postings/${encodeURIComponent(
        company
      )}/${encodeURIComponent(postingId)}`
      const res = await fetch(apiUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>
        const categories = data.categories as Record<string, unknown> | undefined
        return {
          titre: typeof data.text === 'string' ? data.text : '',
          entreprise: company.charAt(0).toUpperCase() + company.slice(1),
          url: safeUrl,
          localisation:
            categories && typeof categories.location === 'string' ? categories.location : '',
          type_contrat:
            categories && typeof categories.commitment === 'string' ? categories.commitment : 'CDI',
          reference: postingId,
          source: 'Lever',
          description: decodeHtmlText(
            String(data.descriptionPlain || data.description || '')
          ),
        }
      }
    } catch {
      // Fall back to generic HTML extraction
    }
  }

  // 3. Direct HTML fetch + JSON-LD / __NEXT_DATA__ / meta fallback
  try {
    const response = await fetch(safeUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'NextStep/1.0',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) return null
    if (response.url && !isSafePublicUrl(response.url)) return null

    const html = await readBoundedText(response, MAX_HTML_BYTES)

    const wttjMatch = safeUrl.match(
      /welcometothejungle\.com\/(?:[a-z]{2}\/)?companies\/([^/]+)\/jobs\/([^/?#]+)/i
    )
    if (wttjMatch) {
      const wttjOffer = parseWttjNextData(html, safeUrl, wttjMatch[1], wttjMatch[2])
      if (wttjOffer && wttjOffer.titre) return wttjOffer
    }

    const jsonLdOffer = parseJsonLdOffer(html, safeUrl)
    if (jsonLdOffer && jsonLdOffer.titre) return jsonLdOffer

    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const ogSiteMatch = html.match(
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i
    )
    const metaDescMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    )

    const titre = stripHtml(h1Match?.[1] || titleMatch?.[1] || '').split('|')[0].trim()
    if (!titre) return null

    return {
      titre,
      entreprise: stripHtml(ogSiteMatch?.[1] || ''),
      url: safeUrl,
      localisation: '',
      type_contrat: '',
      source: 'Direct',
      description: stripHtml(metaDescMatch?.[1] || ''),
    }
  } catch {
    return null
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  if (!isAuthorizedRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {}

  const rawKeywords = typeof body.keywords === 'string' ? body.keywords.trim() : ''
  const isUrlInput = /^https?:\/\//i.test(rawKeywords)

  let explicitUrls: string[] = []
  if (body.urls !== undefined) {
    if (!Array.isArray(body.urls)) {
      return res.status(400).json({ error: 'Invalid urls parameter. Expected an array.' })
    }
    explicitUrls = body.urls
      .slice(0, MAX_URLS)
      .map((u) => isSafePublicUrl(u))
      .filter((u): u is string => Boolean(u))
  }

  if (isUrlInput) {
    if (rawKeywords.length > 2048 || !isSafePublicUrl(rawKeywords)) {
      return res.status(400).json({ error: 'Invalid or unsafe URL.' })
    }
  } else if (explicitUrls.length === 0) {
    if (rawKeywords.length < 2 || rawKeywords.length > 120) {
      return res.status(400).json({ error: 'Missing or invalid keywords (2-120 chars).' })
    }
  } else if (rawKeywords.length > 120) {
    return res.status(400).json({ error: 'Invalid keywords length (max 120 chars).' })
  }

  const location =
    typeof body.location === 'string' && body.location.trim()
      ? body.location.trim().slice(0, 80)
      : 'France'

  const rawUserId = typeof body.userId === 'string' ? body.userId.trim() : 'local-user'
  const userId = rawUserId && rawUserId.length <= 128 ? rawUserId : 'local-user'

  const parsedMax = Number(body.maxResults)
  const maxResults = Number.isFinite(parsedMax)
    ? Math.min(Math.max(Math.trunc(parsedMax), 1), 25)
    : 10

  const useApify = body.useApify === true

  const targetUrls = Array.from(
    new Set([...(isUrlInput ? [isSafePublicUrl(rawKeywords)] : []), ...explicitUrls])
  )
    .filter(Boolean)
    .slice(0, MAX_URLS)

  try {
    const rawOffers: unknown[] = []
    const sourcesUsed: string[] = []

    // 1. Extraction directe URL (ATS REST APIs & JSON-LD)
    if (targetUrls.length > 0) {
      const directResults = await Promise.all(
        targetUrls.map((targetUrl) => extractOfferFromPublicUrl(targetUrl))
      )
      for (const item of directResults) {
        if (item) rawOffers.push(item)
      }
      if (rawOffers.length > 0) sourcesUsed.push('direct')
    }

    // 2. Pont optionnel vers le service Python Scrapling
    const scraplingBaseUrl = isSafeHttpUrl(process.env.SCRAPLING_API_URL)
    if (scraplingBaseUrl) {
      try {
        const scraplingToken = process.env.SCRAPLING_API_TOKEN || ''
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (scraplingToken) {
          headers.Authorization = `Bearer ${scraplingToken}`
        }

        const scraplingRes = await fetch(`${scraplingBaseUrl.replace(/\/$/, '')}/scrape`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            keywords: isUrlInput ? '' : rawKeywords,
            location,
            maxResults,
            urls: targetUrls,
          }),
          signal: AbortSignal.timeout(20_000),
        })

        if (scraplingRes.ok) {
          const payload = (await scraplingRes.json()) as { offers?: unknown[] }
          if (Array.isArray(payload?.offers)) {
            rawOffers.push(...payload.offers)
            if (payload.offers.length > 0) sourcesUsed.push('scrapling')
          }
        }
      } catch (err) {
        console.warn(
          'Scrapling service unavailable:',
          err instanceof Error ? err.message : 'Unknown error'
        )
      }
    }

    // 3. Déclenchement Apify optionnel (uniquement si demandé et configuré sans secret en query string)
    let apifyTriggered = false
    const apifyToken = process.env.APIFY_API_TOKEN
    const webhookSecret = process.env.WEBHOOK_SECRET

    if (useApify && apifyToken && webhookSecret && !isUrlInput && rawKeywords) {
      try {
        const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://job-machine-indol.vercel.app'

        const webhookUrl = `${host}/api/webhook?userId=${encodeURIComponent(
          userId
        )}&keywords=${encodeURIComponent(rawKeywords)}`

        const webhooks = [
          {
            eventTypes: ['ACTOR.RUN.SUCCEEDED'],
            requestUrl: webhookUrl,
            headersTemplate: JSON.stringify({ 'x-webhook-secret': webhookSecret }),
          },
        ]
        const webhooksBase64 = Buffer.from(JSON.stringify(webhooks)).toString('base64')
        const wttjApifyUrl = `https://api.apify.com/v2/acts/clearpath~welcome-to-the-jungle-jobs-api/runs?webhooks=${encodeURIComponent(
          webhooksBase64
        )}`

        const apifyRes = await fetch(wttjApifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apifyToken}`,
          },
          body: JSON.stringify({ keyword: rawKeywords, location, maxResults }),
          signal: AbortSignal.timeout(10_000),
        })
        if (apifyRes.ok) {
          apifyTriggered = true
          sourcesUsed.push('apify')
        }
      } catch (err) {
        console.warn(
          'Apify trigger failed:',
          err instanceof Error ? err.message : 'Unknown error'
        )
      }
    }

    const formattedOffers = formatAndScoreOffers(
      rawOffers,
      userId,
      isUrlInput ? undefined : rawKeywords || undefined
    ).slice(0, maxResults)

    let message = `${formattedOffers.length} offre(s) extraite(s).`
    if (formattedOffers.length === 0) {
      if (apifyTriggered) {
        message = 'Collecte Apify lancée en arrière-plan.'
      } else if (!scraplingBaseUrl && targetUrls.length === 0) {
        message =
          "Collez une URL d'offre pour l'extraire, ou lancez le script Scrapling local (scripts/scrapling_scraper.py)."
      } else {
        message = 'Aucune offre trouvée pour cette requête.'
      }
    }

    return res.status(200).json({
      success: true,
      offers: formattedOffers,
      resultsCount: formattedOffers.length,
      source: sourcesUsed.join(', ') || 'none',
      message,
    })
  } catch (err) {
    console.error(
      'Error during scraping:',
      err instanceof Error ? err.message : 'Unknown error'
    )
    return res.status(500).json({ error: 'Internal server error' })
  }
}
