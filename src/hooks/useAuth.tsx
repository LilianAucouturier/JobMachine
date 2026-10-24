import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { localDb } from '../lib/localDb'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isLocalMode: boolean
  signIn: (e: string, p: string) => Promise<void>
  signUp: (e: string, p: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  enableLocalMode: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLocalMode, setIsLocalMode] = useState<boolean>(() => localDb.isLocalMode())
  const [user, setUser] = useState<User | null>(() => {
    if (localDb.isLocalMode()) {
      return localDb.getLocalUser() as unknown as User
    }
    return null
  })
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(() => !localDb.isLocalMode())

  useEffect(() => {
    if (isLocalMode) {
      setUser(localDb.getLocalUser() as unknown as User)
      setLoading(false)
      return
    }

    let timeoutId: any = null

    // Si Supabase met plus de 2.5 secondes (DNS ou projet en pause), on bascule automatiquement en local
    timeoutId = setTimeout(() => {
      console.warn("Supabase n'a pas répondu à temps (serveur en pause ?). Activation automatique du mode local.")
      localDb.setLocalMode(true)
      setIsLocalMode(true)
      setUser(localDb.getLocalUser() as unknown as User)
      setLoading(false)
    }, 2500)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeoutId)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      })
      .catch((err) => {
        clearTimeout(timeoutId)
        console.warn("Échec connexion Supabase, bascule en mode local:", err)
        localDb.setLocalMode(true)
        setIsLocalMode(true)
        setUser(localDb.getLocalUser() as unknown as User)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [isLocalMode])

  const enableLocalMode = useCallback(() => {
    localDb.setLocalMode(true)
    setIsLocalMode(true)
    setUser(localDb.getLocalUser() as unknown as User)
    setLoading(false)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (isLocalMode) {
      const u = localDb.setLocalUser(email)
      setUser(u as unknown as User)
      return
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (err) {
      console.warn("Connexion cloud impossible, passage en mode local:", err)
      enableLocalMode()
    }
  }, [isLocalMode, enableLocalMode])

  const signUp = useCallback(async (email: string, password: string) => {
    if (isLocalMode) {
      const u = localDb.setLocalUser(email)
      setUser(u as unknown as User)
      return
    }
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
    } catch (err) {
      console.warn("Inscription cloud impossible, passage en mode local:", err)
      enableLocalMode()
    }
  }, [isLocalMode, enableLocalMode])

  const signOut = useCallback(async () => {
    if (isLocalMode) {
      // En mode local, on peut soit réinitialiser soit rester connecté
      setUser(null)
      return
    }
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch {
      setUser(null)
    }
  }, [isLocalMode])

  const signInWithGoogle = useCallback(async () => {
    if (isLocalMode) {
      const u = localDb.setLocalUser('google.user@jobmachine.local')
      setUser(u as unknown as User)
      return
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      })
      if (error) throw error
    } catch {
      enableLocalMode()
    }
  }, [isLocalMode, enableLocalMode])

  return (
    <AuthContext.Provider value={{ user, session, loading, isLocalMode, signIn, signUp, signOut, signInWithGoogle, enableLocalMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
