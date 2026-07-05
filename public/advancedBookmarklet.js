(function(){
  function getSource() {
    var h=window.location.hostname;
    if(h.includes('linkedin')) return 'linkedin';
    if(h.includes('welcometothejungle')||h.includes('wttj')) return 'wttj';
    if(h.includes('indeed')) return 'indeed';
    return 'manuel';
  }
  
  function extractSingle() {
    var t=document.title||'',e='',u=window.location.href,loc='',desc='';
    var s=getSource();
    
    if(s==='linkedin') {
      var parts = t.split(' | ');
      if(parts.length >= 2) {
        t = parts[0];
        e = parts[1];
      }
      var descEl=document.querySelector('.jobs-description__container') || document.querySelector('.show-more-less-html__markup');
      if(descEl) desc=descEl.innerText.trim();
    } else {
      var h=document.querySelector('meta[property="og:site_name"]');
      if(h) e=h.content;
      if(!e) {
        var m=window.location.hostname;
        if(m.includes('welcometothejungle')||m.includes('wttj')) e='WTTJ';
        else if(m.includes('indeed')) e='Indeed';
        else e=m.replace('www.','').split('.')[0];
      }
    }

    var locMeta=document.querySelector('meta[property="og:locale"]')||document.querySelector('meta[name="geo.placename"]');
    if(locMeta) loc=locMeta.content;
    return [{ title: t, company: e, url: u, location: loc, source: s, description: desc }];
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
    var jobs=[];
    var cards=document.querySelectorAll('li.jobs-search-results__list-item, .job-search-card, .job-card-container');
    if(cards.length===0) return null;
    cards.forEach(function(c){
      var a=c.querySelector('a.job-card-list__title') || c.querySelector('.base-card__full-link') || c.querySelector('a[data-control-id]');
      var url=a?a.href.split('?')[0]:'';
      var title=a?a.innerText.trim():'';
      var compEl=c.querySelector('.job-card-container__company-name') || c.querySelector('.hidden-nested-link') || c.querySelector('.artdeco-entity-lockup__subtitle');
      var company=compEl?compEl.innerText.trim():'';
      var locEl=c.querySelector('.job-card-container__metadata-item') || c.querySelector('.job-search-card__location') || c.querySelector('.artdeco-entity-lockup__caption');
      var loc=locEl?locEl.innerText.trim():'';
      if(title && url) {
        jobs.push({title:title, company:company, url:url, location:loc, source:'linkedin'});
      }
    });
    return jobs.length>0 ? jobs : null;
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
