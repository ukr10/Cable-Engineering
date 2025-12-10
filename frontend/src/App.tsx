import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Dashboard from './pages/Dashboard'
import CableSizing from './pages/CableSizing'
import ProjectSetup from './pages/ProjectSetup'
import CableRouting from './pages/CableRouting'
import TrayFill from './pages/TrayFill'
import RacewayLayout from './pages/RacewayLayout'
import DrumEstimation from './pages/DrumEstimation'
import TerminationManager from './pages/TerminationManager'
import Reports from './pages/Reports'
import Sidebar from './components/Sidebar'

function App() {
   const [sidebarOpen] = useState(true)

  return (
    <Router>
      <div className="flex h-screen bg-slate-950">
        <Sidebar isOpen={sidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cable-sizing" element={<CableSizing />} />
              <Route path="/project-setup" element={<ProjectSetup />} />
              <Route path="/cable-routing" element={<CableRouting />} />
              <Route path="/tray-fill" element={<TrayFill />} />
              <Route path="/raceway-layout" element={<RacewayLayout />} />
              <Route path="/drum-estimation" element={<DrumEstimation />} />
              <Route path="/termination" element={<TerminationManager />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
