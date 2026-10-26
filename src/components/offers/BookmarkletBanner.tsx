import { Bookmark, GripHorizontal, Info, Sparkles, Zap } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { generateUniversalBookmarkletCode } from '../../lib/extractor/atsHeuristics'
import { generateAutofillBookmarkletScript } from '../../lib/extractor/atsAutofill'
import { localDb } from '../../lib/localDb'

export function BookmarkletBanner() {
  const [showHelp, setShowHelp] = useState(false)
  const bookmarkRef = useRef<HTMLAnchorElement>(null)
  const autofillRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (bookmarkRef.current) {
      const origin = window.location.origin
      const bookmarkletCode = generateUniversalBookmarkletCode(origin)
      bookmarkRef.current.setAttribute('href', bookmarkletCode)
    }
    if (autofillRef.current) {
      const profile = localDb.getCandidateProfile()
      const autofillCode = generateAutofillBookmarkletScript(profile)
      autofillRef.current.setAttribute('href', autofillCode)
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
              Outils Navigateur 1-Clic : Extraction & Remplissage ATS (Simplify Copilot-Style)
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-coral-100 text-coral-800 border border-coral-200">
              <Sparkles className="w-3 h-3" /> Multi-ATS & Salaire
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Glissez ces boutons dans vos favoris pour automatiser votre recherche et vos candidatures (Workday, Greenhouse, Lever, WTTJ, LinkedIn).
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            {/* 1. Extraction d'offres */}
            <a
              ref={bookmarkRef}
              onClick={(e) => e.preventDefault()}
              draggable
              title="Glissez ce bouton dans vos favoris pour extraire les offres en 1 clic"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 text-white text-xs font-semibold shadow-md shadow-coral-500/25 cursor-grab active:cursor-grabbing hover:from-coral-600 hover:to-coral-700 transition-all select-none"
            >
              <GripHorizontal className="w-3.5 h-3.5" />
              📌 + NextStep (Extraire)
            </a>

            {/* 2. Autofill ATS */}
            <a
              ref={autofillRef}
              onClick={(e) => e.preventDefault()}
              draggable
              title="Glissez ce bouton dans vos favoris pour remplir automatiquement vos formulaires de candidature"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-800 text-white text-xs font-semibold shadow-md shadow-primary-700/25 cursor-grab active:cursor-grabbing hover:from-primary-700 hover:to-primary-900 transition-all select-none"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              ⚡ Remplir Candidature ATS
            </a>

            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary-600 transition-colors ml-auto"
            >
              <Info className="w-3.5 h-3.5" />
              Comment ça marche ?
            </button>
          </div>

          {showHelp && (
            <div className="mt-3 p-3.5 rounded-xl bg-white/95 border border-warm-200/80 text-xs text-slate-600 space-y-2 animate-fade-in shadow-xs">
              <p><strong>1. Extraire une offre :</strong> Sur LinkedIn, WTTJ, Indeed ou Workday, cliquez sur <strong>"📌 + NextStep"</strong>. L'intitulé, l'entreprise, le salaire estimé, le lieu et la description sont importés avec calcul du <strong>Match ATS</strong>.</p>
              <p><strong>2. Remplir une candidature :</strong> Sur un formulaire de candidature (Workday, Greenhouse, Lever, SmartRecruiters), cliquez sur <strong>"⚡ Remplir Candidature ATS"</strong>. Vos nom, coordonnées, liens, prétentions salariales et réponses légales sont auto-remplis instantanément !</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
