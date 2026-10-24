import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { X, ExternalLink, Briefcase, MapPin, Clock, Building2, Edit2, Save, Sparkles, Copy, Check, FileText, CheckCircle2, AlertCircle, UserCheck } from 'lucide-react'
import DOMPurify from 'dompurify'
import type { ScrapedOffer } from '../../types/database'
import { evaluateJobOffer } from '../../lib/careerOps'
import { localDb } from '../../lib/localDb'

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
  const [pitchCopied, setPitchCopied] = useState(false)
  const [letterCopied, setLetterCopied] = useState(false)
  const [showAiDetails, setShowAiDetails] = useState(true)
  const [aiTab, setAiTab] = useState<'insights' | 'letter'>('insights')

  useEffect(() => {
    if (offer) {
      setFormData(offer)
      setIsEditing(false)
    }
  }, [offer])

  const candidateProfile = useMemo(() => {
    return localDb.getCandidateProfile()
  }, [isOpen])

  const careerEval = useMemo(() => {
    return evaluateJobOffer(
      formData.titre || '',
      formData.entreprise || '',
      formData.description || '',
      formData.type_contrat || '',
      candidateProfile
    )
  }, [formData.titre, formData.entreprise, formData.description, formData.type_contrat, candidateProfile])

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

  const handleCopyPitch = async () => {
    if (!careerEval.pitchAccroche) return
    await navigator.clipboard.writeText(careerEval.pitchAccroche)
    setPitchCopied(true)
    setTimeout(() => setPitchCopied(false), 2000)
  }

  const handleCopyLetter = async () => {
    if (!careerEval.lettreMotivationSurMesure) return
    await navigator.clipboard.writeText(careerEval.lettreMotivationSurMesure)
    setLetterCopied(true)
    setTimeout(() => setLetterCopied(false), 2000)
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
          className="w-full min-h-[300px] p-4 border border-warm-200 rounded-xl focus:ring-2 focus:ring-primary-600 focus:border-primary-600 text-sm font-sans"
        />
      )
    }

    if (!cleanDesc) {
      return (
        <div className="text-slate-500 italic py-8 text-center bg-warm-50 rounded-xl">
          Aucune description disponible pour cette offre.
        </div>
      )
    }

    const isHtml = /<[a-z][\s\S]*>/i.test(cleanDesc);

    if (isHtml) {
      return (
        <div 
          className="prose prose-sm max-w-none prose-slate"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanDesc) }}
        />
      )
    }

    return (
      <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">
        {cleanDesc}
      </div>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-warm-200/80 w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden">
          
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-warm-100 flex-shrink-0 bg-warm-50/40">
            <div className="pr-4 flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.titre || ''}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  className="w-full text-xl font-bold text-slate-800 leading-tight mb-2 p-1 border-b border-warm-300 focus:border-primary-600 outline-none"
                  placeholder="Titre du poste"
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
                      className="border-b border-warm-300 focus:border-primary-600 outline-none p-0.5"
                      placeholder="Entreprise"
                    />
                  ) : (
                    formData.entreprise
                  )}
                </span>
                
                <span className="flex items-center gap-1.5 text-primary-700 font-medium">
                  <MapPin className="w-4 h-4" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.localisation || ''}
                      onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                      className="border-b border-warm-300 focus:border-primary-600 outline-none p-0.5"
                      placeholder="Localisation"
                    />
                  ) : (
                    formData.localisation ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.localisation)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary-800 hover:underline transition-colors cursor-pointer"
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-warm-100 transition-colors cursor-pointer"
                  title="Modifier l'offre"
                >
                  <Edit2 className="w-4 h-4 text-slate-500" />
                </button>
              )}
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Sauvegarder"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-warm-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="px-6 py-5 overflow-y-auto space-y-5 flex-1">
            
            {/* Career-Ops IA Evaluation Banner */}
            {!isEditing && (
              <div className="rounded-2xl border border-primary-200/80 bg-gradient-to-br from-primary-50/60 via-warm-50/70 to-coral-50/40 p-4 shadow-2xs">
                {/* Header score & profile */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-coral-500 text-white font-bold text-xs shadow-xs shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">
                          Match Score : <span className="text-coral-600 font-extrabold text-base">{careerEval.fitScore}%</span>
                        </h4>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          careerEval.isTopTarget
                            ? 'bg-primary-100 text-primary-800 border-primary-300'
                            : 'bg-warm-100 text-slate-700 border-warm-300'
                        }`}>
                          {careerEval.tierLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <UserCheck className="w-3 h-3 text-primary-600 inline" />
                        <span>Profil : <strong>{candidateProfile.nomComplet}</strong> ({candidateProfile.titreProfessionnel})</span>
                        <Link
                          to="/profil"
                          className="text-primary-700 hover:text-primary-900 font-medium underline inline-flex items-center gap-0.5 ml-1"
                        >
                          Changer mon CV / LM
                        </Link>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-auto bg-white/70 p-1 rounded-xl border border-warm-200/80 text-xs">
                    <button
                      onClick={() => { setAiTab('insights'); setShowAiDetails(true); }}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        aiTab === 'insights' && showAiDetails
                          ? 'bg-primary-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Analyse & ATS
                    </button>
                    <button
                      onClick={() => { setAiTab('letter'); setShowAiDetails(true); }}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        aiTab === 'letter' && showAiDetails
                          ? 'bg-primary-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Lettre sur-mesure
                    </button>
                    <button
                      onClick={() => setShowAiDetails(!showAiDetails)}
                      className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-[11px]"
                      title={showAiDetails ? 'Réduire' : 'Agrandir'}
                    >
                      {showAiDetails ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {showAiDetails && (
                  <div className="mt-3 pt-3 border-t border-warm-200/60 space-y-3 animate-fade-in text-xs">
                    {aiTab === 'insights' ? (
                      <>
                        {/* ATS Match & Gap Analysis */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-white/80 p-3 rounded-xl border border-warm-200/80">
                          <div>
                            <span className="font-semibold text-emerald-800 text-[11px] flex items-center gap-1 mb-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Compétences alignées ({careerEval.matchedSkills.length}) :
                            </span>
                            {careerEval.matchedSkills.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {careerEval.matchedSkills.map((s, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200/60">
                                    ✓ {s}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">Aucune correspondance directe trouvée.</p>
                            )}
                          </div>

                          <div>
                            <span className="font-semibold text-amber-800 text-[11px] flex items-center gap-1 mb-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              Mots-clés demandés à valoriser ({careerEval.missingSkills.length}) :
                            </span>
                            {careerEval.missingSkills.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {careerEval.missingSkills.map((s, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200/60">
                                    + {s}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-emerald-600 font-medium">Excellent alignement ATS !</p>
                            )}
                          </div>
                        </div>

                        {/* CV Adaptation tips */}
                        <div>
                          <p className="font-semibold text-slate-700 mb-1">💡 Conseils d'adaptation pour votre CV :</p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600">
                            {careerEval.cvBulletPoints.map((tip, idx) => (
                              <li key={idx}>{tip}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Pitch Accroche */}
                        <div className="bg-white/90 p-3 rounded-xl border border-warm-200/80">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-700 text-[11px]">✉️ Accroche LinkedIn / Mail candidat :</span>
                            <button
                              onClick={handleCopyPitch}
                              className="flex items-center gap-1 text-[11px] font-medium text-coral-600 hover:text-coral-700 transition-colors"
                            >
                              {pitchCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              {pitchCopied ? 'Copié !' : 'Copier'}
                            </button>
                          </div>
                          <p className="text-slate-600 italic text-[11px] leading-relaxed">
                            "{careerEval.pitchAccroche}"
                          </p>
                        </div>
                      </>
                    ) : (
                      /* Tailored Motivation Letter Tab */
                      <div className="bg-white/95 p-3.5 rounded-xl border border-warm-200/80 space-y-2">
                        <div className="flex items-center justify-between border-b border-warm-100 pb-2">
                          <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-primary-600" />
                            Lettre de motivation générée sur-mesure :
                          </span>
                          <button
                            onClick={handleCopyLetter}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-coral-500 hover:bg-coral-600 text-white shadow-2xs transition-colors"
                          >
                            {letterCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {letterCopied ? 'Lettre copiée !' : 'Copier la lettre'}
                          </button>
                        </div>
                        <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs max-h-60 overflow-y-auto pr-2 bg-warm-50/50 p-2.5 rounded-lg border border-warm-200/60 font-sans">
                          {careerEval.lettreMotivationSurMesure}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Badges Info */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warm-100 text-slate-700 text-sm font-medium">
                <Briefcase className="w-4 h-4 text-slate-400" />
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
              
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warm-100 text-slate-700 text-sm font-medium">
                <Clock className="w-4 h-4 text-slate-400" />
                {isEditing ? (
                  <select
                    value={formData.experience_requise || ''}
                    onChange={(e) => setFormData({ ...formData, experience_requise: e.target.value })}
                    className="bg-transparent outline-none cursor-pointer max-w-[120px]"
                  >
                    <option value="">Sélectionner</option>
                    <option value="0-1 an">0-1 an</option>
                    <option value="1-3 ans">1-3 ans</option>
                    <option value="3-5 ans">3-5 ans</option>
                    <option value="5+ ans">5+ ans</option>
                  </select>
                ) : (
                  formData.experience_requise || '-'
                )}
              </span>
              
              {formData.source && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-warm-100 text-slate-600 text-sm font-medium">
                  Source: <span className="capitalize ml-1 font-semibold">{formData.source}</span>
                </span>
              )}
              
              {!isEditing && extraInfos.map((info, idx) => (
                <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-sage-100 text-sage-800 text-sm font-medium">
                  {info}
                </span>
              ))}
            </div>

            {/* Description Section */}
            <div>
              <h4 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                Description du poste
              </h4>
              <div className="bg-white rounded-xl">
                {renderDescription()}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-warm-100 flex items-center justify-between bg-warm-50/50 rounded-b-3xl flex-shrink-0">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Réf:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.reference || ''}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="border-b border-warm-300 focus:border-primary-600 outline-none p-0.5 max-w-[150px] bg-transparent"
                  placeholder="Référence"
                />
              ) : (
                <span>{formData.reference || '-'}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-warm-100 transition-all cursor-pointer"
              >
                Fermer
              </button>
              {formData.url && !isEditing && (
                <a
                  href={formData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold transition-all shadow-md shadow-primary-700/20 cursor-pointer"
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
