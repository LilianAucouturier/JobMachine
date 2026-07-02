import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  // Seules les requêtes POST sont autorisées
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  // Vérification de sécurité (un mot de passe que toi seul connaîtra)
  const secret = req.query.secret
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized. Invalid secret.' })
  }

  // Ton identifiant utilisateur Supabase (passé dans l'URL)
  const userId = req.query.userId
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter in the URL.' })
  }

  // Les données envoyées par le scrapeur
  let offers = req.body
  
  // --- SUPPORT NATIF POUR APIFY ---
  // Si Apify nous envoie un événement de succès, on va chercher les données nous-mêmes
  if (offers && offers.eventType === 'ACTOR.RUN.SUCCEEDED' && offers.resource?.defaultDatasetId) {
    try {
      const apifyToken = process.env.APIFY_API_TOKEN || ''
      const datasetUrl = `https://api.apify.com/v2/datasets/${offers.resource.defaultDatasetId}/items${apifyToken ? `?token=${apifyToken}` : ''}`
      
      const apifyRes = await fetch(datasetUrl)
      
      if (!apifyRes.ok) {
        throw new Error(`Apify dataset fetch failed: ${apifyRes.statusText}`)
      }
      
      offers = await apifyRes.json()
    } catch (e) {
      console.error('Failed to fetch Apify dataset', e)
      return res.status(500).json({ error: 'Failed to fetch Apify dataset' })
    }
  }
  // --------------------------------

  if (!Array.isArray(offers)) {
    // Parfois d'autres outils envoient un objet { data: [...] }
    if (offers && Array.isArray(offers.data)) {
      offers = offers.data
    } else {
      console.error('Invalid payload:', offers)
      return res.status(400).json({ error: 'Invalid payload. Expected a JSON array of offers.' })
    }
  }

  try {
    // On utilise la clé "Service Role" de Supabase pour contourner les règles RLS
    // car le Webhook n'est pas "connecté" avec ton mot de passe.
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const formattedOffers = offers.map((offer: any) => {
      let source = offer.source || 'scraper';
      const offerUrl = offer.url || offer.link || offer.jobUrl || '';
      
      if (offerUrl.includes('linkedin.com')) source = 'LinkedIn';
      else if (offerUrl.includes('indeed.com')) source = 'Indeed';

      return {
        user_id: userId,
        titre: offer.titre || offer.title || offer.positionName || offer.position || 'Offre sans titre',
        entreprise: offer.entreprise || offer.company || offer.companyName || '',
        url: offerUrl,
        localisation: offer.localisation || offer.location || offer.place || '',
        type_contrat: offer.type_contrat || offer.contract || '',
        experience_requise: offer.experience_requise || offer.experience || '',
        reference: offer.reference || offer.id || '',
        source: source,
        mots_cles: offer.mots_cles || offer.keywords || '',
      }
    })

    // -- ANTI-DOUBLONS --
    // On récupère les URLs qui arrivent
    const incomingUrls = formattedOffers.map((o: any) => o.url).filter(Boolean)
    let newOffers = formattedOffers

    if (incomingUrls.length > 0) {
      // On demande à Supabase quelles URLs existent déjà pour cet utilisateur
      const { data: existingOffers } = await supabaseAdmin
        .from('scraped_offers')
        .select('url')
        .eq('user_id', userId)
        .in('url', incomingUrls)
        
      if (existingOffers && existingOffers.length > 0) {
        const existingUrls = new Set(existingOffers.map(o => o.url))
        // On filtre : on ne garde que les offres dont l'URL n'est pas déjà dans la base
        newOffers = formattedOffers.filter((o: any) => !existingUrls.has(o.url))
      }
    }

    if (newOffers.length === 0) {
      return res.status(200).json({ success: true, message: 'Aucune nouvelle offre (toutes étaient des doublons).' })
    }

    // Insertion dans la base de données uniquement des nouvelles offres
    const { error } = await supabaseAdmin
      .from('scraped_offers')
      .insert(newOffers)

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, insertedCount: newOffers.length })
  } catch (err: any) {
    console.error('Webhook processing error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
