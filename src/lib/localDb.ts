import type {
  Job,
  JobInsert,
  JobUpdate,
  PipelineStatus,
  Contact,
  ContactInsert,
  ContactUpdate,
  ScrapedOffer,
  ScrapedOfferInsert,
  PitchTemplate,
  PitchTemplateInsert,
  PitchTemplateUpdate
} from '../types/database'

const KEYS = {
  JOBS: 'jm_local_jobs',
  CONTACTS: 'jm_local_contacts',
  OFFERS: 'jm_local_offers',
  TEMPLATES: 'jm_local_templates',
  USE_LOCAL: 'nextstep_use_local',
  LOCAL_USER: 'nextstep_local_user',
}

const DEFAULT_TEMPLATES: Omit<PitchTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    nom: 'Candidature spontanée - LinkedIn',
    contenu: `Bonjour [Nom],\n\nJe me permets de vous contacter car je suis très intéressée par [Entreprise] et plus particulièrement par votre expertise en tant que [Poste].\n\nDiplômée d'un Master en Communication, je recherche actuellement un poste où je pourrais mettre à profit mes compétences en stratégie de communication et gestion de projets.\n\nSeriez-vous disponible pour un échange de 15 minutes cette semaine ?\n\nBien cordialement`,
  },
  {
    nom: 'Relance après candidature',
    contenu: `Bonjour [Nom],\n\nJe me permets de revenir vers vous suite à ma candidature envoyée il y a quelques jours pour un poste au sein de [Entreprise].\n\nJe reste très motivée par cette opportunité et serais ravie d'en discuter avec vous.\n\nBien cordialement`,
  },
  {
    nom: 'Demande de mise en relation',
    contenu: `Bonjour [Nom],\n\nVotre parcours chez [Entreprise] en tant que [Poste] a retenu mon attention.\n\nActuellement en recherche active, je serais honorée de pouvoir échanger avec vous sur votre expérience et les opportunités au sein de votre entreprise.\n\nMerci d'avance pour votre temps !\n\nBien cordialement`,
  },
]

function generateId(): string {
  return 'loc_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
}

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (e) {
    console.warn(`Erreur lecture localStorage pour ${key}:`, e)
    return fallback
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`Erreur écriture localStorage pour ${key}:`, e)
  }
}

