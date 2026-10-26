/**
 * Moteur d'Autofill Universel pour Formulaires de Recrutement ATS (Simplify Copilot-Style)
 * Supporte : Workday, Greenhouse, Lever, SmartRecruiters, Ashby, Taleo, BambooHR, etc.
 * 100% exécutable côté client dans le navigateur.
 */

import type { CandidateProfile } from '../careerOps'

export interface AutofillRule {
  key: string
  label: string
  pattern: RegExp
  getValue: (p: CandidateProfile) => string | boolean | undefined
  type?: 'text' | 'select' | 'radio' | 'checkbox'
}

export const ATS_AUTOFILL_RULES: AutofillRule[] = [
  // --- IDENTITÉ ---
  {
    key: 'firstName',
    label: 'Prénom',
    pattern: /(first[_\s-]?name|pr[eé]nom|given[_\s-]?name|fname)/i,
    getValue: (p) => p.prenom || p.nomComplet.split(' ')[0] || '',
  },
  {
    key: 'lastName',
    label: 'Nom',
    pattern: /(last[_\s-]?name|nom([_\s-]?de[_\s-]?famille)?|family[_\s-]?name|surname|lname)/i,
    getValue: (p) => p.nom || p.nomComplet.split(' ').slice(1).join(' ') || '',
  },
  {
    key: 'fullName',
    label: 'Nom complet',
    pattern: /(full[_\s-]?name|nom[_\s-]?complet|candidate[_\s-]?name)/i,
    getValue: (p) => p.nomComplet || `${p.prenom || ''} ${p.nom || ''}`.trim(),
  },
  {
    key: 'email',
    label: 'Email',
    pattern: /(e[_\s-]?mail|courriel|adresse[_\s-]?e?mail)/i,
    getValue: (p) => p.email || '',
  },
  {
    key: 'phone',
    label: 'Téléphone',
    pattern: /(phone|t[eé]l[eé]phone|mobile|cell|num[eé]ro([_\s-]?de)?[_\s-]?t[eé]l)/i,
    getValue: (p) => p.telephone || '',
  },

  // --- LOCALISATION ---
  {
    key: 'city',
    label: 'Ville',
    pattern: /(city|ville|commune)/i,
    getValue: (p) => p.ville || 'Paris',
  },
  {
    key: 'postalCode',
    label: 'Code postal',
    pattern: /(postal[_\s-]?code|code[_\s-]?postal|zip)/i,
    getValue: (p) => p.codePostal || '75000',
  },
  {
    key: 'country',
    label: 'Pays',
    pattern: /(country|pays)/i,
    getValue: () => 'France',
  },

  // --- RÉSEAUX & LIENS ---
  {
    key: 'linkedin',
    label: 'Profil LinkedIn',
    pattern: /(linkedin|linked_in)/i,
    getValue: (p) => p.linkedinUrl || '',
  },
  {
    key: 'github',
    label: 'GitHub / GitLab',
    pattern: /(github|git_url|code_repository)/i,
    getValue: (p) => p.githubUrl || '',
  },
  {
    key: 'portfolio',
    label: 'Portfolio / Site Web',
    pattern: /(portfolio|website|site[_\s-]?web|personal[_\s-]?url)/i,
    getValue: (p) => p.portfolioUrl || p.githubUrl || '',
  },

  // --- CONDITIONS & RÉMUNÉRATION ---
  {
    key: 'desiredSalary',
    label: 'Prétentions salariales',
    pattern: /(salary|pr[eé]tentions|r[eé]mun[eé]ration|compensation|desired_salary)/i,
    getValue: (p) => p.pretentionsSalariales || '42000',
  },
  {
    key: 'noticePeriod',
    label: 'Préavis / Disponibilité',
    pattern: /(notice[_\s-]?period|pr[eé]avis|disponibilit[eé]|availability|start[_\s-]?date)/i,
    getValue: (p) => p.preavis || 'Immédiat',
  },

  // --- QUESTIONS LÉGALES & SPONSORSHIP (Simplify Specialized Rules) ---
  {
    key: 'workAuth',
    label: 'Autorisation de travail en France/UE',
    pattern: /(authorized_to_work|autoris[eé][_\s-]?a[_\s-]?travailler|legally_authorized|eligible_to_work)/i,
    getValue: (p) => (p.autorisationTravail !== false ? 'Oui' : 'Non'),
  },
  {
    key: 'visaRequirement',
    label: 'Besoin parrainage visa / sponsorship',
    pattern: /(require_sponsorship|visa_sponsorship|besoin[_\s-]?de[_\s-]?visa|sponsorship_required)/i,
    getValue: (p) => (p.besoinSponsorshipVisa ? 'Oui' : 'Non'),
  },
  {
    key: 'disability',
    label: 'Statut travailleur handicapé (RQTH / EEOC)',
    pattern: /(disability|handicap|rqth|disabilities)/i,
    getValue: (p) => p.statutHandicap || 'Non',
  },
  {
    key: 'driversLicense',
    label: 'Permis de conduire',
    pattern: /(driver[_\s-]?license|permis[_\s-]?de[_\s-]?conduire|permis[_\s-]?b)/i,
    getValue: (p) => (p.permisB !== false ? 'Oui' : 'Non'),
  },

  // --- FORMATION ---
  {
    key: 'school',
    label: 'École / Université',
    pattern: /(school|university|[eé]cole|universit[eé]|institution|college)/i,
    getValue: (p) => p.formation || 'IPSA',
  },
  {
    key: 'degree',
    label: 'Diplôme obtenu / visé',
    pattern: /(degree|dipl[oô]me|education_level|niveau[_\s-]?d_?[eé]tudes)/i,
    getValue: () => "Diplôme d'Ingénieur (Bac+5 / Master 2)",
  },
]

