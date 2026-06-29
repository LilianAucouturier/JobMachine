import { Droppable } from '@hello-pangea/dnd'
import { Plus } from 'lucide-react'
import type { Job, PipelineStatus } from '../../types/database'
import { KanbanCard } from './KanbanCard'
import { cn } from '../../lib/utils'

interface KanbanColumnProps {
  status: PipelineStatus
  jobs: Job[]
  onCardClick: (job: Job) => void
  onAddClick: () => void
}

const columnStyles: Record<string, { dot: string; bg: string }> = {
  'Offres à analyser': { dot: 'bg-slate-400', bg: 'bg-slate-50' },
  'Préparation': { dot: 'bg-blue-400', bg: 'bg-blue-50/50' },
  'Candidature envoyée': { dot: 'bg-primary-500', bg: 'bg-primary-50/50' },
  'Relance J+7': { dot: 'bg-warning-500', bg: 'bg-warning-50/50' },
  'Entretien': { dot: 'bg-violet-500', bg: 'bg-violet-50/50' },
  'Offre reçue': { dot: 'bg-success-500', bg: 'bg-success-50/50' },
  'Refus': { dot: 'bg-danger-400', bg: 'bg-danger-50/30' },
}

export function KanbanColumn({ status, jobs, onCardClick, onAddClick }: KanbanColumnProps) {
  const style = columnStyles[status] || { dot: 'bg-slate-400', bg: 'bg-slate-50' }

  return (
    <div className={cn('flex flex-col w-72 shrink-0 rounded-2xl p-3', style.bg)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={cn('w-2.5 h-2.5 rounded-full', style.dot)} />
          <h3 className="text-sm font-semibold text-slate-700">{status}</h3>
          <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full shadow-sm">
            {jobs.length}
          </span>
        </div>
        {status === 'Offres à analyser' && (
          <button
            onClick={onAddClick}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary-600 hover:bg-white transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Droppable area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 space-y-2 min-h-[100px] rounded-xl p-1 transition-colors duration-200',
              snapshot.isDraggingOver && 'bg-primary-100/50'
            )}
          >
            {jobs.map((job, index) => (
              <KanbanCard
                key={job.id}
                job={job}
                index={index}
                onClick={() => onCardClick(job)}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
