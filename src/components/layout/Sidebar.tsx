import { useRef, useEffect } from 'react'
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
  mobileMenuOpen?: boolean
  setMobileMenuOpen?: (open: boolean) => void
}

export function Sidebar({ items, isCollapsed = false, onToggle, mobileMenuOpen = false, setMobileMenuOpen }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const drawerRef = useRef<HTMLDivElement>(null)

  // Swipe gesture para fechar menu mobile
  useEffect(() => {
    const drawer = drawerRef.current
    if (!drawer || !mobileMenuOpen) return

    let startX = 0

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
    }

    const handleTouchMove = (e: TouchEvent) => {
      const currentX = e.touches[0].clientX
      const diff = startX - currentX
      
      if (diff > 50 && setMobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }

    drawer.addEventListener('touchstart', handleTouchStart)
    drawer.addEventListener('touchmove', handleTouchMove)

    return () => {
      drawer.removeEventListener('touchstart', handleTouchStart)
      drawer.removeEventListener('touchmove', handleTouchMove)
    }
  }, [mobileMenuOpen, setMobileMenuOpen])

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r-2 border-gray-200 min-h-screen transition-all duration-300 hidden md:block`}>
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in"
          onClick={() => setMobileMenuOpen?.(false)}
        >
          <div 
            ref={drawerRef}
            className="bg-white w-64 h-full p-4 overflow-y-auto animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen?.(false)}
                className="p-2 rounded-lg transition-all hover:bg-gray-100"
                aria-label="Fechar menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="space-y-2">
              {items.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setMobileMenuOpen?.(false)
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-label={`Ir para ${item.label}`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </nav>
            <div className="absolute bottom-0 w-64 p-6 border-t-2 border-gray-200">
              <div className="text-sm text-gray-500">
                <p>Usuário: {user?.nome}</p>
                <p>Papel: <span className="capitalize">{user?.papel}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
