import { Bookmark, GripHorizontal, Info } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const BOOKMARKLET_CODE = `javascript:void(function(){var t=document.title||'',e='',u=encodeURIComponent(window.location.href),h=document.querySelector('meta[property="og:site_name"]');if(h)e=h.content;if(!e){var m=window.location.hostname;if(m.includes('linkedin'))e='LinkedIn';else if(m.includes('welcometothejungle')||m.includes('wttj'))e='WTTJ';else if(m.includes('indeed'))e='Indeed';else e=m.replace('www.','').split('.')[0]}var s='manuel';if(window.location.hostname.includes('linkedin'))s='linkedin';else if(window.location.hostname.includes('welcometothejungle')||window.location.hostname.includes('wttj'))s='wttj';else if(window.location.hostname.includes('indeed'))s='indeed';var loc='';var locMeta=document.querySelector('meta[property="og:locale"]')||document.querySelector('meta[name="geo.placename"]');if(locMeta)loc=locMeta.content;window.open('https://job-machine-indol.vercel.app/offres?import=true&titre='+encodeURIComponent(t)+'&entreprise='+encodeURIComponent(e)+'&url='+u+'&source='+s+'&localisation='+encodeURIComponent(loc),'_blank')}())`

export function BookmarkletBanner() {
  const [showHelp, setShowHelp] = useState(false)
  const bookmarkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (bookmarkRef.current) {
      bookmarkRef.current.setAttribute('href', BOOKMARKLET_CODE)
    }
  }, [])

  return (
    <div className="bg-gradient-to-r from-primary-50 to-violet-50 rounded-2xl border border-primary-200/50 p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow-md shadow-primary-200">
          <Bookmark className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">
            Importer en 1 clic depuis n'importe quel site
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Glissez le bouton ci-dessous dans votre barre de favoris. Quand vous êtes sur une offre d'emploi, cliquez dessus !
          </p>

          <div className="flex items-center gap-3 mt-3">
            {/* The actual bookmarklet link */}
            <a
              ref={bookmarkRef}
              onClick={(e) => e.preventDefault()}
              draggable
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-xs font-semibold shadow-md shadow-primary-200/50 cursor-grab active:cursor-grabbing hover:from-primary-700 hover:to-primary-800 transition-all select-none"
            >
              <GripHorizontal className="w-3.5 h-3.5" />
              📌 + JobMachine
            </a>

            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary-500 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              Comment ça marche ?
            </button>
          </div>

          {showHelp && (
            <div className="mt-3 p-3 rounded-xl bg-white/80 border border-slate-100 text-xs text-slate-600 space-y-1.5 animate-fade-in">
              <p><strong>1.</strong> Glissez le bouton violet <strong>"📌 + JobMachine"</strong> dans votre barre de favoris (en haut du navigateur).</p>
              <p><strong>2.</strong> Rendez-vous sur un site d'offres d'emploi (LinkedIn, Welcome to the Jungle, Indeed...).</p>
              <p><strong>3.</strong> Ouvrez une offre qui vous intéresse.</p>
              <p><strong>4.</strong> Cliquez sur <strong>"📌 + JobMachine"</strong> dans vos favoris.</p>
              <p><strong>5.</strong> L'offre apparaîtra automatiquement ici avec le titre et l'entreprise pré-remplis !</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
