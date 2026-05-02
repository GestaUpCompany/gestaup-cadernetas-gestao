import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsuarios, Usuario } from '../../services/usuariosService'
import { Button, Card } from '../../components/ui'

export function UsuariosList() {
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsuarios()
  }, [])

  const loadUsuarios = async () => {
    setLoading(true)
    const data = await getUsuarios()
    setUsuarios(data)
    setLoading(false)
  }

  const stats = {
    totalUsuarios: usuarios.length,
    admins: usuarios.filter(u => u.papel === 'admin').length,
    controllers: usuarios.filter(u => u.papel === 'controller').length,
    ativos: usuarios.filter(u => u.ativo).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Usuários</h2>
        <Button onClick={() => navigate('/admin/usuarios/novo')}>
          Novo Usuário
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Total</h3>
          <p className="text-4xl font-bold text-primary">{stats.totalUsuarios}</p>
        </Card>
        <Card className="bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Admins</h3>
          <p className="text-4xl font-bold text-blue-600">{stats.admins}</p>
        </Card>
        <Card className="bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Controllers</h3>
          <p className="text-4xl font-bold text-green-600">{stats.controllers}</p>
        </Card>
        <Card className="bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Ativos</h3>
          <p className="text-4xl font-bold text-purple-600">{stats.ativos}</p>
        </Card>
      </div>

      {loading ? (
        <p className="text-gray-600">Carregando...</p>
      ) : usuarios.length === 0 ? (
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600 mb-4">Nenhum usuário cadastrado</p>
          <Button onClick={() => navigate('/admin/usuarios/novo')}>
            Criar Primeiro Usuário
          </Button>
        </Card>
      ) : (
        <Card className="bg-white p-6">
          <div className="space-y-3">
            {usuarios.map((usuario) => (
              <div
                key={usuario.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate(`/admin/usuarios/${usuario.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">
                      {usuario.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{usuario.nome}</h3>
                    <p className="text-sm text-gray-600">{usuario.email}</p>
                    {usuario.telefone && (
                      <p className="text-sm text-gray-600">{usuario.telefone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm capitalize ${
                      usuario.papel === 'admin'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {usuario.papel}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      usuario.ativo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {usuario.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
