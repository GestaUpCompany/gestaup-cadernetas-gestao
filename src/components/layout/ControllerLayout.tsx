import { ReactNode, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Header } from './Header'
import { Breadcrumbs } from '../ui'
import { KeyboardHelpModal } from '../ui/KeyboardHelpModal'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface ControllerLayoutProps {
  children: ReactNode
}

const menuStructure = [
  {
    label: 'Dashboard',
    path: '/controller/dashboard',
    standalone: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Gestão da Fazenda',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    items: [
      { label: 'Pastos', path: '/controller/pastos' },
      { label: 'Lotes', path: '/controller/lotes' },
      { label: 'Funcionários', path: '/controller/funcionarios' },
      { label: 'Bebedouros', path: '/controller/bebedouros-cadastro' },
      { label: 'Pluviômetros', path: '/controller/pluviometros' },
      { label: 'Causas de Morte', path: '/controller/causas-morte' },
    ],
  },
  {
    label: 'Gestão de Insumos e Nutrição',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
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
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    items: [
      { label: 'Fornecedores', path: '/controller/fornecedores' },
      { label: 'Frigoríficos', path: '/controller/frigorificos' },
    ],
  },
  {
    label: 'Cadernetas',
    path: '/controller/cadernetas',
    standalone: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
]

export function ControllerLayout({ children }: ControllerLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set())
  const [showHelpModal, setShowHelpModal] = useState(false)

  const shortcuts = [
    {
      key: 'F1',
      description: 'Abrir ajuda de atalhos',
      action: () => setShowHelpModal(true),
    },
    {
      key: 'Escape',
      description: 'Fechar modal',
      action: () => setShowHelpModal(false),
    },
  ]

  useKeyboardShortcuts(shortcuts)

  // Auto-open submenu if current path is in it
  useEffect(() => {
    menuStructure.forEach(menu => {
      if (menu.items && isSubmenuActive(menu.items)) {
        setOpenMenus(prev => new Set(prev).add(menu.label))
      }
    })
  }, [location.pathname])

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
      <Breadcrumbs />
      
      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-64 bg-white border-r-2 border-gray-200 fixed top-0 h-screen overflow-y-auto z-10">
          <div className="p-4 pt-24">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Navegação</p>
            <nav className="space-y-1">
              {menuStructure.map((menu, index) => {
                if (menu.standalone && menu.path) {
                  return (
                    <button
                      key={menu.path}
                      onClick={() => navigate(menu.path!)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                        isPathActive(menu.path!)
                          ? 'bg-primary/10 text-primary border-l-4 border-primary font-medium'
                          : 'text-gray-700 border-l-4 border-transparent'
                      }`}
                    >
                      {menu.icon && <span className="flex-shrink-0">{menu.icon}</span>}
                      <span>{menu.label}</span>
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
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-between ${
                          isActive ? 'bg-primary/10 text-primary border-l-4 border-primary font-medium' : 'text-gray-700 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {menu.icon && <span className="flex-shrink-0">{menu.icon}</span>}
                          <span>{menu.label}</span>
                        </div>
                        <svg
                          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="ml-6 mt-1 space-y-1 animate-slide-in">
                          {menu.items.map((item) => (
                            <button
                              key={item.path}
                              onClick={() => navigate(item.path)}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-sm flex items-center gap-3 ${
                                isPathActive(item.path)
                                  ? 'bg-primary text-white font-medium'
                                  : 'text-gray-600'
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                              <span>{item.label}</span>
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
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in">
            <div className="bg-white w-64 h-full p-4 overflow-y-auto animate-slide-in">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Navegação</p>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="space-y-1">
                {menuStructure.map((menu, index) => {
                  if (menu.standalone && menu.path) {
                    return (
                      <button
                        key={menu.path}
                        onClick={() => {
                          navigate(menu.path!)
                          setMobileMenuOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                          isPathActive(menu.path!)
                            ? 'bg-primary/10 text-primary border-l-4 border-primary font-medium'
                            : 'text-gray-700 border-l-4 border-transparent'
                        }`}
                      >
                        {menu.icon && <span className="flex-shrink-0">{menu.icon}</span>}
                        <span>{menu.label}</span>
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
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-between ${
                            isActive ? 'bg-primary/10 text-primary border-l-4 border-primary font-medium' : 'text-gray-700 border-l-4 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {menu.icon && <span className="flex-shrink-0">{menu.icon}</span>}
                            <span>{menu.label}</span>
                          </div>
                          <svg
                            className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="ml-6 mt-1 space-y-1 animate-slide-in">
                            {menu.items.map((item) => (
                              <button
                                key={item.path}
                                onClick={() => {
                                  navigate(item.path)
                                  setMobileMenuOpen(false)
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-sm flex items-center gap-3 ${
                                  isPathActive(item.path)
                                    ? 'bg-primary text-white font-medium'
                                    : 'text-gray-600'
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                                <span>{item.label}</span>
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
        <main className="flex-1 p-6 md:p-8 md:ml-64">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden mb-4 p-2 bg-white border-2 border-gray-300 rounded-lg transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {children}
        </main>
      </div>

      <KeyboardHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        shortcuts={[
          { key: 'F1', description: 'Abrir ajuda de atalhos' },
          { key: 'Escape', description: 'Fechar modal' },
          { key: 'f', ctrl: true, description: 'Buscar' },
        ]}
      />
    </div>
  )
}
