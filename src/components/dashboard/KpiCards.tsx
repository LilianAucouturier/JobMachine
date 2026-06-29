import { Send, TrendingUp, Clock, Briefcase } from 'lucide-react'
import type { Job } from '../../types/database'
import { cn } from '../../lib/utils'

interface KpiCardsProps {
  jobs: Job[]
}

export function KpiCards({ jobs }: KpiCardsProps) {
  const candidaturesEnvoyees = jobs.filter(
    (j) =>
      j.statut_pipeline === 'Candidature envoyée' ||
      j.statut_pipeline === 'Relance J+7' ||
      j.statut_pipeline === 'Entretien' ||
      j.statut_pipeline === 'Offre reçue' ||
      j.statut_pipeline === 'Refus'
  ).length

  const entretiens = jobs.filter((j) => j.statut_pipeline === 'Entretien').length
  const enCours = jobs.filter(
    (j) => j.statut_pipeline !== 'Offre reçue' && j.statut_pipeline !== 'Refus'
  ).length

  const tauxTransformation =
    candidaturesEnvoyees > 0
      ? Math.round((entretiens / candidaturesEnvoyees) * 100)
      : 0

  const kpis = [
    {
      label: 'Candidatures envoyées',
      value: candidaturesEnvoyees,
      icon: Send,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-100',
    },
    {
      label: 'Taux de transformation',
      value: `${tauxTransformation}%`,
      icon: TrendingUp,
      color: 'text-success-600',
      bgColor: 'bg-success-50',
      borderColor: 'border-success-100',
    },
    {
      label: 'Entretiens',
      value: entretiens,
      icon: Clock,
      color: 'text-warning-600',
      bgColor: 'bg-warning-50',
      borderColor: 'border-warning-100',
    },
    {
      label: 'Offres en cours',
      value: enCours,
      icon: Briefcase,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <div
          key={kpi.label}
          className={cn(
            'bg-white rounded-2xl border p-5 transition-all duration-300 hover:shadow-md animate-fade-in',
            kpi.borderColor
          )}
          style={{ animationDelay: `${idx * 80}ms` }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', kpi.bgColor)}>
              <kpi.icon className={cn('w-5 h-5', kpi.color)} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800">{kpi.value}</div>
          <p className="text-sm text-slate-500 mt-0.5">{kpi.label}</p>
        </div>
      ))}
    </div>
  )
}
