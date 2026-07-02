export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const { keywords, location, userId, maxResults = 10 } = req.body

  if (!keywords || !userId) {
    return res.status(400).json({ error: 'Missing required parameters.' })
  }

  const apifyToken = process.env.APIFY_API_TOKEN
  const webhookSecret = process.env.WEBHOOK_SECRET
  
  if (!apifyToken || !webhookSecret) {
    console.error('Missing Apify token or Webhook secret in environment variables')
    return res.status(500).json({ error: 'Server misconfiguration.' })
  }

  // The base URL where this function is deployed (Vercel automatically sets VERCEL_URL or VERCEL_PROJECT_PRODUCTION_URL)
  // For safety in dev/preview, we can construct it, or hardcode the project URL if VERCEL_URL is missing
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL 
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` 
    : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://job-machine-indol.vercel.app')

  // Construct the dynamic webhook URL specifically for THIS user
  const webhookUrl = `${host}/api/webhook?secret=${webhookSecret}&userId=${userId}`

  // Create the dynamic webhook configuration for Apify
  const webhooks = [
    {
      eventTypes: ["ACTOR.RUN.SUCCEEDED"],
      requestUrl: webhookUrl
    }
  ]
  const webhooksBase64 = Buffer.from(JSON.stringify(webhooks)).toString('base64')

  try {
    // APIFY API V2: Start Actor run
    // curious_coder/linkedin-jobs-scraper
    const apifyUrl = `https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper/runs?token=${apifyToken}&webhooks=${webhooksBase64}`

    const response = await fetch(apifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        searchKeyword: keywords,
        location: location || '',
        maxResults: maxResults
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Apify API error:', errorData)
      return res.status(500).json({ error: 'Failed to start Apify run' })
    }

    const data = await response.json()
    return res.status(200).json({ success: true, runId: data.data.id })

  } catch (err: any) {
    console.error('Error starting scrape:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
