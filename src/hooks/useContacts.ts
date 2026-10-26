import { useState, useEffect, useCallback } from 'react'
import { localDb } from '../lib/localDb'
import type { Contact, ContactInsert, ContactUpdate } from '../types/database'

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(() => {
    try {
      setLoading(true)
      const data = localDb.getContacts()
      setContacts(data)
      setError(null)
    } catch (err: any) {
      console.error('Erreur chargement local des contacts:', err)
      setError(err?.message || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const addContact = useCallback(async (contact: Omit<ContactInsert, 'user_id'>) => {
    const newContact = localDb.addContact(contact)
    setContacts((prev) => [newContact, ...prev])
    return newContact
  }, [])

  const updateContact = useCallback(async (id: string, updates: ContactUpdate) => {
    const updated = localDb.updateContact(id, updates)
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }, [])

  const deleteContact = useCallback(async (id: string) => {
    localDb.deleteContact(id)
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { contacts, loading, error, addContact, updateContact, deleteContact, refetch: fetchContacts }
}
