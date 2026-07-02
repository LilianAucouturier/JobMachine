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

  // Les données envoyées par le scrapeur (Phantombuster, Apify, Make, etc.)
  let offers = req.body
  
  if (!Array.isArray(offers)) {
    // Parfois les outils envoient un objet { data: [...] }
    if (offers && Array.isArray(offers.data)) {
      offers = offers.data
    } else {
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

    // Formatage des offres pour que ça corresponde toujours à notre base de données
    // peu importe le nom des colonnes que Phantombuster ou Apify utilise par défaut.
    const formattedOffers = offers.map((offer: any) => ({
      user_id: userId,
      titre: offer.titre || offer.title || offer.position || 'Offre sans titre',
      entreprise: offer.entreprise || offer.company || offer.companyName || '',
      url: offer.url || offer.link || offer.jobUrl || '',
      localisation: offer.localisation || offer.location || offer.place || '',
      type_contrat: offer.type_contrat || offer.contract || '',
      experience_requise: offer.experience_requise || offer.experience || '',
      reference: offer.reference || offer.id || '',
      source: offer.source || 'scraper',
      mots_cles: offer.mots_cles || offer.keywords || '',
    }))

    // Insertion dans la base de données
    const { error } = await supabaseAdmin
      .from('scraped_offers')
      .insert(formattedOffers)

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, insertedCount: formattedOffers.length })
  } catch (err: any) {
    console.error('Webhook processing error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
