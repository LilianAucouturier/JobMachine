/**
 * Endpoint Vercel Serverless : /api/reader
 * Utilise Jina Reader (r.jina.ai) pour extraire et nettoyer n'importe quelle offre d'emploi en Markdown propre.
 */

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' })
  }

  const url = req.method === 'POST' ? req.body?.url : req.query?.url

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL manquante ou invalide.' })
  }

  try {
    const jinaUrl = `https://r.jina.ai/${encodeURI(url)}`
    
    const jinaResponse = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown',
        'X-No-Cache': 'true',
        'User-Agent': 'NextStep-JobReader/1.0',
      },
    })

    if (!jinaResponse.ok) {
      // Fallback text
      const textRes = await fetch(jinaUrl)
      if (!textRes.ok) {
        return res.status(502).json({ error: `Jina Reader error: ${jinaResponse.status}` })
      }
      const rawMarkdown = await textRes.text()
      return res.status(200).json({
        success: true,
        url,
        content: rawMarkdown,
        format: 'markdown'
      })
    }

    const payload = await jinaResponse.json()
    const data = payload.data || payload

    return res.status(200).json({
      success: true,
      url,
      title: data.title || '',
      description: data.description || '',
      content: data.content || data.text || '',
      usage: payload.usage || null,
      format: 'markdown'
    })
  } catch (err: any) {
    console.error('Reader API error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
