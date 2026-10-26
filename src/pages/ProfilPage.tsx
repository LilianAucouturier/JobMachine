import { useState, useRef } from 'react'
import {
  FileText,
  UploadCloud,
  Sparkles,
  Check,
  Building2,
  Briefcase,
  GraduationCap,
  Layers,
  Save,
  X,
  FileCheck,
  Loader2,
  Zap,
} from 'lucide-react'
import { localDb } from '../lib/localDb'
import {
  type CandidateProfile,
  analyzeCandidateDocuments,
} from '../lib/careerOps'
import { extractTextFromFile } from '../lib/pdfExtractor'
import { CONTRACT_TYPES } from '../lib/utils'

export function ProfilPage() {
  const [profile, setProfile] = useState<CandidateProfile>(() =>
    localDb.getCandidateProfile()
  )
  const [cvLoading, setCvLoading] = useState(false)
  const [lmLoading, setLmLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Inputs pour ajout rapide de tags
  const [newCompany, setNewCompany] = useState('')
  const [newSector, setNewSector] = useState('')
  const [newSkill, setNewSkill] = useState('')

  const cvInputRef = useRef<HTMLInputElement>(null)
  const lmInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File, type: 'cv' | 'lm') => {
    if (!file) return
    if (type === 'cv') setCvLoading(true)
    else setLmLoading(true)

    try {
      const text = await extractTextFromFile(file)
      if (type === 'cv') {
        const updated = localDb.saveCandidateProfile({
          cvTexteBrut: text,
          cvNomFichier: file.name,
        })
        setProfile(updated)
      } else {
        const updated = localDb.saveCandidateProfile({
          lmTexteBrut: text,
          lmNomFichier: file.name,
        })
        setProfile(updated)
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Erreur lors de la lecture du fichier.')
    } finally {
      if (type === 'cv') setCvLoading(false)
      else setLmLoading(false)
    }
  }

  const handleAutoAnalyze = () => {
    if (!profile.cvTexteBrut && !profile.lmTexteBrut) {
      alert("Veuillez d'abord déposer un CV ou une lettre de motivation (ou coller le texte).")
      return
    }

    setAnalyzing(true)
    setTimeout(() => {
      const extracted = analyzeCandidateDocuments(
        profile.cvTexteBrut || '',
        profile.lmTexteBrut || ''
      )

      const merged: CandidateProfile = {
        ...profile,
        titreProfessionnel: extracted.titreProfessionnel || profile.titreProfessionnel,
        formation: extracted.formation || profile.formation,
        secteursCibles: extracted.secteursCibles?.length
          ? Array.from(new Set([...(profile.secteursCibles || []), ...extracted.secteursCibles]))
          : profile.secteursCibles,
        entreprisesCibles: extracted.entreprisesCibles?.length
          ? Array.from(new Set([...(profile.entreprisesCibles || []), ...extracted.entreprisesCibles]))
          : profile.entreprisesCibles,
        competencesCles: extracted.competencesCles?.length
          ? Array.from(new Set([...(profile.competencesCles || []), ...extracted.competencesCles]))
          : profile.competencesCles,
        updatedAt: new Date().toISOString(),
      }

      localDb.saveCandidateProfile(merged)
      setProfile(merged)
      setAnalyzing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3500)
    }, 600)
  }

  const handleSave = () => {
    localDb.saveCandidateProfile(profile)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const addTag = (field: 'entreprisesCibles' | 'secteursCibles' | 'competencesCles', value: string, clearFn: (s: string) => void) => {
    const val = value.trim()
    if (!val) return
    const currentList = profile[field] || []
    if (!currentList.includes(val)) {
      const updated = { ...profile, [field]: [...currentList, val] }
      setProfile(updated)
      localDb.saveCandidateProfile(updated)
    }
    clearFn('')
  }

  const removeTag = (field: 'entreprisesCibles' | 'secteursCibles' | 'competencesCles', item: string) => {
    const updated = {
      ...profile,
      [field]: (profile[field] || []).filter((i) => i !== item),
    }
    setProfile(updated)
    localDb.saveCandidateProfile(updated)
  }

  const toggleContractType = (type: string) => {
    const current = profile.typesContratsRecherches || []
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type]
    const p = { ...profile, typesContratsRecherches: updated }
    setProfile(p)
    localDb.saveCandidateProfile(p)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-coral-500" />
            Mon CV & Profil IA
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Déposez votre CV et votre lettre de motivation. NextStep adapte automatiquement le scoring
            Career-Ops, analyse vos compétences et personnalise vos candidatures pour n'importe quel métier ou secteur.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAutoAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white text-sm font-semibold shadow-md shadow-coral-500/25 transition-all cursor-pointer"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Analyser mes documents
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold shadow-md shadow-primary-700/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Enregistrer
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          Profil et documents enregistrés avec succès ! Le moteur IA Career-Ops est maintenant synchronisé avec votre CV.
        </div>
      )}

      {/* Grid : Dropzones CV et Lettre de Motivation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dropzone CV */}
        <div className="bg-white rounded-3xl border border-warm-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-700" />
                Mon Curriculum Vitae (CV)
              </h3>
              {profile.cvNomFichier && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Fichier actif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Importez votre CV au format <strong>PDF</strong>, Word, Markdown ou Texte pour alimenter le matching sémantique.
            </p>

            <div
              onClick={() => cvInputRef.current?.click()}
              className="border-2 border-dashed border-warm-300 hover:border-primary-600 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-warm-50/50 hover:bg-primary-50/20 group"
            >
              <input
                ref={cvInputRef}
                type="file"
                accept=".pdf,.txt,.md,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileUpload(f, 'cv')
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-warm-200 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                {cvLoading ? (
                  <Loader2 className="w-6 h-6 text-primary-700 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-primary-700" />
                )}
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {cvLoading ? 'Lecture et extraction...' : profile.cvNomFichier || 'Glissez votre CV ici ou cliquez'}
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, TXT, Markdown jusqu'à 10 Mo</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-warm-100">
            <details className="text-xs text-slate-600">
              <summary className="font-semibold text-primary-800 hover:text-primary-900 cursor-pointer select-none">
                {profile.cvTexteBrut ? 'Visualiser / Éditer le texte extrait du CV' : 'Coller le texte du CV manuellement'}
              </summary>
              <textarea
                value={profile.cvTexteBrut}
                onChange={(e) => setProfile({ ...profile, cvTexteBrut: e.target.value })}
                placeholder="Collez ici le texte de votre CV si vous n'avez pas de fichier..."
                rows={6}
                className="w-full mt-2 p-3 rounded-xl border border-warm-200 bg-warm-50/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </details>
          </div>
        </div>

        {/* Dropzone LM */}
        <div className="bg-white rounded-3xl border border-warm-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-coral-600" />
                Lettre de Motivation Type (LM)
              </h3>
              {profile.lmNomFichier && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Fichier actif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Votre lettre de base servira d'ADN rédactionnel pour que l'IA génère des lettres sur-mesure pour chaque offre.
            </p>

            <div
              onClick={() => lmInputRef.current?.click()}
              className="border-2 border-dashed border-warm-300 hover:border-coral-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-warm-50/50 hover:bg-coral-50/20 group"
            >
              <input
                ref={lmInputRef}
                type="file"
                accept=".pdf,.txt,.md,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileUpload(f, 'lm')
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-warm-200 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                {lmLoading ? (
                  <Loader2 className="w-6 h-6 text-coral-600 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-coral-600" />
                )}
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {lmLoading ? 'Lecture et extraction...' : profile.lmNomFichier || 'Glissez votre lettre type ici ou cliquez'}
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, TXT, Markdown jusqu'à 10 Mo</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-warm-100">
            <details className="text-xs text-slate-600">
              <summary className="font-semibold text-coral-700 hover:text-coral-800 cursor-pointer select-none">
                {profile.lmTexteBrut ? 'Visualiser / Éditer le texte de la lettre type' : 'Coller le texte de la lettre manuellement'}
              </summary>
              <textarea
                value={profile.lmTexteBrut}
                onChange={(e) => setProfile({ ...profile, lmTexteBrut: e.target.value })}
                placeholder="Collez ici votre lettre de motivation type..."
                rows={6}
                className="w-full mt-2 p-3 rounded-xl border border-warm-200 bg-warm-50/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
            </details>
          </div>
        </div>
      </div>

      {/* Profil Candidat Structuré (Critères IA) */}
      <div className="bg-white rounded-3xl border border-warm-200/80 p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-700" />
            Paramètres du Profil Utilisateur pour le Matching IA
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ces critères sont utilisés par le moteur Career-Ops pour comparer les offres d'emploi à votre profil.
          </p>
        </div>

        {/* Ligne 1 : Nom, Titre & Formation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Votre Nom & Prénom</label>
            <input
              type="text"
              value={profile.nomComplet}
              onChange={(e) => setProfile({ ...profile, nomComplet: e.target.value })}
              placeholder="Ex: Alexandre Dupont"
              className="w-full px-3.5 py-2 rounded-xl border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Poste / Intitulé Cible *</label>
            <input
              type="text"
              value={profile.titreProfessionnel}
              onChange={(e) => setProfile({ ...profile, titreProfessionnel: e.target.value })}
              placeholder="Ex: Ingénieur Systèmes Embarqués"
              className="w-full px-3.5 py-2 rounded-xl border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Formation & Diplôme</label>
            <input
              type="text"
              value={profile.formation}
              onChange={(e) => setProfile({ ...profile, formation: e.target.value })}
              placeholder="Ex: IPSA - Diplôme d'Ingénieur"
              className="w-full px-3.5 py-2 rounded-xl border border-warm-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
        </div>

        {/* Contrats recherchés */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Types de contrat ciblés :</label>
          <div className="flex flex-wrap gap-2">
            {CONTRACT_TYPES.map((type) => {
              const active = profile.typesContratsRecherches?.includes(type)
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleContractType(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    active
                      ? 'bg-primary-50 text-primary-800 border-primary-300 shadow-xs'
                      : 'bg-warm-50 text-slate-600 border-warm-200 hover:bg-warm-100'
                  }`}
                >
                  {active ? `✓ ${type}` : `+ ${type}`}
                </button>
              )
            })}
          </div>
        </div>

        {/* Entreprises Cibles Favorites */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary-700" />
              Mes Entreprises Cibles Favorites (Boost de score automatique) :
            </label>
            <span className="text-[11px] text-slate-400">Ex: Safran, Airbus, Dassault, LVMH, Google...</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-2">
            {profile.entreprisesCibles?.map((comp) => (
              <span
                key={comp}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-50 text-primary-800 border border-primary-200 text-xs font-semibold"
              >
                {comp}
                <button
                  type="button"
                  onClick={() => removeTag('entreprisesCibles', comp)}
                  className="hover:text-danger-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 max-w-sm">
            <input
              type="text"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag('entreprisesCibles', newCompany, setNewCompany)
                }
              }}
              placeholder="Ajouter une entreprise cible..."
              className="flex-1 px-3 py-1.5 rounded-xl border border-warm-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
            <button
              type="button"
              onClick={() => addTag('entreprisesCibles', newCompany, setNewCompany)}
              className="px-3 py-1.5 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold cursor-pointer"
            >
              Ajouter
            </button>
          </div>
        </div>

        {/* Secteurs Cibles */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-coral-600" />
              Mes Secteurs & Industries de Prédilection :
            </label>
            <span className="text-[11px] text-slate-400">Ex: Aéronautique, Spatial, Défense, Tech, Santé...</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-2">
            {profile.secteursCibles?.map((sec) => (
              <span
                key={sec}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-coral-50 text-coral-800 border border-coral-200 text-xs font-semibold"
              >
                {sec}
                <button
                  type="button"
                  onClick={() => removeTag('secteursCibles', sec)}
                  className="hover:text-danger-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 max-w-sm">
            <input
              type="text"
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag('secteursCibles', newSector, setNewSector)
                }
              }}
              placeholder="Ajouter un secteur..."
              className="flex-1 px-3 py-1.5 rounded-xl border border-warm-200 text-xs focus:outline-none focus:ring-2 focus:ring-coral-500"
            />
            <button
              type="button"
              onClick={() => addTag('secteursCibles', newSector, setNewSector)}
              className="px-3 py-1.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-xs font-semibold cursor-pointer"
            >
              Ajouter
            </button>
          </div>
        </div>

        {/* Compétences Clés (ATS Matcher) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-sage-700" />
              Mes Compétences Clés (Hard & Soft Skills reconnues par l'ATS) :
            </label>
            <span className="text-[11px] text-slate-400">{profile.competencesCles?.length || 0} compétences listées</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2 max-h-36 overflow-y-auto p-2 bg-warm-50/50 rounded-2xl border border-warm-200/60">
            {profile.competencesCles?.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-warm-200 text-xs font-medium shadow-2xs"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeTag('competencesCles', skill)}
                  className="hover:text-danger-600"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 max-w-sm">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag('competencesCles', newSkill, setNewSkill)
                }
              }}
              placeholder="Ajouter une compétence..."
              className="flex-1 px-3 py-1.5 rounded-xl border border-warm-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
            <button
              type="button"
              onClick={() => addTag('competencesCles', newSkill, setNewSkill)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold cursor-pointer"
            >
              Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* Données Autofill pour Formulaires ATS (Simplify-Style) */}
      <div className="bg-white rounded-3xl border border-warm-200/80 p-6 shadow-xs space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Données de Candidature & Autofill ATS (Simplify-Style)
            </h3>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-800 border border-primary-200">
              ⚡ Compatible Workday, Greenhouse, Lever
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ces informations sont utilisées par le bookmarklet <strong>« ⚡ Remplir Candidature ATS »</strong> pour auto-remplir vos formulaires en 1 clic.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email de contact</label>
            <input
              type="email"
              value={profile.email || ''}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="ex: candidat@ipsa.fr"
              className="w-full px-3.5 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-primary-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={profile.telephone || ''}
              onChange={(e) => setProfile({ ...profile, telephone: e.target.value })}
              placeholder="ex: +33 6 12 34 56 78"
              className="w-full px-3.5 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-primary-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ville</label>
            <input
              type="text"
              value={profile.ville || ''}
              onChange={(e) => setProfile({ ...profile, ville: e.target.value })}
              placeholder="ex: Paris, Toulouse..."
              className="w-full px-3.5 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-primary-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Code Postal</label>
            <input
              type="text"
              value={profile.codePostal || ''}
              onChange={(e) => setProfile({ ...profile, codePostal: e.target.value })}
              placeholder="ex: 75013, 31000..."
              className="w-full px-3.5 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-primary-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Profil LinkedIn URL</label>
            <input
              type="url"
              value={profile.linkedinUrl || ''}
              onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
              placeholder="https://linkedin.com/in/votre-nom"
              className="w-full px-3.5 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-primary-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">GitHub / GitLab URL</label>
            <input
              type="url"
              value={profile.githubUrl || ''}
              onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
              placeholder="https://github.com/votre-pseudo"
              className="w-full px-3.5 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-primary-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Portfolio / Site Web</label>
            <input
              type="url"
              value={profile.portfolioUrl || ''}
              onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
              placeholder="https://votre-site.dev"
              className="w-full px-3.5 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-primary-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-warm-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Prétentions salariales (€ brut/an)</label>
            <input
              type="text"
              value={profile.pretentionsSalariales || ''}
              onChange={(e) => setProfile({ ...profile, pretentionsSalariales: e.target.value })}
              placeholder="ex: 42000"
              className="w-full px-3.5 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-primary-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Préavis / Disponibilité</label>
            <input
              type="text"
              value={profile.preavis || ''}
              onChange={(e) => setProfile({ ...profile, preavis: e.target.value })}
              placeholder="ex: Immédiat, 1 mois..."
              className="w-full px-3.5 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-primary-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={profile.autorisationTravail !== false}
                onChange={(e) => setProfile({ ...profile, autorisationTravail: e.target.checked })}
                className="w-4 h-4 text-primary-700 rounded border-warm-300 focus:ring-primary-600 cursor-pointer"
              />
              Autorisé à travailler en France/UE
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
