import { useAuth } from '../../contexts/AuthContext'

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
    <header className="bg-white border-b-2 border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          <p className="text-sm text-gray-500">GestaUp - Cadernetas Gestão</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold text-gray-800">{user?.nome}</p>
            <p className="text-sm text-gray-500 capitalize">{user?.papel}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
