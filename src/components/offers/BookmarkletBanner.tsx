import { Bookmark, GripHorizontal, Info, Sparkles } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { generateUniversalBookmarkletCode } from '../../lib/extractor/atsHeuristics'

export function BookmarkletBanner() {
  const [showHelp, setShowHelp] = useState(false)
  const bookmarkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (bookmarkRef.current) {
      const origin = window.location.origin
      const bookmarkletCode = generateUniversalBookmarkletCode(origin)
      bookmarkRef.current.setAttribute('href', bookmarkletCode)
    }
  }, [])

  return (
    <div className="bg-gradient-to-r from-warm-100/90 via-warm-50 to-primary-50/50 rounded-2xl border border-warm-200/80 p-5 shadow-xs">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shrink-0 shadow-md shadow-primary-700/20">
          <Bookmark className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">
              Importer en 1 clic depuis n'importe quel site (Simplify-Style)
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-coral-100 text-coral-800 border border-coral-200">
              <Sparkles className="w-3 h-3" /> Multi-ATS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Glissez le bouton ci-dessous dans vos favoris. Compatible <strong>LinkedIn, WTTJ, Indeed, Workday, Greenhouse, Lever, SmartRecruiters</strong>.
          </p>

          <div className="flex items-center gap-3 mt-3">
            {/* The actual bookmarklet link */}
            <a
              ref={bookmarkRef}
              onClick={(e) => e.preventDefault()}
              draggable
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 text-white text-xs font-semibold shadow-md shadow-coral-500/25 cursor-grab active:cursor-grabbing hover:from-coral-600 hover:to-coral-700 transition-all select-none"
            >
              <GripHorizontal className="w-3.5 h-3.5" />
              📌 + NextStep
            </a>

            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary-600 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              Comment ça marche ?
            </button>
          </div>

          {showHelp && (
            <div className="mt-3 p-3.5 rounded-xl bg-white/95 border border-warm-200/80 text-xs text-slate-600 space-y-2 animate-fade-in shadow-xs">
              <p><strong>1.</strong> Glissez le bouton corail <strong>"📌 + NextStep"</strong> dans votre barre de favoris (en haut de votre navigateur).</p>
              <p><strong>2.</strong> Ouvrez une offre sur <strong>LinkedIn, WTTJ, Indeed, ou un portail ATS d'entreprise (Workday, Greenhouse, Lever...)</strong>.</p>
              <p><strong>3.</strong> Cliquez sur <strong>"📌 + NextStep"</strong> dans vos favoris.</p>
              <p><strong>4.</strong> Le moteur extrait instantanément : intitulé exact, entreprise, salaire, télétravail/localisation et description brute.</p>
              <p><strong>5.</strong> L'offre apparaît dans NextStep avec calcul immédiat de votre <strong>Match ATS sémantique</strong> !</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
