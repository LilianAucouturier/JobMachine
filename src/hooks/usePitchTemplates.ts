import { useState, useEffect, useCallback } from 'react'
import { localDb } from '../lib/localDb'
import type { PitchTemplate, PitchTemplateInsert, PitchTemplateUpdate } from '../types/database'

export function usePitchTemplates() {
  const [templates, setTemplates] = useState<PitchTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTemplates = useCallback(() => {
    try {
      setLoading(true)
      const data = localDb.getTemplates()
      setTemplates(data)
      setError(null)
    } catch (err: any) {
      console.error('Erreur chargement local des templates:', err)
      setError(err instanceof Error ? err : new Error('Erreur templates'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const initializeDefaults = useCallback(async () => {
    setTemplates(localDb.getTemplates())
  }, [])

  const addTemplate = useCallback(async (template: Omit<PitchTemplateInsert, 'user_id'>) => {
    const newTpl = localDb.addTemplate(template)
    setTemplates((prev) => [...prev, newTpl])
    return newTpl
  }, [])

  const updateTemplate = useCallback(async (id: string, updates: PitchTemplateUpdate) => {
    const updated = localDb.updateTemplate(id, updates)
    setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)))
    return updated
  }, [])

  const deleteTemplate = useCallback(async (id: string) => {
    localDb.deleteTemplate(id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const generatePitch = useCallback((templateContent: string, contact: { nom: string; entreprise: string; poste: string }) => {
    return templateContent
      .replace(/\[Nom\]/g, contact.nom)
      .replace(/\[Entreprise\]/g, contact.entreprise)
      .replace(/\[Poste\]/g, contact.poste)
  }, [])

  return {
    templates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    generatePitch,
    initializeDefaults,
    refetch: fetchTemplates,
  }
}
