import { AlertTriangle, ExternalLink, Clock } from 'lucide-react'
import type { Job } from '../../types/database'
import { daysSince, formatRelativeDate } from '../../lib/utils'

interface UrgentActionsProps {
  jobs: Job[]
}

export function UrgentActions({ jobs }: UrgentActionsProps) {
  const urgentJobs = jobs
    .filter(
      (j) =>
        j.statut_pipeline === 'Candidature envoyée' &&
        j.date_envoi_candidature &&
        daysSince(j.date_envoi_candidature) >= 7
    )
    .sort((a, b) => {
      const daysA = a.date_envoi_candidature ? daysSince(a.date_envoi_candidature) : 0
      const daysB = b.date_envoi_candidature ? daysSince(b.date_envoi_candidature) : 0
      return daysB - daysA
    })

  if (urgentJobs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning-500" />
          Urgences du jour
        </h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-success-50 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-success-500" />
          </div>
          <p className="text-sm text-slate-500">Aucune relance urgente 🎉</p>
          <p className="text-xs text-slate-400 mt-1">Toutes vos candidatures sont à jour</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-warning-500" />
        Urgences du jour
        <span className="ml-auto text-xs font-medium bg-danger-100 text-danger-700 px-2.5 py-1 rounded-full">
          {urgentJobs.length} relance{urgentJobs.length > 1 ? 's' : ''}
        </span>
      </h3>
      <div className="space-y-3">
        {urgentJobs.map((job) => {
          const days = job.date_envoi_candidature ? daysSince(job.date_envoi_candidature) : 0
          return (
            <div
              key={job.id}
              className="flex items-center gap-4 p-3 rounded-xl border border-danger-100 bg-danger-50/50 animate-fade-in"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{job.titre}</p>
                <p className="text-xs text-slate-500">
                  {job.entreprise} • Envoyée {job.date_envoi_candidature ? formatRelativeDate(job.date_envoi_candidature) : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-danger-600">
                  J+{days}
                </span>
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-white border border-danger-200 flex items-center justify-center hover:bg-danger-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-danger-600" />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
