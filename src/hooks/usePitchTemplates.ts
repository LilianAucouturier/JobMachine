import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { PitchTemplate, PitchTemplateInsert, PitchTemplateUpdate } from '../types/database'

const DEFAULT_TEMPLATES = [
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

export function usePitchTemplates() {
  const [templates, setTemplates] = useState<PitchTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pitch_templates')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setTemplates(data || [])
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const initializeDefaults = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existing } = await supabase
      .from('pitch_templates')
      .select('id')
      .limit(1)

    if (existing && existing.length > 0) return

    const inserts: PitchTemplateInsert[] = DEFAULT_TEMPLATES.map((t) => ({
      ...t,
      user_id: user.id,
    }))

    const { data, error } = await supabase
      .from('pitch_templates')
      .insert(inserts)
      .select()

    if (!error && data) {
      setTemplates(data)
    }
  }, [])

  const addTemplate = useCallback(async (template: Omit<PitchTemplateInsert, 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const { data, error } = await supabase
      .from('pitch_templates')
      .insert({ ...template, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    setTemplates((prev) => [...prev, data])
    return data
  }, [])

  const updateTemplate = useCallback(async (id: string, updates: PitchTemplateUpdate) => {
    const { data, error } = await supabase
      .from('pitch_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setTemplates((prev) => prev.map((t) => (t.id === id ? data : t)))
    return data
  }, [])

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from('pitch_templates').delete().eq('id', id)
    if (error) throw error
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const generatePitch = useCallback((templateContent: string, contact: { nom: string; entreprise: string; poste: string }) => {
    return templateContent
      .replace(/\[Nom\]/g, contact.nom)
      .replace(/\[Entreprise\]/g, contact.entreprise)
      .replace(/\[Poste\]/g, contact.poste)
  }, [])

  return { templates, loading, addTemplate, updateTemplate, deleteTemplate, generatePitch, initializeDefaults, refetch: fetchTemplates }
}
