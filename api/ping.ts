import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  // Accepte GET (utilisé par Vercel Cron et UptimeRobot) et POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ibjwsbbulnnnugemqapj.supabase.co'
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zqlYtE12672f1JTEaJyONw_Z4lvu_Kx'

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Requête légère sur la base de données pour générer de l'activité réelle et empêcher la mise en pause
    const { data, error } = await supabase
      .from('jobs')
      .select('id')
      .limit(1)

    if (error) {
      console.warn('Supabase ping query warning:', error)
      return res.status(200).json({
        ok: true,
        message: 'Ping envoyé à Supabase (réponse reçue de la passerelle)',
        warning: error.message,
        timestamp: new Date().toISOString()
      })
    }

    return res.status(200).json({
      ok: true,
      message: 'Ping Supabase réussi - base de données active',
      rows: data ? data.length : 0,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('Supabase ping error:', err)
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Erreur lors du ping Supabase',
      timestamp: new Date().toISOString()
    })
  }
}
