import { ReactNode, useState } from 'react'
import { Header } from './Header'
import { Sidebar, SidebarItem } from './Sidebar'
import { ImpersonationBar } from '../ImpersonationBar'

interface SuperAdminLayoutProps {
  children: ReactNode
}

const superAdminItems: SidebarItem[] = [
  {
    label: 'Gerenciamento de IA',
    path: '/super-admin/gerenciamento-ia',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    label: 'Saúde do Sistema',
    path: '/super-admin/saude-sistema',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h4l3 8 4-16 3 8h4" />
      </svg>
    ),
  },
  {
    label: 'Usuários',
    path: '/super-admin/usuarios',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    label: 'Auditoria',
    path: '/super-admin/auditoria',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Métricas por Fazenda',
    path: '/super-admin/metricas-fazendas',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M9 17V9m4 8V5m4 12v-6" />
      </svg>
    ),
  },
]

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100">
      <ImpersonationBar />
      <Header />
      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="w-64 hidden md:block bg-white border-r-2 border-gray-200 fixed top-0 h-screen overflow-y-auto z-10">
          <div className="pt-16">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Plataforma</p>
              <p className="text-xs text-gray-400 mt-0.5">Super Administrador</p>
            </div>
            <Sidebar items={superAdminItems} />
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
              <nav className="space-y-2">
                {superAdminItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      window.location.href = item.path
                      setMobileMenuOpen(false)
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg transition-all text-gray-700 hover:bg-gray-100"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 md:ml-64">
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
    </div>
  )
}
