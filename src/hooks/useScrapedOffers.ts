import { useState, useEffect, useCallback } from 'react'
import { localDb } from '../lib/localDb'
import type { ScrapedOffer, ScrapedOfferInsert } from '../types/database'

interface UseScrapedOffersOptions {
  searchQuery?: string
  typeContrat?: string
  experienceRequise?: string
  localisation?: string
  source?: string
  showBookmarkedOnly?: boolean
}

export function useScrapedOffers(options: UseScrapedOffersOptions = {}) {
  const [offers, setOffers] = useState<ScrapedOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const fetchOffers = useCallback((silent = false) => {
    try {
      if (!silent) setLoading(true)
      const result = localDb.getScrapedOffers({
        source: options.source,
        contractType: options.typeContrat,
        search: options.searchQuery || options.localisation,
        bookmarkedOnly: options.showBookmarkedOnly,
      })

      let filtered = result.offers
      if (options.experienceRequise) {
        filtered = filtered.filter((o) => o.experience_requise === options.experienceRequise)
      }

      setOffers(filtered)
      setTotalCount(filtered.length)
      setError(null)
    } catch (err: any) {
      console.error('Erreur chargement local des offres:', err)
      setError(err?.message || 'Erreur chargement offres')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [
    options.searchQuery,
    options.typeContrat,
    options.experienceRequise,
    options.localisation,
    options.source,
    options.showBookmarkedOnly,
  ])

  useEffect(() => {
    fetchOffers()
    const intervalId = setInterval(() => {
      fetchOffers(true)
    }, 15000)
    return () => clearInterval(intervalId)
  }, [fetchOffers])

  const addOffer = useCallback(async (offer: Omit<ScrapedOfferInsert, 'user_id'>) => {
    const newOffer = localDb.addScrapedOffer(offer)
    setOffers((prev) => [newOffer, ...prev])
    setTotalCount((prev) => prev + 1)
    return newOffer
  }, [])

  const updateOffer = useCallback(async (id: string, updates: Partial<ScrapedOffer>) => {
    const updated = localDb.updateScrapedOffer(id, updates)
    setOffers((prev) => prev.map((o) => (o.id === id ? updated : o)))
    return updated
  }, [])

  const toggleBookmark = useCallback(async (id: string) => {
    const updated = localDb.toggleBookmarkOffer(id)
    setOffers((prev) => prev.map((o) => (o.id === id ? updated : o)))
  }, [])

  const dismissOffer = useCallback(async (id: string) => {
    localDb.dismissOffer(id)
    setOffers((prev) => prev.filter((o) => o.id !== id))
    setTotalCount((prev) => Math.max(0, prev - 1))
  }, [])

  const importToPipeline = useCallback(async (id: string) => {
    const newJob = localDb.importOfferToPipeline(id)
    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, imported_job_id: newJob.id } : o))
    )
    return newJob
  }, [])

  const deleteOffer = useCallback(async (id: string) => {
    localDb.dismissOffer(id)
    setOffers((prev) => prev.filter((o) => o.id !== id))
    setTotalCount((prev) => Math.max(0, prev - 1))
  }, [])

  const clearAllOffers = useCallback(async () => {
    localDb.clearAllOffers()
    setOffers([])
    setTotalCount(0)
  }, [])

  const triggerScraper = useCallback(
    async (
      keywords: string,
      location: string,
      maxResults: number = 10,
      publishedAt: string = ''
    ) => {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords,
          location,
          userId: 'local-user',
          maxResults,
          publishedAt: publishedAt || undefined,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.error || 'Erreur lors du lancement du scraper')
      }

      const data = await response.json()
      // Si le scraper renvoie des offres, on peut les ajouter localement
      if (Array.isArray(data?.offers)) {
        for (const o of data.offers) {
          localDb.addScrapedOffer(o)
        }
        fetchOffers()
      }
      return data
    },
    [fetchOffers]
  )

  return {
    offers,
    loading,
    error,
    totalCount,
    addOffer,
    toggleBookmark,
    dismissOffer,
    importToPipeline,
    deleteOffer,
    clearAllOffers,
    triggerScraper,
    updateOffer,
    refetch: fetchOffers,
  }
}
