import { Bookmark, GripHorizontal, Info } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function BookmarkletBanner() {
  const [showHelp, setShowHelp] = useState(false)
  const bookmarkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (bookmarkRef.current) {
      const origin = window.location.origin
      const code = `javascript:void((function(){function getSource(){var h=window.location.hostname;if(h.includes('linkedin'))return 'linkedin';if(h.includes('welcometothejungle')||h.includes('wttj'))return 'wttj';if(h.includes('indeed'))return 'indeed';return 'manuel';}function extractSingle(){var t=document.title||'',e='',u=window.location.href,loc='';var h=document.querySelector('meta[property="og:site_name"]');if(h)e=h.content;if(!e){var m=window.location.hostname;if(m.includes('linkedin'))e='LinkedIn';else if(m.includes('welcometothejungle')||m.includes('wttj'))e='WTTJ';else if(m.includes('indeed'))e='Indeed';else e=m.replace('www.','').split('.')[0];}var locMeta=document.querySelector('meta[property="og:locale"]')||document.querySelector('meta[name="geo.placename"]');if(locMeta)loc=locMeta.content;return[{title: t,company: e,url: u,location: loc,source: getSource()}];}function extractWTTJBatch(){var jobs=[];var cards=document.querySelectorAll('[data-testid="search-results-list-item-wrapper"]');if(cards.length===0)return null;cards.forEach(function(c){var a=c.querySelector('a');var url=a?a.href:'';var titleEl=c.querySelector('h4')||c.querySelector('[role="heading"]');var title=titleEl?titleEl.innerText.trim():'';var compEl=c.querySelector('span[title]')||c.querySelector('span');var company=compEl?compEl.innerText.trim():'';if(!company)company='WTTJ';var locEls=c.querySelectorAll('i + span');var loc='';if(locEls.length>0)loc=locEls[0].innerText.trim();if(title&&url){jobs.push({title:title,company:company,url:url,location:loc,source:'wttj'});}});return jobs.length>0 ? jobs : null;}function extractLinkedInBatch(){var jobs=[];var cards=document.querySelectorAll('li.jobs-search-results__list-item,.job-search-card');if(cards.length===0)return null;cards.forEach(function(c){var a=c.querySelector('a.job-card-list__title')||c.querySelector('.base-card__full-link');var url=a?a.href.split('?')[0]:'';var title=a?a.innerText.trim():'';var compEl=c.querySelector('.job-card-container__company-name')||c.querySelector('.hidden-nested-link');var company=compEl?compEl.innerText.trim():'';var locEl=c.querySelector('.job-card-container__metadata-item')||c.querySelector('.job-search-card__location');var loc=locEl?locEl.innerText.trim():'';if(title&&url){jobs.push({title:title,company:company,url:url,location:loc,source:'linkedin'});}});return jobs.length>0 ? jobs : null;}function extractIndeedBatch(){var jobs=[];var cards=document.querySelectorAll('.job_seen_beacon,.result');if(cards.length===0)return null;cards.forEach(function(c){var a=c.querySelector('a.jcs-JobTitle');var url=a?a.href:'';var title=a?a.innerText.trim():'';var compEl=c.querySelector('.companyName')||c.querySelector('[data-testid="company-name"]');var company=compEl?compEl.innerText.trim():'';var locEl=c.querySelector('.companyLocation')||c.querySelector('[data-testid="text-location"]');var loc=locEl?locEl.innerText.trim():'';if(title&&url){jobs.push({title:title,company:company,url:url,location:loc,source:'indeed'});}});return jobs.length>0 ? jobs : null;}var jobs=null;var s=getSource();if(s==='wttj')jobs=extractWTTJBatch();else if(s==='linkedin')jobs=extractLinkedInBatch();else if(s==='indeed')jobs=extractIndeedBatch();if(!jobs||jobs.length===0){jobs=extractSingle();}var appUrl='${origin}/offres';var encoded=encodeURIComponent(JSON.stringify(jobs));window.open(appUrl + '?import_batch=true#batch=' + encoded,'_blank');})());`
      bookmarkRef.current.setAttribute('href', code)
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