/**
 * Déclenche les événements synthétiques pour que React, Vue ou Angular détectent le changement
 */
function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set
  const prototype = Object.getPrototypeOf(element)
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value)
  } else if (valueSetter) {
    valueSetter.call(element, value)
  } else {
    element.value = value
  }

  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  element.dispatchEvent(new Event('blur', { bubbles: true }))
}

/**
 * Analyse et remplit automatiquement les champs d'un formulaire ATS
 * @returns Le nombre de champs modifiés et la liste de leurs labels
 */
export function autofillAtsForm(
  container: Document | HTMLElement = document,
  profile: CandidateProfile
): { filledCount: number; fields: string[] } {
  const inputs = Array.from(
    container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
    )
  )

  const filledFields: string[] = []

  for (const input of inputs) {
    // Si le champ a déjà une valeur utilisateur longue, on ne l'écrase pas sauf s'il est vide
    if (input.value && input.value.trim().length > 1 && input.type !== 'checkbox' && input.type !== 'radio') {
      continue
    }

    const identifiers = [
      input.id,
      input.name,
      input.getAttribute('placeholder') || '',
      input.getAttribute('aria-label') || '',
      input.getAttribute('autocomplete') || '',
      input.getAttribute('data-automation-id') || '',
    ].filter(Boolean).join(' ').toLowerCase()

    let labelText = ''
    if (input.id) {
      const labelEl = container.querySelector(`label[for="${input.id}"]`)
      if (labelEl) labelText = labelEl.textContent || ''
    }
    if (!labelText && input.closest('label')) {
      labelText = input.closest('label')?.textContent || ''
    }
    const fullSearch = `${identifiers} ${labelText}`.toLowerCase()

    for (const rule of ATS_FORM_MAPPINGS_EXTENDED) {
      if (rule.pattern.test(fullSearch) || rule.pattern.test(identifiers)) {
        const value = rule.getValue(profile)
        if (!value) continue

        if (input.tagName.toLowerCase() === 'select') {
          const select = input as HTMLSelectElement
          const strVal = String(value).toLowerCase()
          let matchedIndex = -1

          for (let i = 0; i < select.options.length; i++) {
            const opt = select.options[i]
            const optText = opt.text.toLowerCase()
            const optVal = opt.value.toLowerCase()
            if (optText.includes(strVal) || optVal.includes(strVal) || strVal.includes(optText)) {
              matchedIndex = i
              break
            }
          }

          if (matchedIndex >= 0) {
            select.selectedIndex = matchedIndex
            select.dispatchEvent(new Event('change', { bubbles: true }))
            filledFields.push(rule.label)
          }
        } else if (input.type === 'checkbox') {
          if (typeof value === 'boolean') {
            ;(input as HTMLInputElement).checked = value
            input.dispatchEvent(new Event('change', { bubbles: true }))
            filledFields.push(rule.label)
          }
        } else if (input.type === 'radio') {
          const radio = input as HTMLInputElement
          if (radio.value.toLowerCase() === String(value).toLowerCase()) {
            radio.checked = true
            radio.dispatchEvent(new Event('change', { bubbles: true }))
            filledFields.push(rule.label)
          }
        } else {
          setNativeValue(input, String(value))
          filledFields.push(rule.label)
        }

        break
      }
    }
  }

  return {
    filledCount: filledFields.length,
    fields: Array.from(new Set(filledFields)),
  }
}

