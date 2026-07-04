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
      const offerUrl = offer.url || offer.link || offer.jobUrl || offer.applyUrl || '';
      
      if (offerUrl.includes('linkedin.com')) source = 'LinkedIn';
      else if (offerUrl.includes('indeed.com')) source = 'Indeed';
      else if (offerUrl.includes('welcometothejungle.com') || offerUrl.includes('app.beetween.com') || offerUrl.includes('wttj')) source = 'WTTJ';

      let localisation = offer.localisation || offer.location || offer.place || '';
      if (!localisation && offer.offices && offer.offices.length > 0) {
        localisation = offer.offices.map((o: any) => o.city).filter(Boolean).join(', ');
      }

      let type_contrat = offer.type_contrat || offer.contractType || offer.contract || '';
      if (typeof type_contrat !== 'string') type_contrat = String(type_contrat);
      
      let exp = offer.experience_requise || (offer.experienceLevel !== undefined && offer.experienceLevel !== null ? String(offer.experienceLevel) : (offer.experience || ''));
      if (typeof exp !== 'string') exp = String(exp);

      const originalDesc = offer.description || offer.descriptionHTML || '';
      const desc = originalDesc.toLowerCase();
      if (!type_contrat && desc) {
        if (desc.includes('cdi') || desc.includes('full-time') || desc.includes('full time') || desc.includes('temps plein')) type_contrat = 'CDI';
        else if (desc.includes('cdd') || desc.includes('part-time') || desc.includes('part time') || desc.includes('temps partiel') || desc.includes('fixed term')) type_contrat = 'CDD';
        else if (desc.includes('stage') || desc.includes('internship') || desc.includes('stagiaire')) type_contrat = 'Stage';
        else if (desc.includes('alternance') || desc.includes('apprentissage') || desc.includes('contrat de professionnalisation') || desc.includes('apprenti')) type_contrat = 'Alternance';
      }

      type_contrat = type_contrat.toLowerCase();
      if (type_contrat.includes('full') || type_contrat.includes('cdi')) type_contrat = 'CDI';
      else if (type_contrat.includes('part') || type_contrat.includes('cdd') || type_contrat.includes('fixed') || type_contrat.includes('contract')) type_contrat = 'CDD';
      else if (type_contrat.includes('intern') || type_contrat.includes('stage')) type_contrat = 'Stage';
      else if (type_contrat.includes('appren') || type_contrat.includes('alternance') || type_contrat.includes('work_study')) type_contrat = 'Alternance';
      else type_contrat = '';

      if (!exp && desc) {
        // Look for "X ans d'expérience", "X années d'expérience", "X to Y years", etc.
        const expMatch = desc.match(/(\d+)\s*(?:à|-)\s*(\d+)\s*(?:ans|années|years)/) || desc.match(/(\d+)\s*(?:ans|années|years)/);
        if (expMatch) {
          exp = expMatch[1];
        } else if (desc.includes('débutant accepté') || desc.includes('junior') || desc.includes('entry level')) {
          exp = '0';
        } else if (desc.includes('senior') || desc.includes('expert')) {
          exp = '5';
        }
      }

      let experience_requise = '';
      if (exp) {
        const expLower = exp.toLowerCase();
        const num = parseInt(expLower.match(/\d+/)?.[0] || '-1', 10);
        if (num >= 0) {
          if (num <= 1) experience_requise = '0-1 an';
          else if (num <= 3) experience_requise = '1-3 ans';
          else if (num <= 5) experience_requise = '3-5 ans';
          else experience_requise = '5+ ans';
        } else if (expLower.includes('junior') || expLower.includes('entry')) {
          experience_requise = '0-1 an';
        } else if (expLower.includes('senior') || expLower.includes('lead') || expLower.includes('expert')) {
          experience_requise = '5+ ans';
        } else {
          experience_requise = exp;
        }
      }

      return {
        user_id: userId,
        titre: offer.titre || offer.name || offer.title || offer.positionName || offer.position || 'Offre sans titre',
        entreprise: offer.entreprise || offer.organizationName || offer.company || offer.companyName || '',
        url: offerUrl,
        localisation: localisation,
        type_contrat: type_contrat,
        experience_requise: experience_requise,
        reference: offer.reference || offer.id || '',
        source: source,
        mots_cles: offer.mots_cles || offer.keywords || '',
        description: originalDesc || null,
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
