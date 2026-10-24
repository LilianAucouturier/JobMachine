/**
 * Extracteur universel de texte pour CV et Lettres de Motivation
 * Supporte : .pdf, .txt, .md, .json
 */

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  if (extension === 'txt' || extension === 'md' || extension === 'json') {
    return await file.text()
  }

  if (extension === 'pdf') {
    try {
      const pdfjs = await import('pdfjs-dist')
      // Désactiver le worker externe pour éviter tout conflit de build Vite
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = ''
      }
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
      } as any)
      const pdf = await loadingTask.promise
      let fullText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
        fullText += pageText + '\n\n'
      }

      const trimmed = fullText.trim()
      if (trimmed.length > 20) {
        return trimmed
      }
    } catch (err) {
      console.warn('Extraction PDF via pdfjs-dist a échoué, essai extraction binaire textuelle:', err)
    }

    // Fallback de secours : tentative de récupération des flux de texte ASCII/UTF-8 du PDF
    try {
      const buffer = await file.arrayBuffer()
      const decoder = new TextDecoder('utf-8', { fatal: false })
      const raw = decoder.decode(buffer)
      const matches = raw.match(/\(([^()]{2,100})\)Tj/g) || []
      if (matches.length > 5) {
        return matches.map((m) => m.slice(1, -3)).join(' ')
      }
    } catch {
      // Ignorer
    }

    throw new Error('Impossible de lire le contenu de ce PDF automatiquement. Veuillez copier-coller le texte directement.')
  }

  return await file.text()
}
