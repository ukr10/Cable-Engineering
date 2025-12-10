import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Zap,
  Settings,
  ChevronDown,
  Menu,
  Plus,
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation()
  const [expandedMenu, setExpandedMenu] = React.useState<string | null>(null)

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Quick Access', icon: Menu, submenu: [
      { label: 'Cable Sizing', path: '/cable-sizing' },
      { label: 'Cable Routing', path: '/cable-routing' },
      { label: 'Tray Fill', path: '/tray-fill' },
      { label: 'Ductbank Fill', path: '/ductbank-fill' },
      { label: 'Conduit Fill', path: '/conduit-fill' },
      { label: 'Raceway Layout', path: '/raceway-layout' },
      { label: 'GA Layout', path: '/ga-layout' },
      { label: 'Equipment Library', path: '/equipment-library' },
      { label: 'Termination Manager', path: '/termination' },
      { label: 'Drum Estimation', path: '/drum-estimation' },
      { label: 'Cable Specifications', path: '/cable-spec' },
      { label: 'Cable Schedule', path: '/cable-schedule' },
      { label: 'ICS', path: '/ics' },
      { label: 'Reports', path: '/reports' },
    ] },
    { label: 'Project Setup', icon: Settings, path: '/project-setup' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} bg-slate-900/50 border-r border-cyan-500/20 h-screen overflow-y-auto transition-all duration-300 flex flex-col`}>
      {/* Header */}
      <div className="p-6 border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          {isOpen && <span className="font-bold text-white text-sm">SCEAP</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item, idx) => (
          <div key={idx}>
            {item.submenu ? (
              <button
                onClick={() => setExpandedMenu(expandedMenu === item.label ? null : item.label)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  expandedMenu === item.label
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && (
                  <>
                    <span className="flex-1 text-sm font-medium text-left">{item.label}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenu === item.label ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
            ) : (
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )}

            {/* Submenu */}
            {isOpen && expandedMenu === item.label && item.submenu && (
              <div className="ml-6 mt-2 space-y-1 border-l border-cyan-500/20 pl-3">
                {item.submenu.map((subitem, sidx) => (
                  <Link
                    key={sidx}
                    to={subitem.path}
                    className={`block px-3 py-2 rounded-lg text-xs transition-colors ${
                      isActive(subitem.path)
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-gray-500 hover:text-cyan-400'
                    }`}
                  >
                    {subitem.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {isOpen && (
        <div className="p-4 border-t border-cyan-500/20 space-y-2">
          <button className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />
            New Cable
          </button>
        </div>
      )}
    </div>
  )
}

export default Sidebar
