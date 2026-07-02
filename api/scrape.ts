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
    const apifyUrl = `https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper/runs?token=${apifyToken}&webhooks=${webhooksBase64}`

    const payload: any = {
      includeKeyword: keywords,
      locationName: location || '',
      pagesToFetch: 1
    }

    if (publishedAt) {
      payload.publishedAt = publishedAt
    }

    const response = await fetch(apifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Apify API error:', errorData)
      return res.status(500).json({ error: `Erreur Apify: ${errorData}` })
    }

    const data = await response.json()
    return res.status(200).json({ success: true, runId: data.data.id })

  } catch (err: any) {
    console.error('Error starting scrape:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
