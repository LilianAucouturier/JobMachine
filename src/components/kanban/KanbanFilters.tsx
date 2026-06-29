import { Search, Filter, X } from 'lucide-react'
import { CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../../lib/utils'
import { cn } from '../../lib/utils'

interface KanbanFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  typeContrat: string
  onTypeContratChange: (type: string) => void
  experienceRequise: string
  onExperienceChange: (exp: string) => void
}

export function KanbanFilters({
  searchQuery,
  onSearchChange,
  typeContrat,
  onTypeContratChange,
  experienceRequise,
  onExperienceChange,
}: KanbanFiltersProps) {
  const hasFilters = searchQuery || typeContrat || experienceRequise

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[240px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher par titre, entreprise, mots-clés..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
        />
      </div>

      {/* Type contrat filter */}
      <div className="flex items-center gap-1">
        <Filter className="w-4 h-4 text-slate-400 mr-1" />
        <div className="flex gap-1">
          {CONTRACT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onTypeContratChange(typeContrat === type ? '' : type)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                typeContrat === type
                  ? 'bg-primary-100 text-primary-700 shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Experience filter */}
      <select
        value={experienceRequise}
        onChange={(e) => onExperienceChange(e.target.value)}
        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
      >
        <option value="">Toute expérience</option>
        {EXPERIENCE_LEVELS.map((level) => (
          <option key={level} value={level}>{level}</option>
        ))}
      </select>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={() => {
            onSearchChange('')
            onTypeContratChange('')
            onExperienceChange('')
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-danger-600 hover:bg-danger-50 transition-all"
        >
          <X className="w-3.5 h-3.5" />
          Effacer
        </button>
      )}
    </div>
  )
}
