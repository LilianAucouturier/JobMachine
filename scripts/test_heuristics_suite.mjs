/**
 * Suite de tests automatisés pour les Solutions 1, 2 et 3
 * Exécutable directement avec Node.js
 */

import assert from 'node:assert/strict'
import { predictSalary } from '../src/lib/extractor/salaryPredictor.ts'
import { parseStructuredJobPosting } from '../src/lib/extractor/structuredJobApi.ts'
import { ATS_AUTOFILL_RULES } from '../src/lib/extractor/atsAutofill.ts'
import { calculateMatchScore } from '../src/lib/extractor/atsHeuristics.ts'

console.log('🧪 ========================================================')
console.log('🧪 LANCEMENT DE LA SUITE DE TESTS NEXTSTEP (SOLUTIONS 1, 2, 3)')
console.log('🧪 ========================================================\n')

let passedTests = 0

// ---------------------------------------------------------------------------
// TEST SOLUTION 1 : MOTEUR D'AUTOFILL ATS (SIMPLIFY-STYLE)
// ---------------------------------------------------------------------------
console.log('👉 [Test Solution 1] : Heuristiques d\'Autofill ATS pour Workday & Greenhouse')

const mockProfile = {
  id: 'test-profile',
  nomComplet: 'Lilian Aucouturier',
  prenom: 'Lilian',
  nom: 'Aucouturier',
  email: 'lilian.aucouturier@ipsa.fr',
  telephone: '+33 6 12 34 56 78',
  ville: 'Paris',
  codePostal: '75013',
  linkedinUrl: 'https://linkedin.com/in/lilian-aucouturier',
  githubUrl: 'https://github.com/LilianAucouturier',
  portfolioUrl: 'https://lilian.dev',
  pretentionsSalariales: '44000',
  preavis: 'Immédiat',
  autorisationTravail: true,
  besoinSponsorshipVisa: false,
  statutHandicap: 'Non',
  permisB: true,
  formation: 'IPSA - Ingénieur Aéronautique & Spatial',
  titreProfessionnel: 'Ingénieur Systèmes Embarqués',
  anneesExperience: '0-1 an',
  secteursCibles: ['Aéronautique', 'Spatial', 'Systèmes Embarqués'],
  entreprisesCibles: ['Safran', 'Airbus', 'Thales'],
  competencesCles: ['C++', 'Python', 'DO-178C', 'Linux'],
  typesContratsRecherches: ['Stage', 'CDI'],
  cvTexteBrut: 'Compétences : C++, Python, DO-178C, Avionique, RTOS',
  lmTexteBrut: '',
  updatedAt: new Date().toISOString(),
}

// Simuler la détection des champs d'un formulaire Workday, Greenhouse & Lever (Simplify-Calibrated)
const simulatedAtsFormInputs = [
  { name: 'first_name', id: 'input-fname', hint: 'first_name Prénom', expectedVal: 'Lilian' },
  { name: 'lastName', id: 'input-lname', hint: 'lastName Nom de famille', expectedVal: 'Aucouturier' },
  { name: 'candidate_email', id: 'email', hint: 'candidate_email adresse email', expectedVal: 'lilian.aucouturier@ipsa.fr' },
  { name: 'phone_number', id: 'phone', hint: 'phone_number téléphone mobile', expectedVal: '+33 6 12 34 56 78' },
  { name: 'linkedin_profile_url', id: 'linkedin', hint: 'linkedin profil URL', expectedVal: 'https://linkedin.com/in/lilian-aucouturier' },
  { name: 'github_profile', id: 'github', hint: 'github code repository', expectedVal: 'https://github.com/LilianAucouturier' },
  { name: 'desired_salary_amount', id: 'salary', hint: 'desired_salary prétentions salariales', expectedVal: '44000' },
  { name: 'notice_period_duration', id: 'notice', hint: 'notice_period disponibilité', expectedVal: 'Immédiat' },
  { name: 'legally_authorized_to_work', id: 'workAuth', hint: 'authorized_to_work autorise a travailler', expectedVal: 'Oui' },
  { name: 'require_visa_sponsorship', id: 'visaSponsorship', hint: 'require_sponsorship besoin visa', expectedVal: 'Non' },
  // Nouveaux cas réels décompilés depuis Simplify (Workday & Lever) :
  { name: 'legalnamesection_firstname', id: 'legalname_fn', hint: 'legalnamesection_firstname', expectedVal: 'Lilian' },
  { name: 'addresssection_city', id: 'city_input', hint: 'addresssection_city', expectedVal: 'Paris' },
  { name: 'urls[linkedin]', id: 'lever_linkedin', hint: 'urls[linkedin]', expectedVal: 'https://linkedin.com/in/lilian-aucouturier' },
  { name: 'urls[github]', id: 'lever_github', hint: 'urls[github]', expectedVal: 'https://github.com/LilianAucouturier' },
]

for (const input of simulatedAtsFormInputs) {
  let matchedRule = null
  for (const rule of ATS_AUTOFILL_RULES) {
    if (rule.pattern.test(input.name) || rule.pattern.test(input.hint)) {
      matchedRule = rule
      break
    }
  }

  assert.ok(matchedRule, `Le champ ${input.name} aurait dû être détecté par l'autofill ATS`)
  const val = matchedRule.getValue(mockProfile)
  assert.equal(val, input.expectedVal, `La valeur pour ${input.name} doit être ${input.expectedVal}`)
  console.log(`  ✓ Champ identifié [${matchedRule.label}] -> "${val}"`)
}

passedTests++
console.log('✅ Solution 1 validée avec succès !\n')

