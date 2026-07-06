import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
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

  const fetchOffers = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      let query = supabase
        .from('scraped_offers')
        .select('*', { count: 'exact' })
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })

      if (options.typeContrat) {
        query = query.eq('type_contrat', options.typeContrat)
      }
      if (options.source) {
        query = query.ilike('source', `%${options.source}%`)
      }
      if (options.showBookmarkedOnly) {
        query = query.eq('is_bookmarked', true)
      }

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      let filteredData = data || []

      // Client-side filtering for flexible text search
      if (options.searchQuery && options.searchQuery.trim()) {
        const search = options.searchQuery.toLowerCase().trim()
        filteredData = filteredData.filter(
          (offer) =>
            offer.titre.toLowerCase().includes(search) ||
            offer.entreprise.toLowerCase().includes(search) ||
            offer.mots_cles.toLowerCase().includes(search) ||
            offer.localisation.toLowerCase().includes(search)
        )
      }

      if (options.experienceRequise) {
        filteredData = filteredData.filter(
          (offer) => offer.experience_requise === options.experienceRequise
        )
      }

      if (options.localisation && !options.searchQuery) {
        const loc = options.localisation.toLowerCase().trim()
        filteredData = filteredData.filter(
          (offer) => offer.localisation.toLowerCase().includes(loc)
        )
      }

      setOffers(filteredData)
      setTotalCount(count || filteredData.length)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [options.searchQuery, options.typeContrat, options.experienceRequise, options.localisation, options.source, options.showBookmarkedOnly])

  useEffect(() => {
    fetchOffers()
    
    // Auto-refresh en arrière-plan toutes les 15 secondes
    const intervalId = setInterval(() => {
      fetchOffers(true)
    }, 15000)
    
    return () => clearInterval(intervalId)
  }, [fetchOffers])

  const addOffer = useCallback(async (offer: Omit<ScrapedOfferInsert, 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const { data, error } = await supabase
      .from('scraped_offers')
      .insert({ ...offer, user_id: user.id })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }
    setOffers((prev) => [data, ...prev])
    setTotalCount((prev) => prev + 1)
    return data
  }, [])

  const toggleBookmark = useCallback(async (id: string) => {
    // First, get the current bookmark state from Supabase to avoid stale closure
    const { data: currentOffer, error: fetchErr } = await supabase
      .from('scraped_offers')
      .select('is_bookmarked')
      .eq('id', id)
      .single()

    if (fetchErr || !currentOffer) return

    const { data, error } = await supabase
      .from('scraped_offers')
      .update({ is_bookmarked: !currentOffer.is_bookmarked })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setOffers((prev) => prev.map((o) => (o.id === id ? data : o)))
  }, [])

  const dismissOffer = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('scraped_offers')
      .update({ is_dismissed: true })
      .eq('id', id)

    if (error) throw error
    setOffers((prev) => prev.filter((o) => o.id !== id))
    setTotalCount((prev) => prev - 1)
  }, [])

  const importToPipeline = useCallback(async (id: string) => {
    // Fetch offer directly from DB to avoid stale closure
    const { data: offer, error: offerErr } = await supabase
      .from('scraped_offers')
      .select('*')
      .eq('id', id)
      .single()

    if (offerErr || !offer) throw new Error('Offre introuvable')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    // Create job in pipeline
    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        titre: offer.titre,
        entreprise: offer.entreprise,
        url: offer.url,
        type_contrat: (['CDI', 'CDD', 'Alternance', 'Stage', 'Freelance'].includes(offer.type_contrat)
          ? offer.type_contrat
          : 'CDI') as 'CDI' | 'CDD' | 'Alternance' | 'Stage' | 'Freelance',
        experience_requise: (['0-1 an', '1-3 ans', '3-5 ans', '5+ ans'].includes(offer.experience_requise)
          ? offer.experience_requise
          : '0-1 an') as '0-1 an' | '1-3 ans' | '3-5 ans' | '5+ ans',
        version_cv: '',
        mots_cles: offer.mots_cles,
        notes: `Importé depuis ${offer.source}${offer.localisation ? ' — ' + offer.localisation : ''}`,
        statut_pipeline: 'Candidature envoyée' as const,
        description: offer.description || null,
      })
      .select()
      .single()

    if (jobError) throw jobError

    // Mark offer as imported
    const { error: updateError } = await supabase
      .from('scraped_offers')
      .update({ imported_job_id: newJob.id })
      .eq('id', id)

    if (updateError) throw updateError

    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, imported_job_id: newJob.id } : o))
    )

    return newJob
  }, [])

  const deleteOffer = useCallback(async (id: string) => {
    const { error } = await supabase.from('scraped_offers').delete().eq('id', id)
    if (error) throw error
    setOffers((prev) => prev.filter((o) => o.id !== id))
    setTotalCount((prev) => prev - 1)
  }, [])

  const clearAllOffers = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const { error } = await supabase
      .from('scraped_offers')
      .delete()
      .eq('user_id', user.id)

    if (error) throw error
    setOffers([])
    setTotalCount(0)
  }, [])

  const triggerScraper = useCallback(async (keywords: string, location: string, maxResults: number = 10, publishedAt: string = '') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        keywords,
        location,
        userId: user.id,
        maxResults,
        publishedAt: publishedAt || undefined
      })
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => null)
      throw new Error(errData?.error || 'Erreur lors du lancement du scraper')
    }

    return response.json()
  }, [])

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
    refetch: fetchOffers,
  }
}
