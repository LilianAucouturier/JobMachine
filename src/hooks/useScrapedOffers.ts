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

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('scraped_offers')
        .select('*', { count: 'exact' })
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })

      if (options.typeContrat) {
        query = query.eq('type_contrat', options.typeContrat)
      }
      if (options.source) {
        query = query.eq('source', options.source)
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
      setLoading(false)
    }
  }, [options.searchQuery, options.typeContrat, options.experienceRequise, options.localisation, options.source, options.showBookmarkedOnly])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  const addOffer = useCallback(async (offer: Omit<ScrapedOfferInsert, 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const { data, error } = await supabase
      .from('scraped_offers')
      .insert({ ...offer, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    setOffers((prev) => [data, ...prev])
    setTotalCount((prev) => prev + 1)
    return data
  }, [])

  const toggleBookmark = useCallback(async (id: string) => {
    const offer = offers.find((o) => o.id === id)
    if (!offer) return

    const { data, error } = await supabase
      .from('scraped_offers')
      .update({ is_bookmarked: !offer.is_bookmarked })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setOffers((prev) => prev.map((o) => (o.id === id ? data : o)))
  }, [offers])

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
    const offer = offers.find((o) => o.id === id)
    if (!offer) throw new Error('Offre introuvable')

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
        type_contrat: (['CDI', 'CDD', 'Alternance', 'Stage'].includes(offer.type_contrat)
          ? offer.type_contrat
          : 'CDI') as 'CDI' | 'CDD' | 'Alternance' | 'Stage',
        experience_requise: (['0-1 an', '1-3 ans', '3-5 ans', '5+ ans'].includes(offer.experience_requise)
          ? offer.experience_requise
          : '0-1 an') as '0-1 an' | '1-3 ans' | '3-5 ans' | '5+ ans',
        version_cv: '',
        mots_cles: offer.mots_cles,
        notes: `Importé depuis ${offer.source}${offer.localisation ? ' — ' + offer.localisation : ''}`,
        statut_pipeline: 'Offres à analyser' as const,
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
  }, [offers])

  const deleteOffer = useCallback(async (id: string) => {
    const { error } = await supabase.from('scraped_offers').delete().eq('id', id)
    if (error) throw error
    setOffers((prev) => prev.filter((o) => o.id !== id))
    setTotalCount((prev) => prev - 1)
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
    refetch: fetchOffers,
  }
}
