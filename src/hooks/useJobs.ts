import { useState, useEffect, useCallback } from 'react'
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

  const fetchJobs = useCallback(() => {
    try {
      setLoading(true)
      const data = localDb.getJobs(options)
      setJobs(data)
      setError(null)
    } catch (err: any) {
      console.error('Erreur chargement local des jobs:', err)
      setError(err?.message || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }, [options.searchQuery, options.typeContrat, options.experienceRequise])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const addJob = useCallback(async (job: Omit<JobInsert, 'user_id'>) => {
    const newJob = localDb.addJob(job)
    setJobs((prev) => [...prev, newJob])
    return newJob
  }, [])

  const updateJob = useCallback(async (id: string, updates: JobUpdate) => {
    const updated = localDb.updateJob(id, updates)
    setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)))
    return updated
  }, [])

  const deleteJob = useCallback(async (id: string) => {
    localDb.deleteJob(id)
    setJobs((prev) => prev.filter((j) => j.id !== id))
  }, [])

  const moveJob = useCallback(async (id: string, newStatus: PipelineStatus, newPosition: number) => {
    const updated = localDb.moveJob(id, newStatus, newPosition)
    setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)))
    return updated
  }, [])

  return { jobs, loading, error, addJob, updateJob, deleteJob, moveJob, refetch: fetchJobs }
}
