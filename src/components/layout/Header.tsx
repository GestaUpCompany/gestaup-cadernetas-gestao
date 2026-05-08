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
            src="/images/logo/logo-gestaup.png"
            alt="Base de Dados - Cadernetas"
            className="h-10 w-auto"
          />
          <h1 className="text-xl font-bold text-white ml-3">
            Base de Dados - Cadernetas
          </h1>
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
