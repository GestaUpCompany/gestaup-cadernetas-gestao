import { ReactNode, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Header } from './Header'

interface ControllerLayoutProps {
  children: ReactNode
}

const menuStructure = [
  {
    label: 'Dashboard',
    path: '/controller/dashboard',
    standalone: true,
  },
  {
    label: 'Gestão da Fazenda',
    items: [
      { label: 'Pastos', path: '/controller/pastos' },
      { label: 'Lotes', path: '/controller/lotes' },
      { label: 'Funcionários', path: '/controller/funcionarios' },
    ],
  },
  {
    label: 'Gestão de Insumos e Nutrição',
    items: [
      { label: 'Insumos', path: '/controller/insumos' },
      { label: 'Mineral', path: '/controller/mineral' },
      { label: 'Proteinado', path: '/controller/proteinado' },
      { label: 'Ração', path: '/controller/racao' },
      { label: 'Dietas', path: '/controller/dietas' },
    ],
  },
  {
    label: 'Parceiros',
    items: [
      { label: 'Fornecedores', path: '/controller/fornecedores' },
      { label: 'Frigoríficos', path: '/controller/frigorificos' },
    ],
  },
  {
    label: 'Cadernetas',
    path: '/controller/cadernetas',
    standalone: true,
  },
]

export function ControllerLayout({ children }: ControllerLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set())

  const toggleMenu = (label: string) => {
    const newOpenMenus = new Set(openMenus)
    if (newOpenMenus.has(label)) {
      newOpenMenus.delete(label)
    } else {
      newOpenMenus.add(label)
    }
    setOpenMenus(newOpenMenus)
  }

  const isMenuOpen = (label: string) => openMenus.has(label)

  const isPathActive = (path: string) => location.pathname === path

  const isSubmenuActive = (items: any[]) => {
    return items.some((item) => location.pathname === item.path)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-64 bg-white border-r-2 border-gray-200 min-h-screen">
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">Navegação</p>
            <nav className="space-y-2">
              {menuStructure.map((menu, index) => {
                if (menu.standalone && menu.path) {
                  return (
                    <button
                      key={menu.path}
                      onClick={() => navigate(menu.path!)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        isPathActive(menu.path!)
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {menu.label}
                    </button>
                  )
                }

                if (menu.items) {
                  const isOpen = isMenuOpen(menu.label)
                  const isActive = isSubmenuActive(menu.items)

                  return (
                    <div key={index}>
                      <button
                        onClick={() => toggleMenu(menu.label)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${
                          isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span>{menu.label}</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="ml-4 mt-1 space-y-1">
                          {menu.items.map((item) => (
                            <button
                              key={item.path}
                              onClick={() => navigate(item.path)}
                              className={`w-full text-left px-4 py-2 rounded-lg transition-colors text-sm ${
                                isPathActive(item.path)
                                  ? 'bg-primary text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                return null
              })}
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
            <div className="bg-white w-64 h-full p-4 overflow-y-auto">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="mb-4 text-gray-600"
              >
                Fechar
              </button>
              <nav className="space-y-2">
                {menuStructure.map((menu, index) => {
                  if (menu.standalone && menu.path) {
                    return (
                      <button
                        key={menu.path}
                        onClick={() => {
                          navigate(menu.path!)
                          setMobileMenuOpen(false)
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          isPathActive(menu.path!)
                            ? 'bg-primary text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {menu.label}
                      </button>
                    )
                  }

                  if (menu.items) {
                    const isOpen = isMenuOpen(menu.label)
                    const isActive = isSubmenuActive(menu.items)

                    return (
                      <div key={index}>
                        <button
                          onClick={() => toggleMenu(menu.label)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${
                            isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span>{menu.label}</span>
                          <svg
                            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="ml-4 mt-1 space-y-1">
                            {menu.items.map((item) => (
                              <button
                                key={item.path}
                                onClick={() => {
                                  navigate(item.path)
                                  setMobileMenuOpen(false)
                                }}
                                className={`w-full text-left px-4 py-2 rounded-lg transition-colors text-sm ${
                                  isPathActive(item.path)
                                    ? 'bg-primary text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return null
                })}
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
