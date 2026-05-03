import { ReactNode, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Header } from './Header'

interface ControllerLayoutProps {
  children: ReactNode
  title: string
}

const controllerMenuItems = [
  { label: 'Dashboard', path: '/controller/dashboard' },
  { label: 'Pastos', path: '/controller/pastos' },
  { label: 'Lotes', path: '/controller/lotes' },
  { label: 'Funcionários', path: '/controller/funcionarios' },
  { label: 'Insumos', path: '/controller/insumos' },
  { label: 'Mineral', path: '/controller/mineral' },
  { label: 'Proteinado', path: '/controller/proteinado' },
  { label: 'Ração', path: '/controller/racao' },
  { label: 'Dietas', path: '/controller/dietas' },
  { label: 'Fornecedores', path: '/controller/fornecedores' },
  { label: 'Frigoríficos', path: '/controller/frigorificos' },
  { label: 'Cadernetas', path: '/controller/cadernetas' },
]

export function ControllerLayout({ children, title }: ControllerLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100">
      <Header title={title} />
      
      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-64 bg-white border-r-2 border-gray-200 min-h-screen">
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">Navegação</p>
            <nav className="space-y-2">
              {controllerMenuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="border-t-2 border-gray-200 p-4 mt-auto">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-800">{user?.nome}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.papel}</p>
            </div>
          </div>
        </aside>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="bg-white w-64 h-full p-4">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="mb-4 text-gray-600"
              >
                Fechar
              </button>
              <nav className="space-y-2">
                {controllerMenuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setMobileMenuOpen(false)
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden mb-4 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg"
          >
            Menu
          </button>
          
          {children}
        </main>
      </div>
    </div>
  )
}
