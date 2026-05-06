import { useAuth } from '../../contexts/AuthContext'
import { LOGO_GESTAUP } from '../../types/images'

export function Header() {
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <header className="bg-primary border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={LOGO_GESTAUP} 
            alt="Manej'Us Logo" 
            className="h-10 w-auto"
          />
          <div>
            <h1 className="text-2xl font-bold text-white">Manej'Us</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold text-white">{user?.nome}</p>
            <p className="text-sm text-gray-200 capitalize">{user?.papel}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
