import { Heart, ExternalLink, ArrowRight, X, MapPin, Building2, Calendar } from 'lucide-react'
import type { ScrapedOffer } from '../../types/database'
import { cn, formatDate } from '../../lib/utils'

interface OfferRowProps {
  offer: ScrapedOffer
  onToggleBookmark: (id: string) => void
  onImport: (id: string) => void
  onDismiss: (id: string) => void
}

const sourceBadgeColors: Record<string, string> = {
  linkedin: 'bg-blue-100 text-blue-700',
  wttj: 'bg-yellow-100 text-yellow-800',
  indeed: 'bg-violet-100 text-violet-700',
  manuel: 'bg-slate-100 text-slate-600',
  apify: 'bg-emerald-100 text-emerald-700',
  bookmarklet: 'bg-primary-100 text-primary-700',
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
  CDI: 'bg-emerald-100 text-emerald-700',
  CDD: 'bg-blue-100 text-blue-700',
  Alternance: 'bg-violet-100 text-violet-700',
  Stage: 'bg-amber-100 text-amber-700',
}

export function OfferRow({ offer, onToggleBookmark, onImport, onDismiss }: OfferRowProps) {
  const isImported = !!offer.imported_job_id

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 p-4 transition-all duration-200 hover:shadow-md hover:border-primary-200 group',
        isImported && 'opacity-60 bg-slate-50',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Bookmark button */}
        <button
          onClick={() => onToggleBookmark(offer.id)}
          className={cn(
            'mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
            offer.is_bookmarked
              ? 'text-danger-500 bg-danger-50 hover:bg-danger-100'
              : 'text-slate-300 hover:text-danger-400 hover:bg-slate-50'
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
              <h4 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-primary-700 transition-colors">
                {offer.titre}
              </h4>

              {/* Meta line */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {offer.entreprise && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Building2 className="w-3 h-3" />
                    {offer.entreprise}
                  </span>
                )}
                {offer.localisation && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" />
                    {offer.localisation}
                  </span>
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
                      contractBadgeColors[offer.type_contrat] || 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {offer.type_contrat}
                  </span>
                )}
                {offer.experience_requise && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                    {offer.experience_requise}
                  </span>
                )}
                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-md',
                    sourceBadgeColors[offer.source] || 'bg-slate-100 text-slate-600'
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary-500 hover:bg-primary-50 transition-all"
                  title="Ouvrir l'offre"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {!isImported && (
                <button
                  onClick={() => onImport(offer.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-success-600 hover:bg-success-50 transition-all"
                  title="Importer dans le Pipeline"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onDismiss(offer.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-danger-500 hover:bg-danger-50 transition-all opacity-0 group-hover:opacity-100"
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
