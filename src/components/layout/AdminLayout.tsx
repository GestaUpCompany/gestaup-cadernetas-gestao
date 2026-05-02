import { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface AdminLayoutProps {
  children: ReactNode
  title: string
}

const sidebarItems = [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Fazendas', path: '/fazendas', icon: '🏠' },
  { label: 'Usuários', path: '/usuarios', icon: '👥' },
]

export function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header title={title} />
      <div className="flex">
        <Sidebar items={sidebarItems} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
