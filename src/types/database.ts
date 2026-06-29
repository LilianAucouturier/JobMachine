export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: Job
        Insert: JobInsert
        Update: JobUpdate
      }
      contacts: {
        Row: Contact
        Insert: ContactInsert
        Update: ContactUpdate
      }
      pitch_templates: {
        Row: PitchTemplate
        Insert: PitchTemplateInsert
        Update: PitchTemplateUpdate
      }
    }
  }
}

export interface Job {
  id: string
  user_id: string
  titre: string
  entreprise: string
  url: string
  type_contrat: 'CDI' | 'CDD' | 'Alternance' | 'Stage'
  experience_requise: '0-1 an' | '1-3 ans' | '3-5 ans' | '5+ ans'
  version_cv: string
  mots_cles: string
  notes: string
  statut_pipeline: PipelineStatus
  position_ordre: number
  date_ajout: string
  date_derniere_action: string
  date_envoi_candidature: string | null
  created_at: string
  updated_at: string
}

export type PipelineStatus =
  | 'Offres à analyser'
  | 'Préparation'
  | 'Candidature envoyée'
  | 'Relance J+7'
  | 'Entretien'
  | 'Offre reçue'
  | 'Refus'

export type JobInsert = Omit<Job, 'id' | 'created_at' | 'updated_at' | 'date_ajout' | 'date_derniere_action' | 'date_envoi_candidature' | 'position_ordre'> & {
  id?: string
  position_ordre?: number
  date_envoi_candidature?: string | null
}

export type JobUpdate = Partial<Omit<Job, 'id' | 'user_id' | 'created_at'>>

export interface Contact {
  id: string
  user_id: string
  entreprise: string
  nom: string
  poste: string
  lien_linkedin: string
  email: string
  telephone: string
  notes: string
  statut: ContactStatus
  created_at: string
  updated_at: string
}

export type ContactStatus =
  | 'À contacter'
  | 'Message envoyé'
  | 'En discussion'
  | 'Relance nécessaire'
  | 'Converti'
  | 'Pas intéressé'

export type ContactInsert = Omit<Contact, 'id' | 'created_at' | 'updated_at'> & { id?: string }
export type ContactUpdate = Partial<Omit<Contact, 'id' | 'user_id' | 'created_at'>>

export interface PitchTemplate {
  id: string
  user_id: string
  nom: string
  contenu: string
  created_at: string
  updated_at: string
}

export type PitchTemplateInsert = Omit<PitchTemplate, 'id' | 'created_at' | 'updated_at'> & { id?: string }
export type PitchTemplateUpdate = Partial<Omit<PitchTemplate, 'id' | 'user_id' | 'created_at'>>