export const ATS_FORM_MAPPINGS_EXTENDED = ATS_AUTOFILL_RULES

/**
 * Génère le script Bookmarklet 1-clic pour remplir n'importe quel formulaire ATS directement
 */
export function generateAutofillBookmarkletScript(profile: CandidateProfile): string {
  const profilePayload = JSON.stringify({
    prenom: profile.prenom || profile.nomComplet.split(' ')[0] || 'Candidat',
    nom: profile.nom || profile.nomComplet.split(' ').slice(1).join(' ') || '',
    nomComplet: profile.nomComplet,
    email: profile.email || 'candidat@email.com',
    telephone: profile.telephone || '+33 6 00 00 00 00',
    ville: profile.ville || 'Paris',
    codePostal: profile.codePostal || '75000',
    linkedinUrl: profile.linkedinUrl || '',
    githubUrl: profile.githubUrl || '',
    portfolioUrl: profile.portfolioUrl || '',
    pretentionsSalariales: profile.pretentionsSalariales || '42000',
    preavis: profile.preavis || 'Immédiat',
    formation: profile.formation || 'IPSA',
  })

  const code = `
(function(){
  var p = ${profilePayload};
  var rules = [
    { regex: /(first[_\s-]?name|pr[eé]nom|fname)/i, val: p.prenom },
    { regex: /(last[_\s-]?name|nom([_\s-]?de[_\s-]?famille)?|lname)/i, val: p.nom },
    { regex: /(full[_\s-]?name|nom[_\s-]?complet|candidate[_\s-]?name)/i, val: p.nomComplet },
    { regex: /(email|courriel)/i, val: p.email },
    { regex: /(phone|t[eé]l[eé]phone|mobile|cell)/i, val: p.telephone },
    { regex: /(city|ville|commune)/i, val: p.ville },
    { regex: /(postal|code[_\s-]?postal|zip)/i, val: p.codePostal },
    { regex: /(linkedin)/i, val: p.linkedinUrl },
    { regex: /(github)/i, val: p.githubUrl },
    { regex: /(portfolio|website|site[_\s-]?web)/i, val: p.portfolioUrl },
    { regex: /(salary|pr[eé]tentions|r[eé]mun[eé]ration)/i, val: p.pretentionsSalariales },
    { regex: /(notice|pr[eé]avis|disponibilit)/i, val: p.preavis },
    { regex: /(school|university|[eé]cole|universit)/i, val: p.formation },
    { regex: /(authorized_to_work|autoris[eé][_\s-]?a[_\s-]?travailler)/i, val: 'Oui' },
    { regex: /(require_sponsorship|besoin[_\s-]?de[_\s-]?visa)/i, val: 'Non' }
  ];

  function setVal(el, v) {
    var s = Object.getOwnPropertyDescriptor(el, 'value');
    var proto = Object.getPrototypeOf(el);
    var pSet = Object.getOwnPropertyDescriptor(proto, 'value');
    if (pSet && pSet.set) pSet.set.call(el, v);
    else if (s && s.set) s.set.call(el, v);
    else el.value = v;
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
    el.dispatchEvent(new Event('blur', {bubbles:true}));
  }

  var inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), select, textarea');
  var count = 0;
  inputs.forEach(function(el) {
    if (el.value && el.value.length > 1) return;
    var hint = (el.name + ' ' + el.id + ' ' + (el.placeholder || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('data-automation-id') || '')).toLowerCase();
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].val && rules[i].regex.test(hint)) {
        if (el.tagName === 'SELECT') {
          for (var j = 0; j < el.options.length; j++) {
            if (el.options[j].text.toLowerCase().indexOf(rules[i].val.toLowerCase()) >= 0) {
              el.selectedIndex = j;
              el.dispatchEvent(new Event('change', {bubbles:true}));
              count++;
              break;
            }
          }
        } else {
          setVal(el, rules[i].val);
          count++;
        }
        break;
      }
    }
  });

  var toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.padding = '14px 20px';
  toast.style.background = '#0F766E';
  toast.style.color = '#fff';
  toast.style.fontFamily = 'system-ui, sans-serif';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = 'bold';
  toast.style.borderRadius = '12px';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  toast.style.zIndex = '9999999';
  toast.innerText = '⚡ NextStep Autofill : ' + count + ' champ(s) rempli(s) avec succès !';
  document.body.appendChild(toast);
  setTimeout(function(){ toast.remove(); }, 3500);
})();
  `.replace(/\s+/g, ' ').trim()

  return `javascript:${encodeURI(code)}`
}
