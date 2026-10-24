import { useState } from 'react'
import { X, Plus, Loader2, Sparkles, Globe } from 'lucide-react'
import { CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../../lib/utils'
import { fetchJobWithJinaReader } from '../../lib/reader'

interface AddOfferModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (offer: {
    titre: string
    entreprise: string
    url: string
    localisation: string
    type_contrat: string
    experience_requise: string
    reference: string
    mots_cles: string
    source: string
    description?: string | null
  }) => Promise<unknown>
}

export function AddOfferModal({ isOpen, onClose, onAdd }: AddOfferModalProps) {
  const [form, setForm] = useState({
    titre: '',
    entreprise: '',
    url: '',
    localisation: '',
    type_contrat: '',
    experience_requise: '',
    reference: '',
    mots_cles: '',
    source: 'manuel',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [urlToFetch, setUrlToFetch] = useState('')
  const [fetchingJina, setFetchingJina] = useState(false)
  const [jinaSuccess, setJinaSuccess] = useState(false)

  const handleJinaFetch = async () => {
    if (!urlToFetch.trim()) return
    setFetchingJina(true)
    setJinaSuccess(false)
    try {
      const parsed = await fetchJobWithJinaReader(urlToFetch)
      setForm((prev) => ({
        ...prev,
        titre: parsed.titre || prev.titre,
        entreprise: parsed.entreprise || prev.entreprise,
        url: parsed.url || urlToFetch,
        localisation: parsed.localisation || prev.localisation,
        type_contrat: parsed.type_contrat || prev.type_contrat,
        experience_requise: parsed.experience_requise || prev.experience_requise,
        mots_cles: parsed.mots_cles || prev.mots_cles,
        source: parsed.source || 'Jina Reader',
        description: parsed.description || prev.description,
      }))
      setJinaSuccess(true)
      setTimeout(() => setJinaSuccess(false), 3000)
    } catch (err: any) {
      console.error('Jina Reader error:', err)
      alert(`Erreur Jina Reader : ${err.message || 'Impossible d\'extraire l\'offre.'}`)
    } finally {
      setFetchingJina(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titre.trim()) return
    setSaving(true)
    try {
      await onAdd(form)
      setForm({
        titre: '',
        entreprise: '',
        url: '',
        localisation: '',
        type_contrat: '',
        experience_requise: '',
        reference: '',
        mots_cles: '',
        source: 'manuel',
        description: '',
      })
      setUrlToFetch('')
      onClose()
    } catch (err: any) {
      console.error('Add offer error:', err)
      alert(err?.message || "Une erreur est survenue lors de l'ajout.")
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-warm-200/80 w-full max-w-lg animate-scale-in overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-warm-100 bg-warm-50/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Ajouter une offre</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-warm-100 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Section Jina Reader */}
          <div className="px-6 pt-5 pb-3 bg-gradient-to-br from-primary-50/40 via-warm-50/60 to-coral-50/20 border-b border-warm-200/60">
            <label className="flex items-center justify-between text-xs font-semibold text-primary-900 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-coral-500" />
                Auto-remplir via Jina Reader (Markdown)
              </span>
              <span className="text-[10px] text-slate-400 font-normal">r.jina.ai • Sans clé requise</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlToFetch}
                onChange={(e) => setUrlToFetch(e.target.value)}
                placeholder="Coller l'URL (LinkedIn, WTTJ, Safran, Airbus...)"
                className="flex-1 px-3 py-2 rounded-xl border border-warm-200 bg-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all shadow-xs"
              />
              <button
                type="button"
                onClick={handleJinaFetch}
                disabled={fetchingJina || !urlToFetch.trim()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
              >
                {fetchingJina ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Extraire
              </button>
            </div>
            {jinaSuccess && (
              <p className="text-[11px] font-medium text-emerald-600 mt-1.5 animate-fade-in">
                ✓ Contenu extrait et formulaire pré-rempli en Markdown propre !
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Titre du poste *</label>
              <input
                type="text"
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
                required
                placeholder="Ex: Ingénieur Systèmes Embarqués F/H"
                className="w-full px-3 py-2 rounded-xl border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all shadow-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Entreprise</label>
                <input
                  type="text"
                  value={form.entreprise}
                  onChange={(e) => setForm({ ...form, entreprise: e.target.value })}
                  placeholder="Ex: Safran, Airbus..."
                  className="w-full px-3 py-2 rounded-xl border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Localisation</label>
                <input
                  type="text"
                  value={form.localisation}
                  onChange={(e) => setForm({ ...form, localisation: e.target.value })}
                  placeholder="Ex: Toulouse, Paris..."
                  className="w-full px-3 py-2 rounded-xl border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lien de l'offre</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all shadow-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type de contrat</label>
                <select
                  value={form.type_contrat}
                  onChange={(e) => setForm({ ...form, type_contrat: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all shadow-xs"
                >
                  <option value="">Non spécifié</option>
                  {CONTRACT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expérience</label>
                <select
                  value={form.experience_requise}
                  onChange={(e) => setForm({ ...form, experience_requise: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all shadow-xs"
                >
                  <option value="">Non spécifié</option>
                  {EXPERIENCE_LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mots-clés / Compétences</label>
              <input
                type="text"
                value={form.mots_cles}
                onChange={(e) => setForm({ ...form, mots_cles: e.target.value })}
                placeholder="Avionique, C++, DO-178C..."
                className="w-full px-3 py-2 rounded-xl border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all shadow-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-warm-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-warm-100 transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !form.titre.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold shadow-md shadow-primary-700/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Ajouter l'offre
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
