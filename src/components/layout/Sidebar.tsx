import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface SidebarItem {
  label: string
  path: string
  icon?: string
}

interface SidebarProps {
  items: SidebarItem[]
  isCollapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ items, isCollapsed = false, onToggle }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r-2 border-gray-200 min-h-screen transition-all duration-300`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          {!isCollapsed && <h2 className="text-lg font-bold text-gray-800">Menu</h2>}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            title={isCollapsed ? 'Expandir menu' : 'Colapsar menu'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <nav className="space-y-2">
          {items.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                {isCollapsed ? item.label.charAt(0) : item.label}
              </button>
            )
          })}
        </nav>
      </div>
      {!isCollapsed && (
        <div className="absolute bottom-0 w-64 p-6 border-t-2 border-gray-200">
          <div className="text-sm text-gray-500">
            <p>Usuário: {user?.nome}</p>
            <p>Papel: <span className="capitalize">{user?.papel}</span></p>
          </div>
        </div>
      )}
    </aside>
  )
}
