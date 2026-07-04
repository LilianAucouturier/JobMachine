import { X, ExternalLink, Briefcase, MapPin, Clock, Building2 } from 'lucide-react'
import DOMPurify from 'dompurify'
import type { ScrapedOffer } from '../../types/database'

interface ViewOfferModalProps {
  isOpen: boolean
  onClose: () => void
  offer: ScrapedOffer | null
}

export function ViewOfferModal({ isOpen, onClose, offer }: ViewOfferModalProps) {
  if (!isOpen || !offer) return null

  // Function to render HTML or plain text safely
  const renderDescription = () => {
    if (!offer.description) {
      return (
        <div className="text-slate-500 italic py-8 text-center bg-slate-50 rounded-xl">
          Aucune description disponible pour cette offre.
        </div>
      )
    }

    // Check if description is HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(offer.description);

    if (isHtml) {
      return (
        <div 
          className="prose prose-sm max-w-none prose-slate"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(offer.description) }}
        />
      )
    }

    // Render plain text with line breaks
    return (
      <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">
        {offer.description}
      </div>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
          
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
            <div className="pr-4">
              <h3 className="text-xl font-bold text-slate-800 leading-tight mb-2">
                {offer.titre}
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                {offer.entreprise && (
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {offer.entreprise}
                  </span>
                )}
                {offer.localisation && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {offer.localisation}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* Meta tags */}
            <div className="flex flex-wrap gap-3 mb-8">
              {offer.type_contrat && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium">
                  <Briefcase className="w-4 h-4" />
                  {offer.type_contrat}
                </span>
              )}
              {offer.experience_requise && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  {offer.experience_requise}
                </span>
              )}
              {offer.source && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">
                  Source: <span className="capitalize ml-1">{offer.source}</span>
                </span>
              )}
            </div>

            {/* Description Section */}
            <div>
              <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                Description du poste
              </h4>
              <div className="bg-white rounded-xl">
                {renderDescription()}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl flex-shrink-0">
            <div className="text-xs text-slate-500">
              {offer.reference && <span>Réf: {offer.reference}</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-all"
              >
                Fermer
              </button>
              {offer.url && (
                <a
                  href={offer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-all shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir l'annonce originale
                </a>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
