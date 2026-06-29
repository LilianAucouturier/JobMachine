import { useState, useEffect } from 'react'
import { X, ExternalLink, Save, Trash2 } from 'lucide-react'
import type { Job, JobUpdate } from '../../types/database'
import { CONTRACT_TYPES, EXPERIENCE_LEVELS, PIPELINE_COLUMNS, cn, formatDate } from '../../lib/utils'

interface JobDrawerProps {
  job: Job | null
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, updates: JobUpdate) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function JobDrawer({ job, isOpen, onClose, onSave, onDelete }: JobDrawerProps) {
  const [form, setForm] = useState<JobUpdate>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (job) {
      setForm({
        titre: job.titre,
        entreprise: job.entreprise,
        url: job.url,
        type_contrat: job.type_contrat,
        experience_requise: job.experience_requise,
        version_cv: job.version_cv,
        mots_cles: job.mots_cles,
        notes: job.notes,
        statut_pipeline: job.statut_pipeline,
      })
    }
  }, [job])

  if (!job) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(job.id, form)
      onClose()
    } catch {
      // handle error silently
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer cette offre ?')) return
    setDeleting(true)
    try {
      await onDelete(job.id)
      onClose()
    } catch {
      // handle error silently
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Détails de l'offre</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Titre du poste</label>
            <input
              type="text"
              value={form.titre || ''}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            />
          </div>

          {/* Entreprise */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Entreprise</label>
            <input
              type="text"
              value={form.entreprise || ''}
              onChange={(e) => setForm({ ...form, entreprise: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Lien de l'offre</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={form.url || ''}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                placeholder="https://..."
              />
              {form.url && (
                <a
                  href={form.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-primary-50 hover:border-primary-300 transition-all"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                </a>
              )}
            </div>
          </div>

          {/* Row: Type + Experience */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type de contrat</label>
              <select
                value={form.type_contrat || ''}
                onChange={(e) => setForm({ ...form, type_contrat: e.target.value as Job['type_contrat'] })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Expérience</label>
              <select
                value={form.experience_requise || ''}
                onChange={(e) => setForm({ ...form, experience_requise: e.target.value as Job['experience_requise'] })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              >
                {EXPERIENCE_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut</label>
            <select
              value={form.statut_pipeline || ''}
              onChange={(e) => setForm({ ...form, statut_pipeline: e.target.value as Job['statut_pipeline'] })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            >
              {PIPELINE_COLUMNS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Version CV */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Version CV</label>
            <input
              type="text"
              value={form.version_cv || ''}
              onChange={(e) => setForm({ ...form, version_cv: e.target.value })}
              placeholder="Ex: Luxe, Corporate, Tech..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            />
          </div>

          {/* Mots-clés */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mots-clés</label>
            <input
              type="text"
              value={form.mots_cles || ''}
              onChange={(e) => setForm({ ...form, mots_cles: e.target.value })}
              placeholder="marketing, digital, luxe..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
              placeholder="Notes personnelles sur cette offre..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all resize-none"
            />
          </div>

          {/* Dates */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <p className="text-xs text-slate-400">Ajoutée le {formatDate(job.date_ajout)}</p>
            <p className="text-xs text-slate-400">Dernière action le {formatDate(job.date_derniere_action)}</p>
            {job.date_envoi_candidature && (
              <p className="text-xs text-slate-400">Candidature envoyée le {formatDate(job.date_envoi_candidature)}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-danger-600 hover:bg-danger-50 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium shadow-md shadow-primary-200/50 hover:shadow-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </>
  )
}
