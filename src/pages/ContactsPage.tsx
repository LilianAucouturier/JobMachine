import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useContacts } from '../hooks/useContacts'
import { usePitchTemplates } from '../hooks/usePitchTemplates'
import { ContactsTable } from '../components/contacts/ContactsTable'
import { ContactForm } from '../components/contacts/ContactForm'
import { PitchGenerator } from '../components/contacts/PitchGenerator'
import type { Contact } from '../types/database'

export function ContactsPage() {
  const { contacts, loading, addContact, updateContact, deleteContact } = useContacts()
  const { templates, addTemplate, deleteTemplate, generatePitch, initializeDefaults } = usePitchTemplates()
  const [formOpen, setFormOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  useEffect(() => {
    initializeDefaults()
  }, [initializeDefaults])

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setTimeout(() => setEditingContact(null), 300)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">R\u00e9seau & CRM</h2>
          <p className="text-sm text-slate-500 mt-1">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditingContact(null); setFormOpen(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium shadow-md shadow-primary-200/50 hover:shadow-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Nouveau contact
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ContactsTable
            contacts={contacts}
            onEdit={handleEdit}
            onDelete={deleteContact}
            onSelect={setSelectedContact}
            selectedContactId={selectedContact?.id}
          />
        </div>
        <div>
          <PitchGenerator
            contact={selectedContact}
            templates={templates}
            onGeneratePitch={generatePitch}
            onAddTemplate={addTemplate}
            onDeleteTemplate={deleteTemplate}
          />
        </div>
      </div>

      <ContactForm
        contact={editingContact}
        isOpen={formOpen}
        onClose={handleCloseForm}
        onSave={addContact}
        onUpdate={updateContact}
      />
    </div>
  )
}
