import { Clock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Job } from '../../types/database'
import { formatRelativeDate } from '../../lib/utils'
import { cn } from '../../lib/utils'

interface RecentActivityProps {
  jobs: Job[]
}

const statusColors: Record<string, string> = {
  'Candidature envoyée': 'bg-primary-100 text-primary-800',
  'Relance J+7': 'bg-warning-100 text-warning-700',
  'Entretien': 'bg-coral-100 text-coral-700 font-semibold',
  'Offre reçue': 'bg-success-100 text-success-700',
  'Refus': 'bg-danger-100 text-danger-700',
}

export function RecentActivity({ jobs }: RecentActivityProps) {
  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.date_derniere_action).getTime() - new Date(a.date_derniere_action).getTime())
    .slice(0, 8)

  return (
    <div className="bg-white rounded-2xl border border-warm-200/80 p-6 shadow-xs">
      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary-700" />
        Activité récente
      </h3>
      {recentJobs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">Aucune activité pour le moment</p>
          <p className="text-xs text-slate-400 mt-1">Commencez par ajouter des offres dans le Pipeline</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentJobs.map((job) => (
            <Link
              key={job.id}
              to="/kanban"
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-warm-50/80 transition-colors group cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{job.titre}</p>
                <p className="text-xs text-slate-400">{job.entreprise} • {formatRelativeDate(job.date_derniere_action)}</p>
              </div>
              <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full shrink-0', statusColors[job.statut_pipeline] || 'bg-slate-100 text-slate-700')}>
                {job.statut_pipeline}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-700 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
