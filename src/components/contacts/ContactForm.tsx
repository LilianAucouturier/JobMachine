import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { CONTACT_STATUSES } from '../../lib/utils'
import type { Contact, ContactUpdate } from '../../types/database'

interface ContactFormProps {
  contact?: Contact | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    nom: string
    entreprise: string
    poste: string
    lien_linkedin: string
    email: string
    telephone: string
    notes: string
    statut: Contact['statut']
  }) => Promise<unknown>
  onUpdate?: (id: string, updates: ContactUpdate) => Promise<unknown>
}

export function ContactForm({ contact, isOpen, onClose, onSave, onUpdate }: ContactFormProps) {
  const isEditing = !!contact
  const [form, setForm] = useState({
    nom: '',
    entreprise: '',
    poste: '',
    lien_linkedin: '',
    email: '',
    telephone: '',
    notes: '',
    statut: '\u00c0 contacter' as Contact['statut'],
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (contact) {
      setForm({
        nom: contact.nom,
        entreprise: contact.entreprise,
        poste: contact.poste,
        lien_linkedin: contact.lien_linkedin,
        email: contact.email,
        telephone: contact.telephone,
        notes: contact.notes,
        statut: contact.statut,
      })
    } else {
      setForm({
        nom: '',
        entreprise: '',
        poste: '',
        lien_linkedin: '',
        email: '',
        telephone: '',
        notes: '',
        statut: '\u00c0 contacter',
      })
    }
  }, [contact, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nom.trim()) return
    setSaving(true)
    try {
      if (isEditing && contact && onUpdate) {
        await onUpdate(contact.id, form)
      } else {
        await onSave(form)
      }
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
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg animate-scale-in">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800">
              {isEditing ? 'Modifier le contact' : 'Ajouter un contact'}
            </h3>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom *</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  required
                  placeholder="Jean Dupont"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Entreprise</label>
                <input
                  type="text"
                  value={form.entreprise}
                  onChange={(e) => setForm({ ...form, entreprise: e.target.value })}
                  placeholder="LVMH"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Poste</label>
              <input
                type="text"
                value={form.poste}
                onChange={(e) => setForm({ ...form, poste: e.target.value })}
                placeholder="Directrice de la communication"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">LinkedIn</label>
              <input
                type="url"
                value={form.lien_linkedin}
                onChange={(e) => setForm({ ...form, lien_linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jean@exemple.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">T\u00e9l\u00e9phone</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="06 12 34 56 78"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut</label>
              <select
                value={form.statut}
                onChange={(e) => setForm({ ...form, statut: e.target.value as Contact['statut'] })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              >
                {CONTACT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Notes sur ce contact..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all">
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !form.nom.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium shadow-md shadow-primary-200/50 hover:shadow-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEditing ? 'Mettre \u00e0 jour' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
