import { useState, useEffect } from 'react'
import { X, ExternalLink, Briefcase, MapPin, Clock, Building2, Edit2, Save } from 'lucide-react'
import DOMPurify from 'dompurify'
import type { ScrapedOffer } from '../../types/database'

interface ViewOfferModalProps {
  isOpen: boolean
  onClose: () => void
  offer: ScrapedOffer | null
  onUpdateOffer?: (id: string, updates: Partial<ScrapedOffer>) => Promise<ScrapedOffer>
}

export function ViewOfferModal({ isOpen, onClose, offer, onUpdateOffer }: ViewOfferModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<ScrapedOffer>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (offer) {
      setFormData(offer)
      setIsEditing(false)
    }
  }, [offer])

  if (!isOpen || !offer) return null

  const handleSave = async () => {
    if (!onUpdateOffer) return
    try {
      setIsSaving(true)
      await onUpdateOffer(offer.id, formData)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update offer:', error)
      alert('Erreur lors de la sauvegarde de l\'offre')
    } finally {
      setIsSaving(false)
    }
  }

  // Function to extract extra infos from description
  const extractExtraInfos = (desc: string | null) => {
    if (!desc) return { extraInfos: [], cleanDesc: '' }
    if (desc.startsWith('📌 Infos pratiques : ')) {
      const parts = desc.split('\n\n')
      const infos = parts[0].replace('📌 Infos pratiques : ', '').split(' | ')
      return { extraInfos: infos, cleanDesc: parts.slice(1).join('\n\n') }
    }
    return { extraInfos: [], cleanDesc: desc }
  }

  const { extraInfos, cleanDesc } = extractExtraInfos(formData.description || '')

  // Function to render HTML or plain text safely
  const renderDescription = () => {
    if (isEditing) {
      return (
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full min-h-[300px] p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-sans"
        />
      )
    }

    if (!cleanDesc) {
      return (
        <div className="text-slate-500 italic py-8 text-center bg-slate-50 rounded-xl">
          Aucune description disponible pour cette offre.
        </div>
      )
    }

    // Check if description is HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(cleanDesc);

    if (isHtml) {
      return (
        <div 
          className="prose prose-sm max-w-none prose-slate"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanDesc) }}
        />
      )
    }

    // Render plain text with line breaks
    return (
      <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">
        {cleanDesc}
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
            <div className="pr-4 flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.titre || ''}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  className="w-full text-xl font-bold text-slate-800 leading-tight mb-2 p-1 border-b border-slate-300 focus:border-indigo-500 outline-none"
                  placeholder="Titre de l'offre"
                />
              ) : (
                <h3 className="text-xl font-bold text-slate-800 leading-tight mb-2">
                  {formData.titre}
                </h3>
              )}
              
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.entreprise || ''}
                      onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                      className="border-b border-slate-300 focus:border-indigo-500 outline-none p-0.5"
                      placeholder="Entreprise"
                    />
                  ) : (
                    formData.entreprise
                  )}
                </span>
                
                <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                  <MapPin className="w-4 h-4" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.localisation || ''}
                      onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                      className="border-b border-slate-300 focus:border-indigo-500 outline-none p-0.5"
                      placeholder="Localisation"
                    />
                  ) : (
                    formData.localisation ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.localisation)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-indigo-800 hover:underline transition-colors cursor-pointer"
                        title="Voir sur Google Maps"
                      >
                        {formData.localisation}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Lieu non précisé</span>
                    )
                  )}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {onUpdateOffer && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                  title="Modifier l'offre"
                >
                  <Edit2 className="w-4 h-4 text-slate-500" />
                </button>
              )}
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  title="Sauvegarder"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* Meta tags */}
            <div className="flex flex-wrap gap-3 mb-8 items-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium">
                <Briefcase className="w-4 h-4" />
                {isEditing ? (
                  <select
                    value={formData.type_contrat || ''}
                    onChange={(e) => setFormData({ ...formData, type_contrat: e.target.value })}
                    className="bg-transparent outline-none cursor-pointer"
                  >
                    <option value="">Sélectionner</option>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Stage">Stage</option>
                    <option value="Alternance">Alternance</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                ) : (
                  formData.type_contrat || 'Non spécifié'
                )}
              </span>
              
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium">
                <Clock className="w-4 h-4" />
                {isEditing ? (
                  <select
                    value={formData.experience_requise || ''}
                    onChange={(e) => setFormData({ ...formData, experience_requise: e.target.value })}
                    className="bg-transparent outline-none cursor-pointer max-w-[120px]"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Junior">Junior</option>
                    <option value="Intermédiaire">Intermédiaire</option>
                    <option value="Sénior">Sénior</option>
                  </select>
                ) : (
                  formData.experience_requise || '-'
                )}
              </span>
              
              {formData.source && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">
                  Source: <span className="capitalize ml-1">{formData.source}</span>
                </span>
              )}
              
              {!isEditing && extraInfos.map((info, idx) => (
                <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
                  {info}
                </span>
              ))}
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
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Réf:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.reference || ''}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="border-b border-slate-300 focus:border-indigo-500 outline-none p-0.5 max-w-[150px] bg-transparent"
                  placeholder="Référence"
                />
              ) : (
                <span>{formData.reference || '-'}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-all"
              >
                Fermer
              </button>
              {formData.url && !isEditing && (
                <a
                  href={formData.url}
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
