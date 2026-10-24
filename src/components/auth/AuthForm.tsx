import { useState } from 'react'
import { Mail, Lock, ArrowRight, Loader2, HardDrive } from 'lucide-react'

interface AuthFormProps {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
  onSignInWithGoogle: () => Promise<void>
  onContinueLocal?: () => void
}

export function AuthForm({ onSignIn, onSignUp, onSignInWithGoogle, onContinueLocal }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (isSignUp) {
        await onSignUp(email, password)
        setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.')
      } else {
        await onSignIn(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warm-100 via-warm-50 to-primary-50/40 p-4">
      <div className="w-full max-w-md animate-scale-in">
        {/* Header with NextStep Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center">
            <img src="/nextstep-logo-icon.png" alt="NextStep Logo" className="w-full h-full object-contain drop-shadow-sm" />
          </div>
          <div className="flex items-baseline justify-center font-black italic tracking-tighter text-3xl font-sans select-none">
            <span className="text-[#0F766E]">NE</span>
            <span className="text-[#FF7F50] mx-0.5">X</span>
            <span className="text-[#0F766E]">TSTEP</span>
          </div>
          <p className="text-slate-500 mt-2 text-sm font-medium">Votre copilote de recherche d'emploi</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-warm-500/10 border border-warm-200/80 p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6">
            {isSignUp ? 'Créer un compte' : 'Se connecter'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 text-xs">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary-700 text-white font-semibold text-sm hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 transition-all shadow-md shadow-primary-700/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "S'inscrire" : 'Se connecter'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-slate-500 text-xs">Ou continuer avec</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onSignInWithGoogle}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-warm-50 transition-colors shadow-xs cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>

            {onContinueLocal && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onContinueLocal}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-warm-100 hover:bg-warm-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer border border-warm-200/80"
                >
                  <HardDrive className="w-4 h-4 text-primary-700" />
                  Continuer en Mode Local (Sans Supabase)
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setSuccess(null)
              }}
              className="text-sm text-primary-700 hover:text-primary-800 font-medium transition-colors"
            >
              {isSignUp
                ? 'Déjà un compte ? Se connecter'
                : 'Pas encore de compte ? S\'inscrire'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
