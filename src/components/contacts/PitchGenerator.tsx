import { useState, useEffect } from 'react'
import { Copy, Check, Sparkles, Plus, Trash2 } from 'lucide-react'
import type { Contact, PitchTemplate } from '../../types/database'
import { cn } from '../../lib/utils'

interface PitchGeneratorProps {
  contact: Contact | null
  templates: PitchTemplate[]
  onGeneratePitch: (templateContent: string, contact: { nom: string; entreprise: string; poste: string }) => string
  onAddTemplate: (template: { nom: string; contenu: string }) => Promise<unknown>
  onDeleteTemplate: (id: string) => Promise<void>
}

export function PitchGenerator({ contact, templates, onGeneratePitch, onAddTemplate, onDeleteTemplate }: PitchGeneratorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [generatedPitch, setGeneratedPitch] = useState('')
  const [copied, setCopied] = useState(false)
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id)
    }
  }, [templates, selectedTemplateId])

  useEffect(() => {
    if (contact && selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId)
      if (template) {
        const pitch = onGeneratePitch(template.contenu, {
          nom: contact.nom,
          entreprise: contact.entreprise,
          poste: contact.poste,
        })
        setGeneratedPitch(pitch)
      }
    } else {
      setGeneratedPitch('')
    }
  }, [contact, selectedTemplateId, templates, onGeneratePitch])

  const handleCopy = async () => {
    if (!generatedPitch) return
    await navigator.clipboard.writeText(generatedPitch)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return
    await onAddTemplate({ nom: newTemplateName, contenu: newTemplateContent })
    setNewTemplateName('')
    setNewTemplateContent('')
    setShowNewTemplate(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary-500" />
        G\u00e9n\u00e9rateur de Pitch
      </h3>

      {!contact ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">S\u00e9lectionnez un contact dans la table</p>
          <p className="text-xs text-slate-400 mt-1">Le pitch sera g\u00e9n\u00e9r\u00e9 automatiquement</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-50 border border-primary-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {contact.nom.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary-800 truncate">{contact.nom}</p>
              <p className="text-xs text-primary-600 truncate">{contact.entreprise} \u2022 {contact.poste}</p>
            </div>
          </div>

          {/* Template selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Template</label>
              <button
                onClick={() => setShowNewTemplate(!showNewTemplate)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Nouveau
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      selectedTemplateId === t.id
                        ? 'bg-primary-100 text-primary-700 shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {t.nom}
                  </button>
                  <button
                    onClick={() => { if (confirm('Supprimer ce template ?')) onDeleteTemplate(t.id) }}
                    className="w-5 h-5 rounded flex items-center justify-center hover:bg-danger-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-slate-300 hover:text-danger-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* New template form */}
          {showNewTemplate && (
            <div className="p-4 rounded-xl border border-primary-200 bg-primary-50/50 space-y-3 animate-fade-in">
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Nom du template"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
              <textarea
                value={newTemplateContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
                rows={4}
                placeholder="Contenu du template... Utilisez [Nom], [Entreprise], [Poste] comme variables."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all resize-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNewTemplate(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white transition-all">
                  Annuler
                </button>
                <button onClick={handleAddTemplate} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-all">
                  Sauvegarder
                </button>
              </div>
            </div>
          )}

          {/* Generated pitch */}
          {generatedPitch && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Pitch g\u00e9n\u00e9r\u00e9</label>
              <div className="relative">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {generatedPitch}
                </div>
                <button
                  onClick={handleCopy}
                  className={cn(
                    'absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    copied
                      ? 'bg-success-100 text-success-700'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200'
                  )}
                >
                  {copied ? (
                    <><Check className="w-3.5 h-3.5" /> Copi\u00e9 !</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copier</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
