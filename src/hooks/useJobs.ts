import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Job, JobInsert, JobUpdate, PipelineStatus } from '../types/database'

interface UseJobsOptions {
  searchQuery?: string
  typeContrat?: string
  experienceRequise?: string
}

export function useJobs(options: UseJobsOptions = {}) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('jobs')
        .select('*')
        .order('position_ordre', { ascending: true })

      if (options.typeContrat) {
        query = query.eq('type_contrat', options.typeContrat)
      }
      if (options.experienceRequise) {
        query = query.eq('experience_requise', options.experienceRequise)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      let filteredData = data || []

      // Client-side search filtering for more flexibility
      if (options.searchQuery && options.searchQuery.trim()) {
        const search = options.searchQuery.toLowerCase().trim()
        filteredData = filteredData.filter(
          (job) =>
            job.titre.toLowerCase().includes(search) ||
            job.entreprise.toLowerCase().includes(search) ||
            job.mots_cles.toLowerCase().includes(search) ||
            job.version_cv.toLowerCase().includes(search)
        )
      }

      setJobs(filteredData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [options.searchQuery, options.typeContrat, options.experienceRequise])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const addJob = useCallback(async (job: Omit<JobInsert, 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const { data, error } = await supabase
      .from('jobs')
      .insert({ ...job, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    setJobs((prev) => [...prev, data])
    return data
  }, [])

  const updateJob = useCallback(async (id: string, updates: JobUpdate) => {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setJobs((prev) => prev.map((j) => (j.id === id ? data : j)))
    return data
  }, [])

  const deleteJob = useCallback(async (id: string) => {
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) throw error
    setJobs((prev) => prev.filter((j) => j.id !== id))
  }, [])

  const moveJob = useCallback(async (id: string, newStatus: PipelineStatus, newPosition: number) => {
    const { data, error } = await supabase
      .from('jobs')
      .update({
        statut_pipeline: newStatus,
        position_ordre: newPosition,
        date_derniere_action: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setJobs((prev) => prev.map((j) => (j.id === id ? data : j)))
    return data
  }, [])

  return { jobs, loading, error, addJob, updateJob, deleteJob, moveJob, refetch: fetchJobs }
}
