import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface SidebarItem {
  label: string
  path: string
  icon: string
}

interface SidebarProps {
  items: SidebarItem[]
}

export function Sidebar({ items }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <aside className="w-64 bg-white border-r-2 border-gray-200 min-h-screen">
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Menu</h2>
        <nav className="space-y-2">
          {items.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
      <div className="absolute bottom-0 w-64 p-6 border-t-2 border-gray-200">
        <div className="text-sm text-gray-500">
          <p>Usuário: {user?.nome}</p>
          <p>Papel: <span className="capitalize">{user?.papel}</span></p>
        </div>
      </div>
    </aside>
  )
}
