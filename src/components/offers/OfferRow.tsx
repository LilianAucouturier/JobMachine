import { Heart, ExternalLink, ArrowRight, X, MapPin, Building2, Calendar } from 'lucide-react'
import type { ScrapedOffer } from '../../types/database'
import { cn, formatDate } from '../../lib/utils'

interface OfferRowProps {
  offer: ScrapedOffer
  onToggleBookmark: (id: string) => void
  onImport: (id: string) => void
  onDismiss: (id: string) => void
  onView?: (offer: ScrapedOffer) => void
}

const sourceBadgeColors: Record<string, string> = {
  linkedin: 'bg-blue-100 text-blue-700',
  wttj: 'bg-amber-100 text-amber-800',
  indeed: 'bg-primary-100 text-primary-800',
  manuel: 'bg-warm-100 text-slate-700',
  apify: 'bg-emerald-100 text-emerald-700',
  bookmarklet: 'bg-coral-100 text-coral-800 font-semibold',
}

const sourceLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  wttj: 'WTTJ',
  indeed: 'Indeed',
  manuel: 'Manuel',
  apify: 'Apify',
  bookmarklet: 'Bookmarklet',
}

const contractBadgeColors: Record<string, string> = {
  CDI: 'bg-emerald-100 text-emerald-800',
  CDD: 'bg-primary-100 text-primary-800',
  Alternance: 'bg-sage-200/80 text-teal-900',
  Stage: 'bg-amber-100 text-amber-800',
  Freelance: 'bg-coral-100 text-coral-800',
}

export function OfferRow({ offer, onToggleBookmark, onImport, onDismiss, onView }: OfferRowProps) {
  const isImported = !!offer.imported_job_id

  return (
    <div
      onClick={() => onView && onView(offer)}
      className={cn(
        'bg-white rounded-xl border border-warm-200/80 p-4 transition-all duration-200 hover:shadow-md hover:border-primary-300 group cursor-pointer shadow-2xs',
        isImported && 'opacity-60 bg-warm-50/50',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Bookmark button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleBookmark(offer.id)
          }}
          className={cn(
            'mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
            offer.is_bookmarked
              ? 'text-danger-500 bg-danger-50 hover:bg-danger-100'
              : 'text-slate-300 hover:text-danger-400 hover:bg-warm-50'
          )}
        >
          <Heart
            className={cn('w-4.5 h-4.5', offer.is_bookmarked && 'fill-current')}
          />
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-primary-800 transition-colors">
                {offer.titre}
              </h4>

              {/* Meta line */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {offer.entreprise && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Building2 className="w-3 h-3" />
                    {offer.entreprise}
                  </span>
                )}
                {offer.localisation && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(offer.localisation)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary-700 hover:text-primary-900 hover:underline transition-colors"
                    title="Voir sur Google Maps"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MapPin className="w-3 h-3" />
                    {offer.localisation}
                  </a>
                )}
                {offer.date_publication && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {formatDate(offer.date_publication)}
                  </span>
                )}
                {offer.reference && (
                  <span className="text-xs text-slate-400">
                    Réf: {offer.reference}
                  </span>
                )}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {offer.type_contrat && (
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-md',
                      contractBadgeColors[offer.type_contrat] || 'bg-warm-100 text-slate-600'
                    )}
                  >
                    {offer.type_contrat}
                  </span>
                )}
                {offer.experience_requise && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-warm-100 text-slate-600">
                    {offer.experience_requise}
                  </span>
                )}
                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-md',
                    sourceBadgeColors[offer.source] || 'bg-warm-100 text-slate-600'
                  )}
                >
                  {sourceLabels[offer.source] || offer.source}
                </span>
                {isImported && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-success-100 text-success-700">
                    ✓ Dans le Pipeline
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {offer.url && (
                <a
                  href={offer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary-700 hover:bg-primary-50 transition-all"
                  title="Ouvrir l'offre"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {!isImported && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onImport(offer.id)
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-success-600 hover:bg-success-50 transition-all cursor-pointer"
                  title="Importer dans le Pipeline"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDismiss(offer.id)
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-danger-500 hover:bg-danger-50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Ignorer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
