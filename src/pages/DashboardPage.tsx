import { useJobs } from '../hooks/useJobs'
import { KpiCards } from '../components/dashboard/KpiCards'
import { UrgentActions } from '../components/dashboard/UrgentActions'
import { RecentActivity } from '../components/dashboard/RecentActivity'

export function DashboardPage() {
  const { jobs, loading } = useJobs()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Vue d'ensemble de votre recherche d'emploi</p>
      </div>

      <KpiCards jobs={jobs} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UrgentActions jobs={jobs} />
        <RecentActivity jobs={jobs} />
      </div>
    </div>
  )
}
