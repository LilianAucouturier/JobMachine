import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useScrapedOffers } from '../hooks/useScrapedOffers'
import { OffersFilters } from '../components/offers/OffersFilters'
import { OfferRow } from '../components/offers/OfferRow'
import { AddOfferModal } from '../components/offers/AddOfferModal'
import { ViewOfferModal } from '../components/offers/ViewOfferModal'
import { BookmarkletBanner } from '../components/offers/BookmarkletBanner'
import type { ScrapedOffer } from '../types/database'

export function OffresPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeContrat, setTypeContrat] = useState('')
  const [experienceRequise, setExperienceRequise] = useState('')
  const [source, setSource] = useState('')
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [viewOffer, setViewOffer] = useState<ScrapedOffer | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()

  const [isClosing, setIsClosing] = useState(false)
  const [scrapeKeywords, setScrapeKeywords] = useState('')
  const [scrapeLocation, setScrapeLocation] = useState('')
  const [scrapeDate, setScrapeDate] = useState('r86400') // Default 24h
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null)

  const {
    offers,
    loading,
    totalCount,
    addOffer,
    toggleBookmark,
    dismissOffer,
    importToPipeline,
    clearAllOffers,
    triggerScraper,
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
    const isImportBatch = searchParams.get('import_batch')
    const isImport = searchParams.get('import')
    const autoclose = searchParams.get('autoclose')

    if (isImportBatch === 'true') {
      try {
        const hash = window.location.hash
        if (hash.startsWith('#batch=')) {
          const batchData = hash.substring(7)
          const jobs = JSON.parse(decodeURIComponent(batchData))
          if (Array.isArray(jobs) && jobs.length > 0) {
            setIsClosing(true)
            Promise.all(jobs.map((job: any) => addOffer({
              titre: job.title || '',
              entreprise: job.company || '',
              url: job.url || '',
              localisation: job.location || '',
              type_contrat: '',
              experience_requise: '',
              reference: '',
              mots_cles: '',
              source: job.source || 'bookmarklet',
              description: job.description || null,
            }))).then(() => {
              localStorage.setItem('jobmachine_new_import', Date.now().toString() + '|' + jobs.length + ' offres importées')
              window.close()
              setTimeout(() => window.close(), 500)
            }).catch(() => {
              window.close()
            })
          }
        }
      } catch (e) {
        console.error("Erreur parsing batch data", e)
      }
      return
    }

    if (isImport === 'true') {
      const titre = searchParams.get('titre') || ''
      const entreprise = searchParams.get('entreprise') || ''
      const url = searchParams.get('url') || ''
      const offerSource = searchParams.get('source') || 'bookmarklet'
      const localisation = searchParams.get('localisation') || ''

      if (titre) {
        if (autoclose === 'true') setIsClosing(true)
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
            // Si le navigateur bloque window.close(), on laisse l'état isClosing à true
            setTimeout(() => window.close(), 500)
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

  const handleScrape = async () => {
    if (!scrapeKeywords) return
    try {
      setIsScraping(true)
      setScrapeMessage(null)
      const data = await triggerScraper(scrapeKeywords, scrapeLocation, 10, scrapeDate === 'all' ? '' : scrapeDate)
      
      if (data?.message && data.message.includes('Erreurs')) {
        setScrapeMessage(data.message)
      } else {
        setScrapeMessage("Le robot est lancé ! Les offres apparaîtront d'ici 1 à 2 minutes. Vous pouvez continuer à utiliser l'application.")
      }
      setScrapeKeywords('')
      setScrapeLocation('')
    } catch (err: any) {
      setScrapeMessage(`Erreur: ${err.message}`)
    } finally {
      setIsScraping(false)
    }
  }

  if (isClosing) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in">
        <div className="w-16 h-16 bg-success-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-success-500/50">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Offre sauvegardée !</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-8">
          L'offre a été ajoutée à JobMachine. Ce navigateur a bloqué la fermeture automatique de l'onglet.
        </p>
        <button
          onClick={() => window.close()}
          className="px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold shadow-xl hover:bg-slate-100 transition-colors"
        >
          Fermer cet onglet
        </button>
      </div>
    )
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
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (window.confirm('Voulez-vous vraiment supprimer TOUTES les offres (anti-doublon compris) ?')) {
                try {
                  await clearAllOffers();
                } catch (err) {
                  alert("Erreur lors de la suppression.");
                }
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Vider l'anti-doublon
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium shadow-md shadow-primary-200/50 hover:shadow-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Ajouter une offre
          </button>
        </div>
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

      {/* Scraper UI */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-slate-800">Scraper automatique</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Mots-clés (ex: Développeur React)"
            value={scrapeKeywords}
            onChange={(e) => setScrapeKeywords(e.target.value)}
            className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
          <input
            type="text"
            placeholder="Lieu (ex: Paris)"
            value={scrapeLocation}
            onChange={(e) => setScrapeLocation(e.target.value)}
            className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
          <select
            value={scrapeDate}
            onChange={(e) => setScrapeDate(e.target.value)}
            className="w-full sm:w-40 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all appearance-none"
          >
            <option value="r86400">Dernières 24h</option>
            <option value="r604800">Dernière semaine</option>
            <option value="r2592000">Dernier mois</option>
            <option value="all">Peu importe</option>
          </select>
          <button
            onClick={handleScrape}
            disabled={!scrapeKeywords || isScraping}
            className="h-11 px-6 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex items-center gap-2 justify-center"
          >
            {isScraping ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Lancement...
              </>
            ) : (
              'Lancer le robot'
            )}
          </button>
        </div>
        {scrapeMessage && (
          <div className={`p-3 rounded-xl text-sm ${scrapeMessage.startsWith('Erreur') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
            {scrapeMessage}
          </div>
        )}
      </div>

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
              onView={setViewOffer}
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

      {/* View modal */}
      <ViewOfferModal
        isOpen={!!viewOffer}
        onClose={() => setViewOffer(null)}
        offer={viewOffer}
      />
    </div>
  )
}
