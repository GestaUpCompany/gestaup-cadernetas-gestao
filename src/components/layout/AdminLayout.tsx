import { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface AdminLayoutProps {
  children: ReactNode
}

const sidebarItems = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Fazendas', path: '/admin/fazendas' },
  { label: 'Usuários', path: '/admin/usuarios' },
]

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex">
        <Sidebar items={sidebarItems} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
