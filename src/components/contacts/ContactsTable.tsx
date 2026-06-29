import { ExternalLink, Edit2, Trash2 } from 'lucide-react'
import type { Contact } from '../../types/database'
import { cn, formatDate } from '../../lib/utils'

interface ContactsTableProps {
  contacts: Contact[]
  onEdit: (contact: Contact) => void
  onDelete: (id: string) => void
  onSelect: (contact: Contact) => void
  selectedContactId?: string
}

const statusColors: Record<string, string> = {
  'À contacter': 'bg-slate-100 text-slate-700',
  'Message envoyé': 'bg-blue-100 text-blue-700',
  'En discussion': 'bg-violet-100 text-violet-700',
  'Relance nécessaire': 'bg-warning-100 text-warning-700',
  'Entretien programmé': 'bg-success-100 text-success-700',
  'Pas intéressé': 'bg-danger-100 text-danger-700',
}

export function ContactsTable({ contacts, onEdit, onDelete, onSelect, selectedContactId }: ContactsTableProps) {
  if (contacts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <p className="text-slate-500">Aucun contact pour le moment</p>
        <p className="text-sm text-slate-400 mt-1">Commencez par ajouter vos contacts cibles</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entreprise</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Poste</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ajouté</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                onClick={() => onSelect(contact)}
                className={cn(
                  'border-b border-slate-50 cursor-pointer transition-colors',
                  selectedContactId === contact.id
                    ? 'bg-primary-50/50'
                    : 'hover:bg-slate-50'
                )}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                      {contact.nom.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{contact.nom}</p>
                      {contact.email && (
                        <p className="text-xs text-slate-400">{contact.email}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-slate-600">{contact.entreprise || '\u2014'}</td>
                <td className="px-5 py-3 text-sm text-slate-600">{contact.poste || '\u2014'}</td>
                <td className="px-5 py-3">
                  <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusColors[contact.statut] || 'bg-slate-100 text-slate-700')}>
                    {contact.statut}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-slate-400">{formatDate(contact.created_at)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {contact.lien_linkedin && (
                      <a
                        href={contact.lien_linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-blue-600" />
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(contact) }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer ce contact ?')) onDelete(contact.id) }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-danger-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-danger-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
