import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useScrapedOffers } from '../hooks/useScrapedOffers'
import { OffersFilters } from '../components/offers/OffersFilters'
import { OfferRow } from '../components/offers/OfferRow'
import { AddOfferModal } from '../components/offers/AddOfferModal'
import { BookmarkletBanner } from '../components/offers/BookmarkletBanner'

export function OffresPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeContrat, setTypeContrat] = useState('')
  const [experienceRequise, setExperienceRequise] = useState('')
  const [source, setSource] = useState('')
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()

  const {
    offers,
    loading,
    totalCount,
    addOffer,
    toggleBookmark,
    dismissOffer,
    importToPipeline,
    refetch,
  } = useScrapedOffers({
    searchQuery: useMemo(() => searchQuery, [searchQuery]),
    typeContrat: useMemo(() => typeContrat, [typeContrat]),
    experienceRequise: useMemo(() => experienceRequise, [experienceRequise]),
    source: useMemo(() => source, [source]),
    showBookmarkedOnly: useMemo(() => showBookmarkedOnly, [showBookmarkedOnly]),
  })

  // Handle bookmarklet import via URL params
  useEffect(() => {
    const isImport = searchParams.get('import')
    const autoclose = searchParams.get('autoclose')

    if (isImport === 'true') {
      const titre = searchParams.get('titre') || ''
      const entreprise = searchParams.get('entreprise') || ''
      const url = searchParams.get('url') || ''
      const offerSource = searchParams.get('source') || 'bookmarklet'
      const localisation = searchParams.get('localisation') || ''

      if (titre) {
        addOffer({
          titre: decodeURIComponent(titre),
          entreprise: decodeURIComponent(entreprise),
          url: decodeURIComponent(url),
          localisation: decodeURIComponent(localisation),
          type_contrat: '',
          experience_requise: '',
          reference: '',
          mots_cles: '',
          source: offerSource,
        }).then(() => {
          // Notify other tabs
          localStorage.setItem('jobmachine_new_import', Date.now().toString() + '|' + decodeURIComponent(titre))
          
          if (autoclose === 'true') {
            window.close()
          } else {
            setImportSuccess(decodeURIComponent(titre))
            setTimeout(() => setImportSuccess(null), 4000)
            setSearchParams({}, { replace: true })
          }
        }).catch(() => {
          if (autoclose === 'true') window.close()
        })
      } else if (autoclose !== 'true') {
        // Clear URL params
        setSearchParams({}, { replace: true })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for imports from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'jobmachine_new_import' && e.newValue) {
        const [, title] = e.newValue.split('|')
        if (title) {
          setImportSuccess(title)
          setTimeout(() => setImportSuccess(null), 4000)
        }
        refetch()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [refetch])

  const handleImport = async (id: string) => {
    try {
      await importToPipeline(id)
      const offer = offers.find((o) => o.id === id)
      if (offer) {
        setImportSuccess(offer.titre)
        setTimeout(() => setImportSuccess(null), 4000)
      }
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Offres</h2>
          <p className="text-sm text-slate-500 mt-1">
            {offers.length} offre{offers.length !== 1 ? 's' : ''} trouvée{offers.length !== 1 ? 's' : ''}
            {totalCount > offers.length && ` sur ${totalCount}`}
          </p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium shadow-md shadow-primary-200/50 hover:shadow-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Ajouter une offre
        </button>
      </div>

      {/* Success toast */}
      {importSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-success-50 border border-success-200 text-success-700 text-sm font-medium animate-slide-in">
          <span>✓</span>
          <span>
            <strong>{importSuccess}</strong> a été importée dans le Pipeline !
          </span>
        </div>
      )}

      {/* Bookmarklet banner */}
      <BookmarkletBanner />

      {/* Filters */}
      <OffersFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeContrat={typeContrat}
        onTypeContratChange={setTypeContrat}
        experienceRequise={experienceRequise}
        onExperienceChange={setExperienceRequise}
        source={source}
        onSourceChange={setSource}
        showBookmarkedOnly={showBookmarkedOnly}
        onToggleBookmarked={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
      />

      {/* Offers list */}
      {offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <h3 className="text-base font-semibold text-slate-700">Aucune offre pour le moment</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Ajoutez des offres manuellement ou utilisez le bookmarklet pour importer depuis LinkedIn, WTTJ, Indeed...
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {offers.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              onToggleBookmark={toggleBookmark}
              onImport={handleImport}
              onDismiss={dismissOffer}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      <AddOfferModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={addOffer}
      />
    </div>
  )
}
