/**
 * Décodeur et Client d'APIs Structurées & JSON-LD pour Offres d'Emploi
 * Permet l'extraction Zero-Cost directe via les APIs publiques et les états JSON hydratés
 * (évite la fragilité des sélecteurs CSS HTML qui changent régulièrement).
 */

export interface StructuredJobData {
  titre: string
  entreprise: string
  url: string
  localisation: string
  remote: string
  salaire: string
  type_contrat: string
  experience_requise: string
  description: string
  source: string
  reference?: string
  rawJson?: any
}

/**
 * Tente d'extraire les métadonnées d'une offre via les APIs REST publiques
 * et les formats de données structurées sans nécessiter de headless browser lourd.
 */
export async function parseStructuredJobPosting(url: string, htmlContent?: string): Promise<StructuredJobData | null> {
  const normalizedUrl = url.trim()

  // 1. Détection GREENHOUSE (API REST Publique Gratuite)
  // Format d'URL : https://boards.greenhouse.io/{company}/jobs/{id} ou https://job-boards.greenhouse.io/{company}/jobs/{id}
  const ghMatch = normalizedUrl.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/i)
  if (ghMatch) {
    const [, boardToken, jobId] = ghMatch
    try {
      const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}`
      const res = await fetch(apiUrl, { headers: { Accept: 'application/json' } })
      if (res.ok) {
        const data = await res.json()
        const cleanDesc = (data.content || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        return {
          titre: data.title || '',
          entreprise: boardToken.charAt(0).toUpperCase() + boardToken.slice(1),
          url: normalizedUrl,
          localisation: data.location?.name || '',
          remote: data.location?.name?.toLowerCase().includes('remote') ? 'Télétravail total' : 'Non spécifié',
          salaire: '',
          type_contrat: 'CDI',
          experience_requise: '-',
          description: cleanDesc,
          source: 'Greenhouse API',
          reference: String(jobId),
          rawJson: data,
        }
      }
    } catch (e) {
      console.warn('Greenhouse API direct fetch failed, falling back:', e)
    }
  }

  // 2. Détection LEVER (API REST Publique Gratuite)
  // Format d'URL : https://jobs.lever.co/{company}/{id}
  const leverMatch = normalizedUrl.match(/jobs\.lever\.co\/([^/]+)\/([a-f0-9-]+)/i)
  if (leverMatch) {
    const [, company, postingId] = leverMatch
    try {
      const apiUrl = `https://api.lever.co/v0/postings/${company}/${postingId}`
      const res = await fetch(apiUrl, { headers: { Accept: 'application/json' } })
      if (res.ok) {
        const data = await res.json()
        const cleanDesc = (data.descriptionPlain || data.description || '')
          .replace(/<[^>]+>/g, ' ')
          .trim()

        return {
          titre: data.text || '',
          entreprise: company.charAt(0).toUpperCase() + company.slice(1),
          url: normalizedUrl,
          localisation: data.categories?.location || '',
          remote: data.workplaceType || (data.categories?.location?.toLowerCase().includes('remote') ? 'Télétravail total' : 'Non spécifié'),
          salaire: data.salaryRange ? `${data.salaryRange.min} - ${data.salaryRange.max} ${data.salaryRange.currency}` : '',
          type_contrat: data.categories?.commitment || 'CDI',
          experience_requise: '-',
          description: cleanDesc,
          source: 'Lever API',
          reference: postingId,
          rawJson: data,
        }
      }
    } catch (e) {
      console.warn('Lever API direct fetch failed, falling back:', e)
    }
  }

  // 3. Détection WELCOME TO THE JUNGLE (__NEXT_DATA__ ou API Publique)
  // Format d'URL : https://www.welcometothejungle.com/fr/companies/{company}/jobs/{job_slug}
  const wttjMatch = normalizedUrl.match(/welcometothejungle\.com\/(?:[a-z]{2}\/)?companies\/([^/]+)\/jobs\/([^/?#]+)/i)
  if (wttjMatch) {
    const [, companySlug, jobSlug] = wttjMatch
    // Si du HTML est fourni, parser l'objet __NEXT_DATA__ qui contient tout le JSON hydraté
    if (htmlContent) {
      try {
        const nextDataMatch = htmlContent.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i)
        if (nextDataMatch && nextDataMatch[1]) {
          const nextData = JSON.parse(nextDataMatch[1])
          const job = nextData?.props?.pageProps?.job || nextData?.props?.pageProps?.initialApolloState
          if (job) {
            const orgName = job.organization?.name || companySlug
            const salary = job.salary_minimum && job.salary_maximum
              ? `${Math.round(job.salary_minimum / 1000)}k€ - ${Math.round(job.salary_maximum / 1000)}k€ / an`
              : ''

            return {
              titre: job.name || '',
              entreprise: orgName,
              url: normalizedUrl,
              localisation: job.office?.city ? `${job.office.city}, ${job.office.country || 'France'}` : '',
              remote: job.remote === 'fulltime' ? 'Télétravail total' : job.remote === 'partial' ? 'Hybride' : 'Sur site',
              salaire: salary,
              type_contrat: (job.contract_type || 'CDI').toUpperCase(),
              experience_requise: job.experience_level || '-',
              description: (job.description || '').replace(/<[^>]+>/g, ' ').trim(),
              source: 'WTTJ API/State',
              reference: job.reference || job.slug || jobSlug,
              rawJson: job,
            }
          }
        }
      } catch (e) {
        console.warn('WTTJ __NEXT_DATA__ extraction error:', e)
      }
    }
  }

  // 4. Décodeur Standard JSON-LD Schema.org (LinkedIn, Indeed, et nombreux sites carrières)
  if (htmlContent) {
    try {
      const jsonLdRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi
      let match: RegExpExecArray | null
      while ((match = jsonLdRegex.exec(htmlContent)) !== null) {
        try {
          const parsed = JSON.parse(match[1])
          const items = Array.isArray(parsed) ? parsed : [parsed]
          for (const item of items) {
            if (item['@type'] === 'JobPosting' || (Array.isArray(item['@type']) && item['@type'].includes('JobPosting'))) {
              const orgName = item.hiringOrganization?.name || ''
              let location = ''
              if (item.jobLocation?.address) {
                const a = item.jobLocation.address
                location = [a.addressLocality, a.addressRegion, a.addressCountry].filter(Boolean).join(', ')
              } else if (item.jobLocation?.name) {
                location = item.jobLocation.name
              }

              let salaryStr = ''
              if (item.baseSalary) {
                const s = item.baseSalary
                const val = s.value || {}
                const currency = s.currency || 'EUR'
                if (val.minValue && val.maxValue) {
                  salaryStr = `${val.minValue} - ${val.maxValue} ${currency}`
                } else if (val.value) {
                  salaryStr = `${val.value} ${currency}`
                }
              }

              let contractType = 'CDI'
              if (item.employmentType) {
                const emp = String(item.employmentType).toLowerCase()
                if (emp.includes('intern') || emp.includes('stage')) contractType = 'Stage'
                else if (emp.includes('apprent') || emp.includes('altern')) contractType = 'Alternance'
                else if (emp.includes('contract') || emp.includes('cdd')) contractType = 'CDD'
                else if (emp.includes('part_time') || emp.includes('part-time')) contractType = 'Temps partiel'
              }

              const cleanDesc = (item.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

              return {
                titre: item.title || '',
                entreprise: orgName,
                url: normalizedUrl,
                localisation: location,
                remote: item.jobLocationType === 'TELECOMMUTE' ? 'Télétravail total' : 'Non spécifié',
                salaire: salaryStr,
                type_contrat: contractType,
                experience_requise: item.experienceRequirements || '-',
                description: cleanDesc,
                source: 'Schema.org JSON-LD',
                reference: item.identifier?.value || '',
                rawJson: item,
              }
            }
          }
        } catch {}
      }
    } catch (e) {
      console.warn('JSON-LD schema parser error:', e)
    }
  }

  return null
}
