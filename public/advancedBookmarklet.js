(function(){
  function getSource() {
    var h=window.location.hostname;
    if(h.includes('linkedin')) return 'linkedin';
    if(h.includes('welcometothejungle')||h.includes('wttj')) return 'wttj';
    if(h.includes('indeed')) return 'indeed';
    return 'manuel';
  }
  
  function extractSingle() {
    var t=document.title||'',e='',u=window.location.href,loc='',desc='', type_contrat='';
    var s=getSource();
    
    if(s==='linkedin') {
      var rightPane = document.querySelector('.job-view-layout') || document.querySelector('.jobs-search__job-details--container') || document;
      
      var titleEl = rightPane.querySelector('.job-details-jobs-unified-top-card__job-title') || rightPane.querySelector('h2.t-24') || rightPane.querySelector('h1');
      if (titleEl) t = titleEl.innerText.trim();
      else {
        var parts = t.split(' | ');
        if(parts.length >= 2) t = parts[0];
      }

      var companyEl = rightPane.querySelector('.job-details-jobs-unified-top-card__company-name') || rightPane.querySelector('.jobs-unified-top-card__company-name') || rightPane.querySelector('.app-aware-link');
      if (companyEl) e = companyEl.innerText.trim();
      else {
        var parts2 = document.title.split(' | ');
        if(parts2.length >= 2) e = parts2[1];
      }

      var locEl = rightPane.querySelector('.job-details-jobs-unified-top-card__primary-description') || rightPane.querySelector('.jobs-unified-top-card__primary-description');
      if (locEl) {
        var locTxt = locEl.innerText.trim();
        var splitLoc = locTxt.split('·');
        if (splitLoc.length >= 2) loc = splitLoc[1].trim();
        else loc = locTxt;
      }

      var insightEls = rightPane.querySelectorAll('.job-details-jobs-unified-top-card__job-insight span, .ui-label__text');
      insightEls.forEach(function(el) {
        var txt = el.innerText.trim().toLowerCase();
        if(txt.includes('temps plein')) type_contrat = 'CDI';
        else if(txt.includes('cdi')) type_contrat = 'CDI';
        else if(txt.includes('cdd')) type_contrat = 'CDD';
        else if(txt.includes('stage')) type_contrat = 'Stage';
        else if(txt.includes('alternance')) type_contrat = 'Alternance';
        else if(txt.includes('freelance')) type_contrat = 'Freelance';
      });

      var descEl=rightPane.querySelector('.jobs-description__container') || rightPane.querySelector('.show-more-less-html__markup');
      if(descEl) desc=descEl.innerText.trim();
      
      var shareBtn = rightPane.querySelector('.jobs-share-box__clipboard-url');
      if (shareBtn && shareBtn.value) u = shareBtn.value.split('?')[0];
      else {
        var urlParams = new URLSearchParams(window.location.search);
        var currentJobId = urlParams.get('currentJobId');
        if (currentJobId) u = 'https://www.linkedin.com/jobs/view/' + currentJobId;
        else u = u.split('?')[0];
      }

    } else if(s==='wttj') {
      var h=document.querySelector('meta[property="og:site_name"]');
      if(h) e=h.content; else e='WTTJ';
      
      var descEl2 = document.querySelector('[data-testid="job-section-description"]') || document.querySelector('article') || document.querySelector('main');
      if(descEl2) desc=descEl2.innerText.trim();

    } else if(s==='indeed') {
      var h2=document.querySelector('meta[property="og:site_name"]');
      if(h2) e=h2.content; else e='Indeed';

      var titleElInd = document.querySelector('h1') || document.querySelector('.jobsearch-JobInfoHeader-title');
      if(titleElInd) t = titleElInd.innerText.trim();

      var compElInd = document.querySelector('[data-testid="inlineHeader-companyName"]') || document.querySelector('.jobsearch-CompanyInfoContainer a');
      if(compElInd) e = compElInd.innerText.trim();

      var descElInd = document.getElementById('jobDescriptionText');
      if(descElInd) desc=descElInd.innerText.trim();
    } else {
      var h3=document.querySelector('meta[property="og:site_name"]');
      if(h3) e=h3.content;
      if(!e) {
        var m=window.location.hostname;
        e=m.replace('www.','').split('.')[0];
      }
    }

    if (!loc) {
      var locMeta=document.querySelector('meta[property="og:locale"]')||document.querySelector('meta[name="geo.placename"]');
      if(locMeta) loc=locMeta.content;
    }

    return [{ title: t, company: e, url: u, location: loc, source: s, description: desc, type_contrat: type_contrat }];
  }

  // Batch extraction is completely disabled per user request
  var jobs = extractSingle();

  var appUrl = 'https://job-machine-indol.vercel.app/offres';
  var encoded = encodeURIComponent(JSON.stringify(jobs));
  window.open(appUrl + '?import_batch=true#batch=' + encoded, '_blank');
})();
