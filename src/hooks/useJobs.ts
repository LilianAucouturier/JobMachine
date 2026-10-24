import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localDb } from '../lib/localDb'
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

      if (localDb.isLocalMode()) {
        const localData = localDb.getJobs(options)
        setJobs(localData)
        setError(null)
        return
      }

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
      console.warn('Erreur chargement Supabase, fallback local pour les jobs:', err)
      const localData = localDb.getJobs(options)
      setJobs(localData)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [options.searchQuery, options.typeContrat, options.experienceRequise])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const addJob = useCallback(async (job: Omit<JobInsert, 'user_id'>) => {
    if (localDb.isLocalMode()) {
      const newJob = localDb.addJob(job)
      setJobs((prev) => [...prev, newJob])
      return newJob
    }

    try {
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
    } catch {
      const newJob = localDb.addJob(job)
      setJobs((prev) => [...prev, newJob])
      return newJob
    }
  }, [])

  const updateJob = useCallback(async (id: string, updates: JobUpdate) => {
    if (localDb.isLocalMode()) {
      const updated = localDb.updateJob(id, updates)
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)))
      return updated
    }

    try {
      const { data, error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setJobs((prev) => prev.map((j) => (j.id === id ? data : j)))
      return data
    } catch {
      const updated = localDb.updateJob(id, updates)
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)))
      return updated
    }
  }, [])

  const deleteJob = useCallback(async (id: string) => {
    if (localDb.isLocalMode()) {
      localDb.deleteJob(id)
      setJobs((prev) => prev.filter((j) => j.id !== id))
      return
    }

    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id)
      if (error) throw error
      setJobs((prev) => prev.filter((j) => j.id !== id))
    } catch {
      localDb.deleteJob(id)
      setJobs((prev) => prev.filter((j) => j.id !== id))
    }
  }, [])

  const moveJob = useCallback(async (id: string, newStatus: PipelineStatus, newPosition: number) => {
    if (localDb.isLocalMode()) {
      const updated = localDb.moveJob(id, newStatus, newPosition)
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)))
      return updated
    }

    try {
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
    } catch {
      const updated = localDb.moveJob(id, newStatus, newPosition)
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)))
      return updated
    }
  }, [])

  return { jobs, loading, error, addJob, updateJob, deleteJob, moveJob, refetch: fetchJobs }
}
