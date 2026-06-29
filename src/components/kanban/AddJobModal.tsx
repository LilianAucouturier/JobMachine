import { useState } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../../lib/utils'
import type { Job } from '../../types/database'

interface AddJobModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (job: {
    titre: string
    entreprise: string
    url: string
    type_contrat: Job['type_contrat']
    experience_requise: Job['experience_requise']
    version_cv: string
    mots_cles: string
    notes: string
    statut_pipeline: Job['statut_pipeline']
  }) => Promise<unknown>
}

export function AddJobModal({ isOpen, onClose, onAdd }: AddJobModalProps) {
  const [form, setForm] = useState({
    titre: '',
    entreprise: '',
    url: '',
    type_contrat: 'CDI' as Job['type_contrat'],
    experience_requise: '0-1 an' as Job['experience_requise'],
    version_cv: '',
    mots_cles: '',
    notes: '',
    statut_pipeline: 'Offres \u00e0 analyser' as Job['statut_pipeline'],
  })
  const [saving, setSaving] = useState(false)

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
        type_contrat: 'CDI',
        experience_requise: '0-1 an',
        version_cv: '',
        mots_cles: '',
        notes: '',
        statut_pipeline: 'Offres \u00e0 analyser',
      })
      onClose()
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg animate-scale-in">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800">Ajouter une offre</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Titre du poste *</label>
              <input
                type="text"
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
                required
                placeholder="Ex: Chef de projet communication"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Entreprise</label>
              <input
                type="text"
                value={form.entreprise}
                onChange={(e) => setForm({ ...form, entreprise: e.target.value })}
                placeholder="Ex: LVMH"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lien de l'offre</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type de contrat</label>
                <select
                  value={form.type_contrat}
                  onChange={(e) => setForm({ ...form, type_contrat: e.target.value as Job['type_contrat'] })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                >
                  {CONTRACT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Exp\u00e9rience</label>
                <select
                  value={form.experience_requise}
                  onChange={(e) => setForm({ ...form, experience_requise: e.target.value as Job['experience_requise'] })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                >
                  {EXPERIENCE_LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Version CV</label>
              <input
                type="text"
                value={form.version_cv}
                onChange={(e) => setForm({ ...form, version_cv: e.target.value })}
                placeholder="Ex: Luxe, Corporate..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mots-cl\u00e9s</label>
              <input
                type="text"
                value={form.mots_cles}
                onChange={(e) => setForm({ ...form, mots_cles: e.target.value })}
                placeholder="marketing, digital, luxe..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !form.titre.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium shadow-md shadow-primary-200/50 hover:shadow-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Ajouter
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
