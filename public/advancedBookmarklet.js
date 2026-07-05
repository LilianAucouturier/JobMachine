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
      var rightPane = document.querySelector('.job-view-layout') || document.querySelector('.jobs-search__job-details--container') || document.querySelector('.job-details-jobs-unified-top-card') || document;
      
      var titleEl = rightPane.querySelector('.job-details-jobs-unified-top-card__job-title') || rightPane.querySelector('h2.t-24') || rightPane.querySelector('h1.t-24') || rightPane.querySelector('h1');
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
        if (splitLoc.length >= 2) loc = splitLoc[0].trim();
        else loc = locTxt;
      }

      var insightEls = rightPane.querySelectorAll('.job-details-jobs-unified-top-card__job-insight span, .job-details-jobs-unified-top-card__job-insight-view-model span, .ui-label__text, .tvm__text, button, div.mt2 span');
      var extraInfosLi = [];
      insightEls.forEach(function(el) {
        var txt = el.innerText.trim();
        var txtLow = txt.toLowerCase();
        if(txtLow.includes('temps plein')) type_contrat = 'CDI';
        else if(txtLow.includes('cdi')) type_contrat = 'CDI';
        else if(txtLow.includes('cdd')) type_contrat = 'CDD';
        else if(txtLow.includes('stage')) type_contrat = 'Stage';
        else if(txtLow.includes('alternance')) type_contrat = 'Alternance';
        else if(txtLow.includes('freelance')) type_contrat = 'Freelance';
        
        if((txtLow.includes('€') || txtLow.includes('k€') || txtLow.includes('salaire')) && txt.length < 60) {
          if (!extraInfosLi.includes(txt)) extraInfosLi.push(txt);
        }
      });

      var descEl=rightPane.querySelector('#job-details') || rightPane.querySelector('.jobs-description-content__text') || rightPane.querySelector('.jobs-description__container') || rightPane.querySelector('.show-more-less-html__markup') || document.querySelector('#job-details') || document.querySelector('article');
      if(descEl) desc=descEl.innerText.trim();
      if(!desc) {
        var headings = document.querySelectorAll('h2');
        for(var i=0; i<headings.length; i++) {
          if(headings[i].innerText.includes('À propos de')) {
            desc = headings[i].parentElement.innerText.trim();
            break;
          }
        }
      }
      if(!desc) {
        var allDivs = document.querySelectorAll('div');
        for(var i=0; i<allDivs.length; i++) {
          if(allDivs[i].innerText && allDivs[i].innerText.includes("À propos de l'offre d'emploi") && allDivs[i].innerText.length > 500) {
             desc = allDivs[i].innerText.trim();
             break;
          }
        }
      }
      
      if (extraInfosLi.length > 0 && desc) {
        desc = "📌 Infos pratiques : " + extraInfosLi.join(' | ') + "\\n\\n" + desc;
      }
      
      var shareBtn = rightPane.querySelector('.jobs-share-box__clipboard-url');
      if (shareBtn && shareBtn.value) u = shareBtn.value.split('?')[0];
      else {
        var urlParams = new URLSearchParams(window.location.search);
        var currentJobId = urlParams.get('currentJobId');
        if (currentJobId) u = 'https://www.linkedin.com/jobs/view/' + currentJobId;
        else u = u.split('?')[0];
      }

    } else if(s==='wttj') {
      var titleElWt = document.querySelector('h1') || document.querySelector('[role="heading"]');
      if(titleElWt) t = titleElWt.innerText.trim();

      var docTitle = document.title || '';
      if(docTitle) {
        var tSplit = docTitle.split(' - ');
        if(tSplit.length >= 3) {
          if (!t) t = tSplit[0].trim();
          e = tSplit[1].trim();
          var rest = tSplit.slice(2).join(' - ').trim().toLowerCase();
          if(rest.includes('cdi')) type_contrat = 'CDI';
          else if(rest.includes('cdd')) type_contrat = 'CDD';
          else if(rest.includes('stage')) type_contrat = 'Stage';
          else if(rest.includes('alternance')) type_contrat = 'Alternance';
          else if(rest.includes('freelance')) type_contrat = 'Freelance';
          
          if(rest.includes(' à ')) loc = rest.split(/ à /i)[1].trim().split('|')[0].trim();
          else if (rest.includes(' in ')) loc = rest.split(/ in /i)[1].trim().split('|')[0].trim();
        }
      }

      var h=document.querySelector('meta[property="og:site_name"]');
      if(!e && h) e=h.content; 
      if(!e) e='WTTJ';
      
      var descEl2 = document.querySelector('[data-testid="job-section-description"]') || document.querySelector('article') || document.querySelector('main');
      if(descEl2) desc=descEl2.innerText.trim();

      var extraInfos = [];
      var metadataEls = document.querySelectorAll('span, p, li, div');
      metadataEls.forEach(function(el) {
        var txt = el.innerText.trim();
        var txtLow = txt.toLowerCase();
        if (txtLow.startsWith('salaire') || txtLow.startsWith('expérience') || txtLow.startsWith('télétravail') || txtLow.startsWith('éducation')) {
          if (!extraInfos.includes(txt) && txt.length < 60 && !txt.includes('\\n')) {
            extraInfos.push(txt);
          }
        }
      });
      if (extraInfos.length > 0 && desc) {
        desc = "📌 Infos pratiques : " + extraInfos.join(' | ') + "\\n\\n" + desc;
      }

    } else if(s==='indeed') {
      var docTitleInd = document.title || '';
      var pInd = docTitleInd.split(' - ');
      if (pInd.length >= 2) {
        t = pInd[0].trim();
        if (pInd.length >= 4) e = pInd[2].trim();
        else if (pInd.length === 3) e = pInd[1].trim(); 
      } else {
        var titleElInd = document.querySelector('h2.jobsearch-JobInfoHeader-title') || document.querySelector('h1');
        if(titleElInd) {
          t = titleElInd.innerText.trim();
          t = t.replace('- job post', '').trim();
        }
      }

      var h2=document.querySelector('meta[property="og:site_name"]');
      if(!e && h2) e=h2.content; 
      if(!e) e='Indeed';

      var compElInd = document.querySelector('[data-testid="inlineHeader-companyName"]') || document.querySelector('.jobsearch-CompanyInfoContainer a');
      if(compElInd) e = compElInd.innerText.trim();
      
      var locElInd = document.querySelector('[data-testid="inlineHeader-companyLocation"]') || document.querySelector('[data-testid="jobsearch-JobInfoHeader-companyLocation"]');
      if(locElInd) loc = locElInd.innerText.trim();

      var typeElInd = document.getElementById('jobDetailsSection');
      if(typeElInd) {
        var tTxt = typeElInd.innerText.toLowerCase();
        if(tTxt.includes('cdi') || tTxt.includes('temps plein')) type_contrat = 'CDI';
        else if(tTxt.includes('cdd')) type_contrat = 'CDD';
        else if(tTxt.includes('stage')) type_contrat = 'Stage';
        else if(tTxt.includes('alternance')) type_contrat = 'Alternance';
        else if(tTxt.includes('freelance')) type_contrat = 'Freelance';
      }

      var descElInd = document.getElementById('jobDescriptionText');
      if(descElInd) desc=descElInd.innerText.trim();
      
      var extraInfosInd = [];
      var indEls = document.querySelectorAll('#salaryInfoAndJobType span, #jobDetailsSection span');
      indEls.forEach(function(el) {
        var txt = el.innerText.trim();
        if ((txt.includes('€') || txt.includes('par an') || txt.includes('par mois')) && txt.length < 50) {
          if (!extraInfosInd.includes(txt)) extraInfosInd.push(txt);
        }
      });
      if (extraInfosInd.length > 0 && desc) {
        desc = "📌 Infos pratiques : " + extraInfosInd.join(' | ') + "\\n\\n" + desc;
      }
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
