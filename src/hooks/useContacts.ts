import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localDb } from '../lib/localDb'
import type { Contact, ContactInsert, ContactUpdate } from '../types/database'

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)

      if (localDb.isLocalMode()) {
        const localData = localDb.getContacts()
        setContacts(localData)
        setError(null)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setContacts(data || [])
      setError(null)
    } catch (err) {
      console.warn('Erreur chargement Supabase, fallback local pour les contacts:', err)
      const localData = localDb.getContacts()
      setContacts(localData)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const addContact = useCallback(async (contact: Omit<ContactInsert, 'user_id'>) => {
    if (localDb.isLocalMode()) {
      const newContact = localDb.addContact(contact)
      setContacts((prev) => [newContact, ...prev])
      return newContact
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...contact, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      setContacts((prev) => [data, ...prev])
      return data
    } catch {
      const newContact = localDb.addContact(contact)
      setContacts((prev) => [newContact, ...prev])
      return newContact
    }
  }, [])

  const updateContact = useCallback(async (id: string, updates: ContactUpdate) => {
    if (localDb.isLocalMode()) {
      const updated = localDb.updateContact(id, updates)
      setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)))
      return updated
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setContacts((prev) => prev.map((c) => (c.id === id ? data : c)))
      return data
    } catch {
      const updated = localDb.updateContact(id, updates)
      setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)))
      return updated
    }
  }, [])

  const deleteContact = useCallback(async (id: string) => {
    if (localDb.isLocalMode()) {
      localDb.deleteContact(id)
      setContacts((prev) => prev.filter((c) => c.id !== id))
      return
    }

    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      if (error) throw error
      setContacts((prev) => prev.filter((c) => c.id !== id))
    } catch {
      localDb.deleteContact(id)
      setContacts((prev) => prev.filter((c) => c.id !== id))
    }
  }, [])

  return { contacts, loading, error, addContact, updateContact, deleteContact, refetch: fetchContacts }
}
