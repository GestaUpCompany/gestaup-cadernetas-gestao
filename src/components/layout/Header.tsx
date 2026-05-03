import { useAuth } from '../../contexts/AuthContext'
import { LOGO_GESTAUP } from '../../types/images'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={LOGO_GESTAUP} 
            alt="Gesta'Up Logo" 
            className="h-10 w-auto"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold text-gray-800">{user?.nome}</p>
            <p className="text-sm text-gray-500 capitalize">{user?.papel}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
