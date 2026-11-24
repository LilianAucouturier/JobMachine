import {
  extractHeaderSecret,
  formatAndScoreOffers,
  timingSafeSecretMatch,
} from './_lib/offers.js'

interface ApiRequest {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
  body?: unknown
}

interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (body: unknown) => unknown
}

const DATASET_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/

function readQueryString(
  query: Record<string, string | string[] | undefined> | undefined,
  key: string
): string {
  const val = query?.[key]
  if (typeof val === 'string') return val.trim()
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0].trim()
  return ''
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const providedSecret = extractHeaderSecret(req)
  if (!timingSafeSecretMatch(providedSecret, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const bodyObj =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : null

  const rawUserId =
    typeof bodyObj?.userId === 'string'
      ? bodyObj.userId.trim()
      : readQueryString(req.query, 'userId')

  if (!rawUserId || rawUserId.length > 128) {
    return res.status(400).json({ error: 'Missing or invalid userId parameter.' })
  }

  let rawOffers: unknown = req.body

  if (
    bodyObj &&
    bodyObj.eventType === 'ACTOR.RUN.SUCCEEDED' &&
    bodyObj.resource &&
    typeof bodyObj.resource === 'object'
  ) {
    const datasetId = (bodyObj.resource as Record<string, unknown>).defaultDatasetId
    if (typeof datasetId !== 'string' || !DATASET_ID_RE.test(datasetId)) {
      return res.status(400).json({ error: 'Invalid dataset ID' })
    }

    try {
      const apifyToken = process.env.APIFY_API_TOKEN || ''
      const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items`
      const apifyRes = await fetch(datasetUrl, {
        headers: apifyToken ? { Authorization: `Bearer ${apifyToken}` } : {},
        signal: AbortSignal.timeout(15_000),
      })

      if (!apifyRes.ok) {
        console.error('Apify dataset fetch failed with status:', apifyRes.status)
        return res.status(502).json({ error: 'Failed to fetch Apify dataset' })
      }
      rawOffers = await apifyRes.json()
    } catch (err) {
      console.error(
        'Failed to fetch Apify dataset:',
        err instanceof Error ? err.message : 'Unknown error'
      )
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (!Array.isArray(rawOffers)) {
    if (
      rawOffers &&
      typeof rawOffers === 'object' &&
      Array.isArray((rawOffers as Record<string, unknown>).data)
    ) {
      rawOffers = (rawOffers as Record<string, unknown>).data
    } else {
      console.error('Invalid webhook payload type:', typeof rawOffers)
      return res.status(400).json({ error: 'Invalid payload. Expected a JSON array of offers.' })
    }
  }

  try {
    const searchKeywords = readQueryString(req.query, 'keywords') || undefined
    const relevantOffers = formatAndScoreOffers(
      rawOffers as unknown[],
      rawUserId,
      searchKeywords
    )

    return res.status(200).json({
      success: true,
      count: relevantOffers.length,
      offers: relevantOffers,
      message: `${relevantOffers.length} offre(s) traitée(s).`,
    })
  } catch (err) {
    console.error(
      'Webhook processing error:',
      err instanceof Error ? err.message : 'Unknown error'
    )
    return res.status(500).json({ error: 'Internal server error' })
  }
}
