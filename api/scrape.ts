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

  const webhookUrl = `${host}/api/webhook?secret=${webhookSecret}&userId=${userId}&keywords=${encodeURIComponent(keywords || '')}`

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

    // --- WTTJ CONFIG (ClearPath Pay-Per-Result Free Tier) ---
    const wttjPayload: any = {
      keyword: keywords || "",
      location: location || "",
      maxResults: maxResults || 10,
    }
    const wttjApifyUrl = `https://api.apify.com/v2/acts/clearpath~welcome-to-the-jungle-jobs-api/runs?token=${apifyToken}&webhooks=${webhooksBase64}`

    // --- GOOGLE JOBS (JSearch) CONFIG ---
    // Exécuté uniquement si la clé RAPIDAPI_KEY est présente
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    let jSearchPromise = Promise.resolve();

    if (rapidApiKey && keywords) {
      const jSearchQuery = `${keywords} ${location || ''}`.trim();
      const jSearchUrl = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(jSearchQuery)}&page=1&num_pages=1`;
      
      jSearchPromise = fetch(jSearchUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      }).then(async (res) => {
        if (!res.ok) throw new Error(`JSearch failed with status: ${res.status}`);
        const json = await res.json();
        const data = json.data || [];
        
        // On formate les données pour le webhook
        const formattedData = data.map((job: any) => ({
          titre: job.job_title,
          entreprise: job.employer_name,
          url: job.job_apply_link || job.job_google_link,
          localisation: job.job_city ? `${job.job_city}, ${job.job_country}` : '',
          type_contrat: job.job_employment_type === 'FULLTIME' ? 'CDI' : job.job_employment_type === 'CONTRACTOR' ? 'Freelance' : job.job_employment_type === 'INTERN' ? 'Stage' : '',
          description: job.job_description,
          source: 'Google Jobs'
        }));

        if (formattedData.length > 0) {
          // On envoie au webhook
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formattedData)
          });
        }
      }).catch(err => {
        throw new Error(`JSearch Error: ${err.message}`);
      });
    }

    // LANCEMENT EN PARALLELE AVEC TOLERANCE AUX PANNES
    const results = await Promise.allSettled([
      fetch(linkedInApifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkedInPayload)
      }).then(res => { if (!res.ok) throw new Error(`LinkedIn failed: ${res.status}`) }),
      fetch(indeedApifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(indeedPayload)
      }).then(res => { if (!res.ok) throw new Error(`Indeed failed: ${res.status}`) }),
      fetch(wttjApifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wttjPayload)
      }).then(res => { if (!res.ok) throw new Error(`WTTJ failed: ${res.status}`) }),
      jSearchPromise
    ])

    const errors = results.filter(r => r.status === 'rejected').map((r: any) => r.reason?.message);

    if (errors.length > 0) {
      console.warn("Some scrapers failed:", errors);
    }

    return res.status(200).json({ 
      success: true, 
      message: errors.length > 0 ? `Scraping lancé partiellement. Erreurs: ${errors.join(', ')}` : 'Tous les scrapers ont été lancés avec succès.' 
    })

  } catch (err: any) {
    console.error('Error starting scrape:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
