import { Search, Filter, X, Heart } from 'lucide-react'
import { CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../../lib/utils'
import { cn } from '../../lib/utils'

const OFFER_SOURCES = [
  { value: '', label: 'Toutes les sources' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'wttj', label: 'WTTJ' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'manuel', label: 'Manuel' },
  { value: 'bookmarklet', label: 'Bookmarklet' },
]

interface OffersFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  typeContrat: string
  onTypeContratChange: (value: string) => void
  experienceRequise: string
  onExperienceChange: (value: string) => void
  source: string
  onSourceChange: (value: string) => void
  showBookmarkedOnly: boolean
  onToggleBookmarked: () => void
}

export function OffersFilters({
  searchQuery,
  onSearchChange,
  typeContrat,
  onTypeContratChange,
  experienceRequise,
  onExperienceChange,
  source,
  onSourceChange,
  showBookmarkedOnly,
  onToggleBookmarked,
}: OffersFiltersProps) {
  const hasActiveFilters = typeContrat || experienceRequise || source || showBookmarkedOnly

  const clearFilters = () => {
    onTypeContratChange('')
    onExperienceChange('')
    onSourceChange('')
    if (showBookmarkedOnly) onToggleBookmarked()
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher par titre, entreprise, localisation, mots-clés..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
          />
        </div>

        {/* Bookmarked only toggle */}
        <button
          onClick={onToggleBookmarked}
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
            showBookmarkedOnly
              ? 'border-danger-300 bg-danger-50 text-danger-600'
              : 'border-slate-200 bg-white text-slate-500 hover:border-danger-200 hover:text-danger-500'
          )}
          title="Afficher les favoris uniquement"
        >
          <Heart className={cn('w-4 h-4', showBookmarkedOnly && 'fill-current')} />
          Favoris
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />

        {/* Contract type pills */}
        {CONTRACT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => onTypeContratChange(typeContrat === type ? '' : type)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              typeContrat === type
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            )}
          >
            {type}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-200" />

        {/* Source filter */}
        <select
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
        >
          {OFFER_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Experience filter */}
        <select
          value={experienceRequise}
          onChange={(e) => onExperienceChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
        >
          <option value="">Toute expérience</option>
          {EXPERIENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-danger-500 hover:bg-danger-50 transition-all"
          >
            <X className="w-3 h-3" />
            Effacer
          </button>
        )}
      </div>
    </div>
  )
}
