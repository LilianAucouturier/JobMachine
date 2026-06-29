import { Draggable } from '@hello-pangea/dnd'
import { ExternalLink, GripVertical } from 'lucide-react'
import type { Job } from '../../types/database'
import { cn, daysSince } from '../../lib/utils'

interface KanbanCardProps {
  job: Job
  index: number
  onClick: () => void
}

const contractBadgeColors: Record<string, string> = {
  CDI: 'bg-emerald-100 text-emerald-700',
  CDD: 'bg-blue-100 text-blue-700',
  Alternance: 'bg-violet-100 text-violet-700',
  Stage: 'bg-amber-100 text-amber-700',
}

export function KanbanCard({ job, index, onClick }: KanbanCardProps) {
  const isUrgent =
    job.statut_pipeline === 'Candidature envoyée' &&
    job.date_envoi_candidature &&
    daysSince(job.date_envoi_candidature) >= 7

  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'bg-white rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all duration-200 group',
            snapshot.isDragging
              ? 'shadow-lg border-primary-300 rotate-1 scale-[1.02]'
              : 'shadow-sm hover:shadow-md hover:border-primary-200',
            isUrgent && 'border-danger-300 animate-pulse-border'
          )}
          onClick={onClick}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">
                  {job.titre}
                </h4>
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center hover:bg-primary-50 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-primary-500" />
                  </a>
                )}
              </div>
              {job.entreprise && (
                <p className="text-xs text-slate-500 mt-1">{job.entreprise}</p>
              )}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-md',
                    contractBadgeColors[job.type_contrat] || 'bg-slate-100 text-slate-600'
                  )}
                >
                  {job.type_contrat}
                </span>
                {job.version_cv && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                    CV: {job.version_cv}
                  </span>
                )}
                {isUrgent && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-danger-100 text-danger-700">
                    ⚠ Relancer !
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}
