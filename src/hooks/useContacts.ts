import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Contact, ContactInsert, ContactUpdate } from '../types/database'

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setContacts(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const addContact = useCallback(async (contact: Omit<ContactInsert, 'user_id'>) => {
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
  }, [])

  const updateContact = useCallback(async (id: string, updates: ContactUpdate) => {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setContacts((prev) => prev.map((c) => (c.id === id ? data : c)))
    return data
  }, [])

  const deleteContact = useCallback(async (id: string) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) throw error
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { contacts, loading, error, addContact, updateContact, deleteContact, refetch: fetchContacts }
}
