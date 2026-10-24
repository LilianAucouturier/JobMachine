import { useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Kanban, Users, Search, Download, Upload, HardDrive } from 'lucide-react'
import { localDb } from '../../lib/localDb'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/offres', icon: Search, label: 'Offres', end: false },
  { to: '/kanban', icon: Kanban, label: 'Pipeline', end: false },
  { to: '/contacts', icon: Users, label: 'Réseau & CRM', end: false },
]

export function Sidebar() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportBackup = () => {
    const json = localDb.exportAllData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jobmachine_backup_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content && localDb.importAllData(content)) {
        alert('Sauvegarde importée avec succès ! La page va se recharger.')
        window.location.reload()
      } else {
        alert("Fichier de sauvegarde invalide.")
      }
    }
    reader.readAsText(file)
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex flex-col z-30">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-200 overflow-hidden">
          <img src="/logo.png" alt="JobMachine Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">JobMachine</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}

        {/* Section Sauvegarde */}
        <div className="pt-6 pb-2">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Données locales</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              100% Autonome
            </span>
          </div>
          
          <button
            onClick={handleExportBackup}
            title="Télécharger une sauvegarde complète de vos offres et contacts au format JSON"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-primary-700 hover:bg-primary-50/60 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Sauvegarder (JSON)
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Restaurer des offres ou contacts depuis un fichier JSON"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-primary-700 hover:bg-primary-50/60 transition-colors"
          >
            <Upload className="w-4 h-4 text-slate-400" />
            Restaurer (JSON)
          </button>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100">
        <div className="px-3 py-2 flex items-center gap-2">
          <HardDrive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <p className="text-xs text-slate-500 font-medium truncate">Stockage local actif</p>
        </div>
      </div>
    </aside>
  )
}
