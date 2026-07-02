export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const { keywords, location, userId, maxResults = 10, publishedAt } = req.body

  if (!keywords || !userId) {
    return res.status(400).json({ error: 'Missing required parameters.' })
  }

  const apifyToken = process.env.APIFY_API_TOKEN
  const webhookSecret = process.env.WEBHOOK_SECRET
  
  if (!apifyToken || !webhookSecret) {
    console.error('Missing Apify token or Webhook secret in environment variables')
    return res.status(500).json({ error: 'Server misconfiguration.' })
  }

  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL 
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` 
    : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://job-machine-indol.vercel.app')

  const webhookUrl = `${host}/api/webhook?secret=${webhookSecret}&userId=${userId}`

  const webhooks = [
    {
      eventTypes: ["ACTOR.RUN.SUCCEEDED"],
      requestUrl: webhookUrl
    }
  ]
  const webhooksBase64 = Buffer.from(JSON.stringify(webhooks)).toString('base64')

  try {
    // --- LINKEDIN CONFIG ---
    const searchUrl = new URL('https://www.linkedin.com/jobs/search/')
    if (keywords) searchUrl.searchParams.set('keywords', keywords)
    if (location) searchUrl.searchParams.set('location', location)
    if (publishedAt && publishedAt !== 'all') searchUrl.searchParams.set('f_TPR', publishedAt)

    const linkedInPayload: any = {
      urls: [ searchUrl.toString() ],
      pagesToFetch: Math.ceil((maxResults || 10) / 25) || 1
    }

    const linkedInApifyUrl = `https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper/runs?token=${apifyToken}&webhooks=${webhooksBase64}`

    // --- INDEED CONFIG ---
    const indeedPayload: any = {
      position: keywords || "",
      country: "FR", // default to France
      location: location || "",
      maxItems: maxResults || 10,
      parseCompanyDetails: false,
      saveOnlyUniqueItems: true,
    }
    const indeedApifyUrl = `https://api.apify.com/v2/acts/misceres~indeed-scraper/runs?token=${apifyToken}&webhooks=${webhooksBase64}`

    // LANCEMENT EN PARALLELE
    const [linkedInResponse, indeedResponse] = await Promise.all([
      fetch(linkedInApifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkedInPayload)
      }),
      fetch(indeedApifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(indeedPayload)
      })
    ])

    if (!linkedInResponse.ok || !indeedResponse.ok) {
      console.error("LinkedIn Status:", linkedInResponse.status)
      console.error("Indeed Status:", indeedResponse.status)
      return res.status(500).json({ error: 'Failed to launch one or more scrapers on Apify.' })
    }

    return res.status(200).json({ success: true, message: 'Both scrapers launched successfully.' })

  } catch (err: any) {
    console.error('Error starting scrape:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
