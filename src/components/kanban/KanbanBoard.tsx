import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { PIPELINE_COLUMNS } from '../../lib/utils'
import type { Job, PipelineStatus } from '../../types/database'
import { KanbanColumn } from './KanbanColumn'

interface KanbanBoardProps {
  jobs: Job[]
  onCardClick: (job: Job) => void
  onAddClick: () => void
  onMoveJob: (id: string, newStatus: PipelineStatus, newPosition: number) => Promise<unknown>
}

export function KanbanBoard({ jobs, onCardClick, onAddClick, onMoveJob }: KanbanBoardProps) {
  const jobsByColumn = PIPELINE_COLUMNS.reduce(
    (acc, col) => {
      acc[col] = jobs
        .filter((j) => j.statut_pipeline === col)
        .sort((a, b) => a.position_ordre - b.position_ordre)
      return acc
    },
    {} as Record<PipelineStatus, Job[]>
  )

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const { draggableId, destination } = result
    const newStatus = destination.droppableId as PipelineStatus
    const newPosition = destination.index

    onMoveJob(draggableId, newStatus, newPosition)
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {PIPELINE_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            jobs={jobsByColumn[status] || []}
            onCardClick={onCardClick}
            onAddClick={onAddClick}
          />
        ))}
      </div>
    </DragDropContext>
  )
}