export const localDb = {
  isLocalMode(): boolean {
    const val = localStorage.getItem(KEYS.USE_LOCAL) ?? localStorage.getItem('jobmachine_use_local')
    return val !== 'false'
  },

  setLocalMode(enabled: boolean): void {
    localStorage.setItem(KEYS.USE_LOCAL, enabled ? 'true' : 'false')
  },

  getLocalUser() {
    const existing = getItem(KEYS.LOCAL_USER, null) || getItem('jobmachine_local_user', null)
    if (existing) return existing
    return {
      id: 'local-user',
      email: 'utilisateur@nextstep.local',
      user_metadata: { full_name: 'Utilisateur Local' }
    }
  },

  setLocalUser(email: string) {
    const user = {
      id: 'local-user',
      email: email || 'utilisateur@nextstep.local',
      user_metadata: { full_name: email.split('@')[0] }
    }
    setItem(KEYS.LOCAL_USER, user)
    return user
  },

  // --- JOBS ---
  getJobs(options?: { searchQuery?: string; typeContrat?: string; experienceRequise?: string }): Job[] {
    let jobs = getItem<Job[]>(KEYS.JOBS, [])
    
    // Initialisation avec quelques exemples si vide
    if (jobs.length === 0 && !localStorage.getItem('jm_initialized')) {
      localStorage.setItem('jm_initialized', 'true')
      jobs = [
        {
          id: generateId(),
          user_id: 'local-user',
          titre: 'Community Manager & Communication',
          entreprise: 'Speakeasy Spirits',
          url: 'https://speakeasyspirits.com',
          type_contrat: 'Stage',
          experience_requise: '0-1 an',
          version_cv: 'CV_Communication_2026.pdf',
          mots_cles: 'Social Media, Création de contenu, Instagram',
          notes: 'Offre importée avec le bookmarklet. Bonne ambiance annoncée.',
          statut_pipeline: 'Candidature envoyée',
          position_ordre: 0,
          date_ajout: new Date().toISOString(),
          date_derniere_action: new Date().toISOString(),
          date_envoi_candidature: new Date().toISOString(),
          description: "Gestion des réseaux sociaux et animation de la communauté.",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ]
      setItem(KEYS.JOBS, jobs)
    }

    if (options?.typeContrat) {
      jobs = jobs.filter(j => j.type_contrat === options.typeContrat)
    }
    if (options?.experienceRequise) {
      jobs = jobs.filter(j => j.experience_requise === options.experienceRequise)
    }
    if (options?.searchQuery?.trim()) {
      const q = options.searchQuery.toLowerCase().trim()
      jobs = jobs.filter(j => 
        j.titre.toLowerCase().includes(q) ||
        j.entreprise.toLowerCase().includes(q) ||
        j.mots_cles.toLowerCase().includes(q)
      )
    }

    return jobs.sort((a, b) => (a.position_ordre ?? 0) - (b.position_ordre ?? 0))
  },

  addJob(job: Omit<JobInsert, 'user_id'>): Job {
    const jobs = getItem<Job[]>(KEYS.JOBS, [])
    const now = new Date().toISOString()
    const newJob: Job = {
      ...job,
      id: job.id || generateId(),
      user_id: 'local-user',
      position_ordre: job.position_ordre ?? jobs.length,
      date_ajout: now,
      date_derniere_action: now,
      date_envoi_candidature: job.date_envoi_candidature || null,
      description: job.description || null,
      created_at: now,
      updated_at: now,
    } as Job

    jobs.push(newJob)
    setItem(KEYS.JOBS, jobs)
    return newJob
  },

  updateJob(id: string, updates: JobUpdate): Job {
    const jobs = getItem<Job[]>(KEYS.JOBS, [])
    const index = jobs.findIndex(j => j.id === id)
    if (index === -1) throw new Error('Offre introuvable')

    const updated: Job = {
      ...jobs[index],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    jobs[index] = updated
    setItem(KEYS.JOBS, jobs)
    return updated
  },

  deleteJob(id: string): void {
    const jobs = getItem<Job[]>(KEYS.JOBS, [])
    setItem(KEYS.JOBS, jobs.filter(j => j.id !== id))
  },

  moveJob(id: string, newStatus: PipelineStatus, newPosition: number): Job {
    return this.updateJob(id, {
      statut_pipeline: newStatus,
      position_ordre: newPosition,
      date_derniere_action: new Date().toISOString(),
    })
  },

  // --- CONTACTS ---
  getContacts(): Contact[] {
    return getItem<Contact[]>(KEYS.CONTACTS, []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  },

  addContact(contact: Omit<ContactInsert, 'user_id'>): Contact {
    const contacts = getItem<Contact[]>(KEYS.CONTACTS, [])
    const now = new Date().toISOString()
    const newContact: Contact = {
      ...contact,
      id: contact.id || generateId(),
      user_id: 'local-user',
      created_at: now,
      updated_at: now,
    } as Contact
    contacts.unshift(newContact)
    setItem(KEYS.CONTACTS, contacts)
    return newContact
  },

  updateContact(id: string, updates: ContactUpdate): Contact {
    const contacts = getItem<Contact[]>(KEYS.CONTACTS, [])
    const index = contacts.findIndex(c => c.id === id)
    if (index === -1) throw new Error('Contact introuvable')

    const updated: Contact = {
      ...contacts[index],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    contacts[index] = updated
    setItem(KEYS.CONTACTS, contacts)
    return updated
  },

  deleteContact(id: string): void {
    const contacts = getItem<Contact[]>(KEYS.CONTACTS, [])
    setItem(KEYS.CONTACTS, contacts.filter(c => c.id !== id))
  },

  // --- OFFRES SCRAPÉES / BOOKMARKLET ---
  getScrapedOffers(filters?: {
    source?: string
    contractType?: string
    search?: string
    bookmarkedOnly?: boolean
    page?: number
    pageSize?: number
  }): { offers: ScrapedOffer[]; totalCount: number } {
    let offers = getItem<ScrapedOffer[]>(KEYS.OFFERS, [])
    
    // Ignorer les offres archivées (dismissed)
    offers = offers.filter(o => !o.is_dismissed)

    if (filters?.source && filters.source !== 'all') {
      offers = offers.filter(o => (o.source || '').toLowerCase() === filters.source!.toLowerCase())
    }
    if (filters?.contractType && filters.contractType !== 'all') {
      offers = offers.filter(o => (o.type_contrat || '').toLowerCase() === filters.contractType!.toLowerCase())
    }
    if (filters?.bookmarkedOnly) {
      offers = offers.filter(o => o.is_bookmarked)
    }
    if (filters?.search?.trim()) {
      const q = filters.search.toLowerCase().trim()
      offers = offers.filter(o =>
        o.titre.toLowerCase().includes(q) ||
        o.entreprise.toLowerCase().includes(q) ||
        (o.localisation || '').toLowerCase().includes(q)
      )
    }

    const totalCount = offers.length
    const page = filters?.page ?? 1
    const pageSize = filters?.pageSize ?? 20
    const start = (page - 1) * pageSize
    const paginatedOffers = offers.slice(start, start + pageSize)

    return { offers: paginatedOffers, totalCount }
  },

  addScrapedOffer(offer: Omit<ScrapedOfferInsert, 'user_id'>): ScrapedOffer {
    const offers = getItem<ScrapedOffer[]>(KEYS.OFFERS, [])
    const now = new Date().toISOString()
    const newOffer: ScrapedOffer = {
      ...offer,
      id: offer.id || generateId(),
      user_id: 'local-user',
      is_bookmarked: offer.is_bookmarked ?? false,
      is_dismissed: offer.is_dismissed ?? false,
      created_at: now,
      updated_at: now,
    } as ScrapedOffer

    offers.unshift(newOffer)
    setItem(KEYS.OFFERS, offers)
    return newOffer
  },

  updateScrapedOffer(id: string, updates: Partial<ScrapedOffer>): ScrapedOffer {
    const offers = getItem<ScrapedOffer[]>(KEYS.OFFERS, [])
    const index = offers.findIndex(o => o.id === id)
    if (index === -1) throw new Error('Offre introuvable')

    const updated: ScrapedOffer = {
      ...offers[index],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    offers[index] = updated
    setItem(KEYS.OFFERS, offers)
    return updated
  },

  toggleBookmarkOffer(id: string): ScrapedOffer {
    const offers = getItem<ScrapedOffer[]>(KEYS.OFFERS, [])
    const index = offers.findIndex(o => o.id === id)
    if (index === -1) throw new Error('Offre introuvable')

    const updated = {
      ...offers[index],
      is_bookmarked: !offers[index].is_bookmarked,
      updated_at: new Date().toISOString(),
    }
    offers[index] = updated
    setItem(KEYS.OFFERS, offers)
    return updated
  },

  dismissOffer(id: string): void {
    const offers = getItem<ScrapedOffer[]>(KEYS.OFFERS, [])
    const index = offers.findIndex(o => o.id === id)
    if (index !== -1) {
      offers[index].is_dismissed = true
      offers[index].updated_at = new Date().toISOString()
      setItem(KEYS.OFFERS, offers)
    }
  },

  clearAllOffers(): void {
    setItem(KEYS.OFFERS, [])
  },

  importOfferToPipeline(offerId: string): Job {
    const offers = getItem<ScrapedOffer[]>(KEYS.OFFERS, [])
    const offer = offers.find(o => o.id === offerId)
    if (!offer) throw new Error('Offre introuvable')

    // Création dans les jobs
    const newJob = this.addJob({
      titre: offer.titre,
      entreprise: offer.entreprise,
      url: offer.url,
      type_contrat: (offer.type_contrat as any) || 'CDI',
      experience_requise: '-',
      version_cv: '',
      mots_cles: offer.localisation ? `Lieu: ${offer.localisation}` : '',
      notes: `Importé depuis l'onglet Offres (${offer.source || 'Scraper'}). Référence: ${offer.reference || '-'}`,
      statut_pipeline: 'Candidature envoyée',
      description: offer.description || '',
    })

    // Marquer l'offre comme importée
    this.updateScrapedOffer(offerId, {
      imported_job_id: newJob.id,
    })

    return newJob
  },

  // --- TEMPLATES DE PITCH ---
  getTemplates(): PitchTemplate[] {
    let templates = getItem<PitchTemplate[]>(KEYS.TEMPLATES, [])
    if (templates.length === 0) {
      const now = new Date().toISOString()
      templates = DEFAULT_TEMPLATES.map(t => ({
        ...t,
        id: generateId(),
        user_id: 'local-user',
        created_at: now,
        updated_at: now,
      }))
      setItem(KEYS.TEMPLATES, templates)
    }
    return templates
  },

  addTemplate(template: Omit<PitchTemplateInsert, 'user_id'>): PitchTemplate {
    const templates = getItem<PitchTemplate[]>(KEYS.TEMPLATES, [])
    const now = new Date().toISOString()
    const newTpl: PitchTemplate = {
      ...template,
      id: template.id || generateId(),
      user_id: 'local-user',
      created_at: now,
      updated_at: now,
    } as PitchTemplate
    templates.push(newTpl)
    setItem(KEYS.TEMPLATES, templates)
    return newTpl
  },

  updateTemplate(id: string, updates: PitchTemplateUpdate): PitchTemplate {
    const templates = getItem<PitchTemplate[]>(KEYS.TEMPLATES, [])
    const index = templates.findIndex(t => t.id === id)
    if (index === -1) throw new Error('Template introuvable')
    const updated = {
      ...templates[index],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    templates[index] = updated
    setItem(KEYS.TEMPLATES, templates)
    return updated
  },

  deleteTemplate(id: string): void {
    const templates = getItem<PitchTemplate[]>(KEYS.TEMPLATES, [])
    setItem(KEYS.TEMPLATES, templates.filter(t => t.id !== id))
  },

  // --- EXPORT & IMPORT DE SECOURS (JSON) ---
  exportAllData(): string {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      jobs: getItem(KEYS.JOBS, []),
      contacts: getItem(KEYS.CONTACTS, []),
      offers: getItem(KEYS.OFFERS, []),
      templates: getItem(KEYS.TEMPLATES, []),
    }
    return JSON.stringify(data, null, 2)
  },

  importAllData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString)
      if (data.jobs && Array.isArray(data.jobs)) setItem(KEYS.JOBS, data.jobs)
      if (data.contacts && Array.isArray(data.contacts)) setItem(KEYS.CONTACTS, data.contacts)
      if (data.offers && Array.isArray(data.offers)) setItem(KEYS.OFFERS, data.offers)
      if (data.templates && Array.isArray(data.templates)) setItem(KEYS.TEMPLATES, data.templates)
      return true
    } catch (e) {
      console.error('Erreur import JSON:', e)
      return false
    }
  }
}
