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
      // === STRATEGY 1: JSON-LD structured data (most reliable) ===
      var jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      var jobData = null;
      jsonLdScripts.forEach(function(script) {
        try {
          var data = JSON.parse(script.textContent);
          // Could be an array or single object
          var items = Array.isArray(data) ? data : [data];
          items.forEach(function(item) {
            if (item['@type'] === 'JobPosting' || (item['@type'] && item['@type'].includes && item['@type'].includes('JobPosting'))) {
              jobData = item;
            }
          });
        } catch(err) {}
      });

      if (jobData) {
        // Extract from JSON-LD
        if (jobData.title) t = jobData.title;
        if (jobData.hiringOrganization && jobData.hiringOrganization.name) e = jobData.hiringOrganization.name;
        if (jobData.jobLocation) {
          var jl = jobData.jobLocation;
          if (jl.address) {
            var addr = jl.address;
            loc = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(', ');
          } else if (jl.name) {
            loc = jl.name;
          }
        }
        if (jobData.description) {
          // JSON-LD description is often HTML, strip tags
          var tempDiv = document.createElement('div');
          tempDiv.innerHTML = jobData.description;
          desc = tempDiv.innerText.trim();
        }
        if (jobData.employmentType) {
          var empType = String(jobData.employmentType).toLowerCase();
          if (empType.includes('full_time') || empType.includes('full-time') || empType.includes('temps plein')) type_contrat = 'CDI';
          else if (empType.includes('contract') || empType.includes('cdd')) type_contrat = 'CDD';
          else if (empType.includes('intern') || empType.includes('stage')) type_contrat = 'Stage';
          else if (empType.includes('alternance') || empType.includes('apprenti')) type_contrat = 'Alternance';
        }
      }

      // === STRATEGY 2: DOM fallbacks for anything JSON-LD missed ===
      if (!t || t === document.title) {
        var titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title') || document.querySelector('h1.t-24') || document.querySelector('h2.t-24') || document.querySelector('h1');
        if (titleEl) t = titleEl.innerText.trim();
        else {
          var parts = document.title.split(' | ');
          if (parts.length >= 2) t = parts[0].trim();
        }
      }

      if (!e) {
        var companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name') || document.querySelector('.jobs-unified-top-card__company-name');
        if (companyEl) e = companyEl.innerText.trim();
        else {
          var parts2 = document.title.split(' | ');
          if (parts2.length >= 2) e = parts2[1].trim();
        }
      }

      if (!loc) {
        var locEl = document.querySelector('.job-details-jobs-unified-top-card__primary-description') || document.querySelector('.jobs-unified-top-card__primary-description');
        if (locEl) {
          var locTxt = locEl.innerText.trim();
          var splitLoc = locTxt.split('·');
          if (splitLoc.length >= 2) loc = splitLoc[0].trim();
          else loc = locTxt;
        }
      }

      if (!type_contrat) {
        // Scan ALL text on page for contract keywords
        var allSpans = document.querySelectorAll('span, button, li, div');
        allSpans.forEach(function(el) {
          if (type_contrat) return;
          var txt = (el.innerText || '').trim().toLowerCase();
          if (txt.length > 1 && txt.length < 40) {
            if (txt === 'temps plein' || txt === 'cdi') type_contrat = 'CDI';
            else if (txt === 'cdd' || txt === 'temps partiel') type_contrat = 'CDD';
            else if (txt === 'stage') type_contrat = 'Stage';
            else if (txt === 'alternance') type_contrat = 'Alternance';
            else if (txt === 'freelance') type_contrat = 'Freelance';
          }
        });
      }

      if (!desc) {
        // Try known selectors
        var descEl = document.querySelector('#job-details') || document.querySelector('.jobs-description-content__text') || document.querySelector('.jobs-description__container') || document.querySelector('.show-more-less-html__markup') || document.querySelector('.jobs-box__html-content');
        if (descEl) desc = descEl.innerText.trim();
      }
      if (!desc) {
        // Try meta description
        var metaDesc = document.querySelector('meta[name="description"]') || document.querySelector('meta[property="og:description"]');
        if (metaDesc && metaDesc.content && metaDesc.content.length > 50) desc = metaDesc.content;
      }
      if (!desc) {
        // Brute force: find the largest non-nav text block
        var bestBlock = null;
        var bestLen = 0;
        document.querySelectorAll('div, section, article').forEach(function(el) {
          var txt = el.innerText ? el.innerText.trim() : '';
          if (txt.length > 300 && txt.length < 15000 && txt.length > bestLen) {
            var tag = el.tagName.toLowerCase();
            var cls = String(el.className).toLowerCase();
            // Skip navigation, headers, sidebars
            if (cls.includes('nav') || cls.includes('header') || cls.includes('footer') || cls.includes('sidebar') || cls.includes('scaffold-layout__list')) return;
            bestLen = txt.length;
            bestBlock = txt;
          }
        });
        if (bestBlock) desc = bestBlock;
      }

      // Clean URL
      var shareBtn = document.querySelector('.jobs-share-box__clipboard-url');
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
