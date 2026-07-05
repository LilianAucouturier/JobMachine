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
        // locTxt is often "Company · Location · Date"
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
      
      // Keep actual URL if available from share button
      var shareBtn = rightPane.querySelector('.jobs-share-box__clipboard-url');
      if (shareBtn && shareBtn.value) u = shareBtn.value.split('?')[0];
      else {
        // Try to construct clean URL from currentJobId
        var urlParams = new URLSearchParams(window.location.search);
        var currentJobId = urlParams.get('currentJobId');
        if (currentJobId) u = 'https://www.linkedin.com/jobs/view/' + currentJobId;
        else u = u.split('?')[0];
      }

    } else {
      var h=document.querySelector('meta[property="og:site_name"]');
      if(h) e=h.content;
      if(!e) {
        var m=window.location.hostname;
        if(m.includes('welcometothejungle')||m.includes('wttj')) e='WTTJ';
        else if(m.includes('indeed')) e='Indeed';
        else e=m.replace('www.','').split('.')[0];
      }
      var locMeta=document.querySelector('meta[property="og:locale"]')||document.querySelector('meta[name="geo.placename"]');
      if(locMeta) loc=locMeta.content;
    }

    return [{ title: t, company: e, url: u, location: loc, source: s, description: desc, type_contrat: type_contrat }];
  }

  function extractWTTJBatch() {
    var jobs=[];
    var cards=document.querySelectorAll('[data-testid="search-results-list-item-wrapper"]');
    if(cards.length===0) return null;
    cards.forEach(function(c){
      var a=c.querySelector('a');
      var url=a?a.href:'';
      var titleEl=c.querySelector('h4') || c.querySelector('[role="heading"]');
      var title=titleEl?titleEl.innerText.trim():'';
      var compEl=c.querySelector('span[title]') || c.querySelector('span');
      var company=compEl?compEl.innerText.trim():'';
      if(!company) company='WTTJ';
      var locEls=c.querySelectorAll('i + span');
      var loc='';
      if(locEls.length>0) loc=locEls[0].innerText.trim();
      
      if(title && url) {
        jobs.push({title:title, company:company, url:url, location:loc, source:'wttj'});
      }
    });
    return jobs.length>0 ? jobs : null;
  }

  function extractLinkedInBatch() {
    // Disabled batch extraction for LinkedIn per user request
    return null;
  }

  function extractIndeedBatch() {
    var jobs=[];
    var cards=document.querySelectorAll('.job_seen_beacon, .result');
    if(cards.length===0) return null;
    cards.forEach(function(c){
      var a=c.querySelector('a.jcs-JobTitle');
      var url=a?a.href:'';
      var title=a?a.innerText.trim():'';
      var compEl=c.querySelector('.companyName') || c.querySelector('[data-testid="company-name"]');
      var company=compEl?compEl.innerText.trim():'';
      var locEl=c.querySelector('.companyLocation') || c.querySelector('[data-testid="text-location"]');
      var loc=locEl?locEl.innerText.trim():'';
      if(title && url) {
        jobs.push({title:title, company:company, url:url, location:loc, source:'indeed'});
      }
    });
    return jobs.length>0 ? jobs : null;
  }

  var jobs = null;
  var s=getSource();
  if(s==='wttj') jobs=extractWTTJBatch();
  else if(s==='linkedin') jobs=extractLinkedInBatch();
  else if(s==='indeed') jobs=extractIndeedBatch();
  
  if(!jobs || jobs.length===0) {
    jobs = extractSingle();
  }

  var appUrl = 'https://job-machine-indol.vercel.app/offres';
  var encoded = encodeURIComponent(JSON.stringify(jobs));
  window.open(appUrl + '?import_batch=true#batch=' + encoded, '_blank');
})();
