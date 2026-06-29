import { useState, useMemo } from 'react'
import { useJobs } from '../hooks/useJobs'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { KanbanFilters } from '../components/kanban/KanbanFilters'
import { JobDrawer } from '../components/kanban/JobDrawer'
import { AddJobModal } from '../components/kanban/AddJobModal'
import type { Job } from '../types/database'

export function KanbanPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeContrat, setTypeContrat] = useState('')
  const [experienceRequise, setExperienceRequise] = useState('')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)

  const { jobs, loading, addJob, updateJob, deleteJob, moveJob } = useJobs({
    searchQuery: useMemo(() => searchQuery, [searchQuery]),
    typeContrat: useMemo(() => typeContrat, [typeContrat]),
    experienceRequise: useMemo(() => experienceRequise, [experienceRequise]),
  })

  const handleCardClick = (job: Job) => {
    setSelectedJob(job)
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setTimeout(() => setSelectedJob(null), 300)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pipeline</h2>
          <p className="text-sm text-slate-500 mt-1">{jobs.length} offre{jobs.length !== 1 ? 's' : ''} au total</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium shadow-md shadow-primary-200/50 hover:shadow-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
        >
          + Nouvelle offre
        </button>
      </div>

      <KanbanFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeContrat={typeContrat}
        onTypeContratChange={setTypeContrat}
        experienceRequise={experienceRequise}
        onExperienceChange={setExperienceRequise}
      />

      <KanbanBoard
        jobs={jobs}
        onCardClick={handleCardClick}
        onAddClick={() => setAddModalOpen(true)}
        onMoveJob={moveJob}
      />

      <JobDrawer
        job={selectedJob}
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        onSave={updateJob}
        onDelete={deleteJob}
      />

      <AddJobModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={addJob}
      />
    </div>
  )
}
