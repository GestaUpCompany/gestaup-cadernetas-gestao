import { ReactNode } from 'react'
import { Header } from './Header'

interface ControllerLayoutProps {
  children: ReactNode
  title: string
}

export function ControllerLayout({ children, title }: ControllerLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header title={title} />
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}