// ---------------------------------------------------------------------------
// TEST SOLUTION 2 : PARSER STRUCTURÉ D'APIS & JSON-LD
// ---------------------------------------------------------------------------
console.log('👉 [Test Solution 2] : Décodeur d\'APIs Structurées & JSON-LD sans scraping CSS fragile')

const sampleJsonLdHtml = `
<html>
  <head>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "JobPosting",
        "title": "Ingénieur Logiciel Embarqué Critique F/H",
        "description": "<p>Conception sous norme DO-178C et bancs de test temps réel.</p>",
        "identifier": {
          "@type": "PropertyValue",
          "name": "Safran",
          "value": "SAF-2026-9988"
        },
        "hiringOrganization": {
          "@type": "Organization",
          "name": "Safran Electronics & Defense"
        },
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Massy",
            "addressRegion": "Île-de-France",
            "addressCountry": "France"
          }
        },
        "baseSalary": {
          "@type": "MonetaryAmount",
          "currency": "EUR",
          "value": {
            "@type": "QuantitativeValue",
            "minValue": 44000,
            "maxValue": 50000,
            "unitText": "YEAR"
          }
        },
        "employmentType": "FULL_TIME"
      }
    </script>
  </head>
</html>
`

const parsedJob = await parseStructuredJobPosting('https://safran-group.com/offres/12345', sampleJsonLdHtml)
assert.ok(parsedJob, 'L\'offre JSON-LD aurait dû être parsée avec succès')
assert.equal(parsedJob.titre, 'Ingénieur Logiciel Embarqué Critique F/H')
assert.equal(parsedJob.entreprise, 'Safran Electronics & Defense')
assert.equal(parsedJob.localisation, 'Massy, Île-de-France, France')
assert.equal(parsedJob.salaire, '44000 - 50000 EUR')
assert.equal(parsedJob.type_contrat, 'CDI')
console.log(`  ✓ Titre extrait : ${parsedJob.titre}`)
console.log(`  ✓ Entreprise extraite : ${parsedJob.entreprise}`)
console.log(`  ✓ Rémunération : ${parsedJob.salaire}`)
console.log(`  ✓ Localisation : ${parsedJob.localisation}`)

passedTests++
console.log('✅ Solution 2 validée avec succès !\n')

// ---------------------------------------------------------------------------
// TEST SOLUTION 3 : ESTIMATEUR DE SALAIRE PRÉDICTIF CLIENT-SIDE
// ---------------------------------------------------------------------------
console.log('👉 [Test Solution 3] : Estimateur Prédictif de Salaires (Teal-Style)')

// Cas 3.1 : Salaire explicite dans l'annonce
const explicitJob = {
  titre: 'Ingénieur C++',
  description: 'Nous proposons une rémunération attractive de 45k€ - 52k€ selon profil et expérience.',
  entreprise: 'Dassault Aviation',
}
const resExplicit = predictSalary(explicitJob)
assert.equal(resExplicit.isExplicit, true)
assert.equal(resExplicit.formatted, '45k€ - 52k€ / an')
assert.equal(resExplicit.confidence, 'certifiée')
console.log(`  ✓ Cas Explicite détecté : ${resExplicit.formatted} (${resExplicit.confidence})`)

// Cas 3.2 : Stage ingénieur chez Safran (non mentionné dans l'annonce)
const stageJob = {
  titre: 'Stage - Ingénieur Bancs de test et Avionique',
  type_contrat: 'Stage',
  localisation: 'Toulouse',
  entreprise: 'Safran',
  description: 'Missions sur calculateurs critiques de vol et validation temps réel.',
}
const resStage = predictSalary(stageJob)
assert.equal(resStage.period, 'mois')
assert.equal(resStage.isExplicit, false)
assert.ok(resStage.median >= 1100 && resStage.median <= 1600, 'La gratification prédite doit être conforme aux grands groupes aéro')
console.log(`  ✓ Cas Stage Aéro Safran : ${resStage.formatted} (Médiane : ${resStage.median}€/mois)`)
console.log(`    Facteurs : ${resStage.factors.join(' • ')}`)

// Cas 3.3 : CDI Ingénieur Systèmes Embarqués Junior à Paris
const cdiJuniorJob = {
  titre: 'Ingénieur Systèmes Embarqués Temps Réel',
  type_contrat: 'CDI',
  localisation: 'Paris (75)',
  experience_requise: '0-2 ans',
  entreprise: 'Thales',
  description: 'Développement C++ sous environnement Linux et RTOS sous contraintes DO-178C.',
}
const resJunior = predictSalary(cdiJuniorJob)
assert.equal(resJunior.period, 'an')
assert.ok(resJunior.min >= 42000 && resJunior.max <= 56000)
console.log(`  ✓ Cas CDI Junior Embarqué Paris : ${resJunior.formatted} (Médiane : ${resJunior.median}€/an)`)
console.log(`    Facteurs : ${resJunior.factors.join(' • ')}`)

// Cas 3.4 : Test du Match Score sémantique avec le profil
const matchScore = calculateMatchScore(cdiJuniorJob.description, mockProfile, cdiJuniorJob.titre, cdiJuniorJob.entreprise, cdiJuniorJob.type_contrat)
assert.ok(matchScore.score >= 80, 'Le profil IPSA avec C++, RTOS, DO-178C doit obtenir un score >= 80%')
console.log(`  ✓ Score Sémantique ATS calculé : ${matchScore.badgeText}`)
console.log(`    Compétences matchées : ${matchScore.matchedSkills.join(', ')}`)

passedTests++
console.log('\n🎉 ========================================================')
console.log(`🎉 TOUTES LES SOLUTIONS (1, 2, 3) ONT ÉTÉ TESTÉES ET VALIDÉES (${passedTests}/3) !`)
console.log('🎉 ========================================================')
