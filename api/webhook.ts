// Grille de pondération aérospatiale Career-Ops
const AERO_MAJORS = ['safran', 'airbus', 'dassault', 'thales', 'arianegroup', 'mbda', 'cnes', 'esa', 'atr', 'collins', 'liebherr', 'naval group']
const AERO_TECH = ['avionique', 'systèmes embarqués', 'embarqué', 'do-178', 'do-254', 'matlab', 'simulink', 'c++', 'aéronautique', 'aérospatial', 'propulsion', 'aérodynamique', 'catia', 'temps réel', 'en 9100', 'arinc']

function evaluateOfferWithCareerOps(titre: string, entreprise: string, description: string, typeContrat: string) {
  const fullText = `${titre} ${entreprise} ${description || ''}`.toLowerCase()
  const entLower = (entreprise || '').toLowerCase()

  let score = 40
  let tier = 'Général'
  let isAero = false

  if (AERO_MAJORS.some(m => entLower.includes(m))) {
    score = 90
    tier = 'Constructeur Aéronautique & Spatial'
    isAero = true
  } else if (fullText.includes('aéronautique') || fullText.includes('aérospatial') || fullText.includes('aviation')) {
    score = 75
    tier = 'Secteur Aérospatial'
    isAero = true
  }

  const matched: string[] = []
  for (const kw of AERO_TECH) {
    if (fullText.includes(kw)) {
      matched.push(kw)
      score += 5
    }
  }

  const fitScore = Math.min(score, 98)
  const nomCible = entreprise || 'l\'entreprise'

  const cvTips = [
    `Mettre en avant vos compétences sur ${matched.slice(0, 3).join(', ') || 'l\'ingénierie système et le cycle en V'}.`,
    `Détailler vos projets d'école d'ingénieur (IPSA) avec métriques concrètes (robustesse, conformité).`,
    `Souligner votre motivation pour les programmes phares de ${nomCible}.`,
  ]

  const pitch = `Actuellement en recherche d'opportunité en ingénierie, je porte un vif intérêt aux programmes menés par ${nomCible}. Mon parcours axé sur ${matched[0] || 'les technologies aéronautiques'} me permet d'être rapidement opérationnel sur vos projets.`

  return {
    fitScore,
    tier,
    isAero,
    matchedKeywords: matched,
    cvTips,
    pitch,
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const secret = req.query.secret
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized. Invalid secret.' })
  }

  const userId = req.query.userId
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter in the URL.' })
  }

  let offers = req.body
  
  if (offers && offers.eventType === 'ACTOR.RUN.SUCCEEDED' && offers.resource?.defaultDatasetId) {
    try {
      const apifyToken = process.env.APIFY_API_TOKEN || ''
      const datasetUrl = `https://api.apify.com/v2/datasets/${offers.resource.defaultDatasetId}/items${apifyToken ? `?token=${apifyToken}` : ''}`
      const apifyRes = await fetch(datasetUrl)
      if (!apifyRes.ok) throw new Error(`Apify dataset fetch failed: ${apifyRes.statusText}`)
      offers = await apifyRes.json()
    } catch (e) {
      console.error('Failed to fetch Apify dataset', e)
      return res.status(500).json({ error: 'Failed to fetch Apify dataset' })
    }
  }

  if (!Array.isArray(offers)) {
    if (offers && Array.isArray(offers.data)) {
      offers = offers.data
    } else {
      console.error('Invalid payload:', offers)
      return res.status(400).json({ error: 'Invalid payload. Expected a JSON array of offers.' })
    }
  }

  try {
    const formattedOffers = offers.map((offer: any) => {
      let source = offer.source || 'scraper';
      const offerUrl = offer.url || offer.link || offer.jobUrl || offer.applyUrl || '';
      
      if (offerUrl.includes('linkedin.com')) source = 'LinkedIn';
      else if (offerUrl.includes('indeed.com')) source = 'Indeed';
      else if (offerUrl.includes('welcometothejungle.com') || offerUrl.includes('app.beetween.com') || offerUrl.includes('wttj')) source = 'WTTJ';
      else if (offerUrl.includes('safran')) source = 'Safran';
      else if (offerUrl.includes('airbus')) source = 'Airbus';
      else if (offerUrl.includes('dassault')) source = 'Dassault';

      let localisation = offer.localisation || offer.location || offer.place || '';
      if (!localisation && offer.offices && offer.offices.length > 0) {
        localisation = offer.offices.map((o: any) => o.city).filter(Boolean).join(', ');
      }

      const titleLower = (offer.titre || offer.name || offer.title || '').toLowerCase();
      const originalDesc = offer.description || offer.descriptionText || offer.descriptionHtml || offer.descriptionHTML || '';
      const descLower = originalDesc.toLowerCase();
      
      let type_contrat = offer.type_contrat || offer.contractType || offer.contract || '';
      if (typeof type_contrat !== 'string') type_contrat = String(type_contrat);

      if (titleLower.includes('alternance') || titleLower.includes('apprenti') || titleLower.includes('professionnalisation')) {
        type_contrat = 'Alternance';
      } else if (titleLower.includes('stage') || titleLower.includes('stagiaire') || titleLower.includes('internship') || titleLower.includes('intern')) {
        type_contrat = 'Stage';
      } else if (titleLower.includes('freelance') || titleLower.includes('indépendant') || titleLower.includes('amoa')) {
        type_contrat = 'Freelance';
      } else if (titleLower.includes('cdd') || titleLower.includes('fixed term')) {
        type_contrat = 'CDD';
      } else if (titleLower.includes('cdi') || titleLower.includes('full-time')) {
        type_contrat = 'CDI';
      } else if (descLower.includes('alternance') || descLower.includes('apprentissage')) {
        type_contrat = 'Alternance';
      } else if (descLower.includes('stage') || descLower.includes('internship')) {
        type_contrat = 'Stage';
      } else if (descLower.includes('cdi')) {
        type_contrat = 'CDI';
      }

      let exp = offer.experience || offer.experienceLevel || offer.experienceRequired || offer.seniority || '';
      let experience_requise = '-';
      if (typeof exp === 'string' && exp.trim()) {
        experience_requise = exp;
      } else if (type_contrat === 'Stage' || type_contrat === 'Alternance' || descLower.includes('débutant') || descLower.includes('junior')) {
        experience_requise = '0-1 an';
      }

      const titre = offer.titre || offer.name || offer.title || offer.positionName || offer.position || 'Offre sans titre';
      const entreprise = offer.entreprise || offer.organizationName || offer.company || offer.companyName || '';

      // --- EVALUATION CAREER-OPS IA ---
      const evalResult = evaluateOfferWithCareerOps(titre, entreprise, originalDesc, type_contrat);

      // Enrichissement de la description avec les insights Career-Ops
      const aiInsightsHeader = `---
🎯 Career-Ops Match Score : ${evalResult.fitScore}% [${evalResult.tier}]
${evalResult.isAero ? '🚀 Opportunité Secteur Aéronautique & Défense' : ''}
💡 Adaptation CV recommandée :
${evalResult.cvTips.map(tip => `• ${tip}`).join('\n')}

✉️ Accroche Motivation :
"${evalResult.pitch}"
---

`;

      const finalDescription = originalDesc ? `${aiInsightsHeader}${originalDesc}` : aiInsightsHeader;
      const combinedKeywords = Array.from(new Set([
        ...(offer.mots_cles ? [offer.mots_cles] : []),
        ...evalResult.matchedKeywords
      ])).join(', ');

      return {
        user_id: userId,
        titre,
        entreprise,
        url: offerUrl,
        localisation,
        type_contrat,
        experience_requise,
        reference: offer.reference || offer.id || '',
        source,
        mots_cles: combinedKeywords || 'Aéronautique',
        description: finalDescription,
      }
    })

    // -- FILTRAGE DE PERTINENCE --
    let relevantOffers = formattedOffers;
    const searchKeywords = req.query.keywords as string | undefined;
    
    if (searchKeywords) {
      const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const searchTerms = removeAccents(searchKeywords)
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(w => w.length > 2);

      if (searchTerms.length > 0) {
        relevantOffers = formattedOffers.filter((o: any) => {
          const title = removeAccents(o.titre || '').toLowerCase();
          const comp = removeAccents(o.entreprise || '').toLowerCase();
          return searchTerms.some(term => title.includes(term) || comp.includes(term));
        });
      }
    }

    return res.status(200).json({
      success: true,
      count: relevantOffers.length,
      offers: relevantOffers,
      message: `${relevantOffers.length} offre(s) formatée(s) et évaluée(s) avec Career-Ops.`
    })
  } catch (err: any) {
    console.error('Webhook processing error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
