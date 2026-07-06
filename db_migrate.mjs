import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrate() {
  console.log("Updating offers from 'Offres à analyser' to 'Candidature envoyée'...")
  const { data, error } = await supabase
    .from('jobs')
    .update({ statut_pipeline: 'Candidature envoyée' })
    .eq('statut_pipeline', 'Offres à analyser')

  if (error) {
    console.error("Error migrating:", error)
  } else {
    console.log("Migration successful, updated rows:", data)
  }
}

migrate()
