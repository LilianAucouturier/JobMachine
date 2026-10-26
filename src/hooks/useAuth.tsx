import { useState, useCallback, createContext, useContext } from 'react'
import { localDb } from '../lib/localDb'

export interface LocalUser {
  id: string
  email: string
  user_metadata: {
    full_name?: string
  }
}

interface AuthContextType {
  user: LocalUser | null
  session: null
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
  const [user, setUser] = useState<LocalUser | null>(() => localDb.getLocalUser())
  const loading = false
  const isLocalMode = true

  const enableLocalMode = useCallback(() => {
    localDb.setLocalMode(true)
    setUser(localDb.getLocalUser())
  }, [])

  const signIn = useCallback(async (email: string) => {
    const u = localDb.setLocalUser(email)
    setUser(u)
  }, [])

  const signUp = useCallback(async (email: string) => {
    const u = localDb.setLocalUser(email)
    setUser(u)
  }, [])

  const signOut = useCallback(async () => {
    setUser(null)
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const u = localDb.setLocalUser('google.user@nextstep.local')
    setUser(u)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session: null,
        loading,
        isLocalMode,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        enableLocalMode,
      }}
    >
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
