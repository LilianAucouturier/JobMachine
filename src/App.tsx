import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { KanbanPage } from './pages/KanbanPage'
import { ContactsPage } from './pages/ContactsPage'
import { OffresPage } from './pages/OffresPage'
import { ProfilPage } from './pages/ProfilPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="offres" element={<OffresPage />} />
          <Route path="kanban" element={<KanbanPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="profil" element={<ProfilPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

