import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localDb } from '../lib/localDb'
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
  const [error, setError] = useState<Error | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)

      if (localDb.isLocalMode()) {
        const localData = localDb.getTemplates()
        setTemplates(localData)
        setError(null)
        return
      }

      const { data, error } = await supabase
        .from('pitch_templates')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setTemplates(data || [])
      setError(null)
    } catch (err) {
      console.warn('Erreur chargement Supabase templates, fallback local:', err)
      const localData = localDb.getTemplates()
      setTemplates(localData)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const initializeDefaults = useCallback(async () => {
    if (localDb.isLocalMode()) {
      setTemplates(localDb.getTemplates())
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: existing, error: checkError } = await supabase
        .from('pitch_templates')
        .select('id')
        .limit(1)

      if (checkError) throw checkError
      if (existing && existing.length > 0) return

      const inserts: PitchTemplateInsert[] = DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        user_id: user.id,
      }))

      const { data, error } = await supabase
        .from('pitch_templates')
        .insert(inserts)
        .select()

      if (error) throw error
      if (data) setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize defaults'))
    }
  }, [])

  const addTemplate = useCallback(async (template: Omit<PitchTemplateInsert, 'user_id'>) => {
    if (localDb.isLocalMode()) {
      const newTpl = localDb.addTemplate(template)
      setTemplates((prev) => [...prev, newTpl])
      return newTpl
    }

    try {
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
    } catch {
      const newTpl = localDb.addTemplate(template)
      setTemplates((prev) => [...prev, newTpl])
      return newTpl
    }
  }, [])

  const updateTemplate = useCallback(async (id: string, updates: PitchTemplateUpdate) => {
    if (localDb.isLocalMode()) {
      const updated = localDb.updateTemplate(id, updates)
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)))
      return updated
    }

    try {
      const { data, error } = await supabase
        .from('pitch_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setTemplates((prev) => prev.map((t) => (t.id === id ? data : t)))
      return data
    } catch {
      const updated = localDb.updateTemplate(id, updates)
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)))
      return updated
    }
  }, [])

  const deleteTemplate = useCallback(async (id: string) => {
    if (localDb.isLocalMode()) {
      localDb.deleteTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      return
    }

    try {
      const { error } = await supabase.from('pitch_templates').delete().eq('id', id)
      if (error) throw error
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch {
      localDb.deleteTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    }
  }, [])

  const generatePitch = useCallback((templateContent: string, contact: { nom: string; entreprise: string; poste: string }) => {
    return templateContent
      .replace(/\[Nom\]/g, contact.nom)
      .replace(/\[Entreprise\]/g, contact.entreprise)
      .replace(/\[Poste\]/g, contact.poste)
  }, [])

  return { templates, loading, error, addTemplate, updateTemplate, deleteTemplate, generatePitch, initializeDefaults, refetch: fetchTemplates }
}
