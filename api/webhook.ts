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

      const titleLower = (offer.titre || '').toLowerCase();
      const originalDesc = offer.description || offer.descriptionText || offer.descriptionHtml || offer.descriptionHTML || '';
      const descLower = originalDesc.toLowerCase();
      
      let type_contrat = offer.type_contrat || offer.contractType || offer.contract || '';
      if (typeof type_contrat !== 'string') type_contrat = String(type_contrat);

      // 1. Priorité absolue : les mots clés forts dans le titre de l'annonce
      if (titleLower.includes('alternance') || titleLower.includes('apprenti') || titleLower.includes('professionnalisation')) {
        type_contrat = 'Alternance';
      } else if (titleLower.includes('stage') || titleLower.includes('stagiaire') || titleLower.includes('internship') || titleLower.includes('intern')) {
        type_contrat = 'Stage';
      } else if (titleLower.includes('freelance') || titleLower.includes('indépendant') || titleLower.includes('amoa') || titleLower.includes('independant')) {
        type_contrat = 'Freelance';
      } else if (titleLower.includes('cdd') || titleLower.includes('fixed term')) {
        type_contrat = 'CDD';
      } else if (titleLower.includes('cdi') || titleLower.includes('full-time')) {
        type_contrat = 'CDI';
      } else {
        // 2. Si non trouvé dans le titre, on regarde la variable 'type_contrat' fournie par l'API
        let t = type_contrat.toLowerCase();
        if (t.includes('alternance') || t.includes('appren') || t.includes('work_study')) type_contrat = 'Alternance';
        else if (t.includes('stage') || t.includes('intern')) type_contrat = 'Stage';
        else if (t.includes('freelance') || t.includes('contractor') || t.includes('indépendant')) type_contrat = 'Freelance';
        else if (t.includes('cdd') || t.includes('part') || t.includes('fixed') || t.includes('contract')) type_contrat = 'CDD';
        else if (t.includes('cdi') || t.includes('full')) type_contrat = 'CDI';
        else if (descLower) {
          // 3. En dernier recours, on analyse la description. 
          // On cherche d'abord Alternance / Stage car les descriptions de stages mentionnent souvent "CDI à la clé"
          if (descLower.includes('alternance') || descLower.includes('apprentissage') || descLower.includes('contrat de professionnalisation') || descLower.includes('apprenti')) type_contrat = 'Alternance';
          else if (descLower.includes('stage') || descLower.includes('internship') || descLower.includes('stagiaire')) type_contrat = 'Stage';
          else if (descLower.includes('freelance') || descLower.includes('indépendant')) type_contrat = 'Freelance';
          else if (descLower.includes('cdd') || descLower.includes('part-time') || descLower.includes('temps partiel') || descLower.includes('fixed term')) type_contrat = 'CDD';
          else if (descLower.includes('cdi') || descLower.includes('full-time') || descLower.includes('temps plein')) type_contrat = 'CDI';
          else type_contrat = '';
        } else {
          type_contrat = '';
        }
      }

      let exp = offer.experience || offer.experienceLevel || offer.experienceRequired || offer.seniority || '';
      if (typeof exp !== 'string') exp = String(exp);

      if (!exp && descLower) {
        // Look for "X ans d'expérience", "X années d'expérience", "X to Y years", etc.
        const expMatch = descLower.match(/(\d+)\s*(?:à|-)\s*(\d+)\s*(?:ans|années|years)/) || descLower.match(/(\d+)\s*(?:ans|années|years)/);
        if (expMatch) {
          exp = expMatch[1];
        } else if (descLower.includes('débutant accepté') || descLower.includes('junior') || descLower.includes('entry level')) {
          exp = '0';
        } else if (descLower.includes('senior') || descLower.includes('expert')) {
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

    // -- FILTRAGE DE PERTINENCE --
    // LinkedIn et Indeed ont tendance à remonter des résultats "suggérés" ou très larges.
    // On filtre ici pour s'assurer que le titre de l'offre contient au moins un des mots-clés de la recherche.
    let relevantOffers = formattedOffers;
    const searchKeywords = req.query.keywords as string | undefined;
    
    if (searchKeywords) {
      const searchTerms = searchKeywords.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2);
      if (searchTerms.length > 0) {
        relevantOffers = formattedOffers.filter((o: any) => {
          const title = (o.titre || '').toLowerCase();
          return searchTerms.some(term => title.includes(term));
        });
      }
    }

    // -- ANTI-DOUBLONS --
    // On récupère les URLs qui arrivent
    const incomingUrls = relevantOffers.map((o: any) => o.url).filter(Boolean)
    let newOffers = relevantOffers

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
        newOffers = relevantOffers.filter((o: any) => !existingUrls.has(o.url))
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
