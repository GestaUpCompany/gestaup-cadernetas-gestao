import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Login } from './pages/auth/Login'
import { Signup } from './pages/auth/Signup'
import { AdminLayout } from './components/layout/AdminLayout'
import { ControllerLayout } from './components/layout/ControllerLayout'
import { AdminRoute } from './components/routes/AdminRoute'
import { ControllerRoute } from './components/routes/ControllerRoute'
import { AdminDashboard } from './pages/admin/Dashboard'
import { FazendasList } from './pages/admin/Fazendas'
import { NovaFazenda } from './pages/admin/NovaFazenda'
import { EditarFazenda } from './pages/admin/EditarFazenda'
import { UsuariosList } from './pages/admin/Usuarios'
import { NovoUsuario } from './pages/admin/NovoUsuario'
import { EditarUsuario } from './pages/admin/EditarUsuario'

// Redirecionamento baseado no papel do usuário
function RoleRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.papel === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  if (user.papel === 'controller') {
    return <Navigate to="/controller/dashboard" replace />
  }

  return <Navigate to="/login" replace />
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Rotas Admin */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminLayout title="Dashboard Admin">
                <AdminDashboard />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/fazendas"
          element={
            <AdminRoute>
              <AdminLayout title="Fazendas">
                <FazendasList />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/fazendas/nova"
          element={
            <AdminRoute>
              <AdminLayout title="Nova Fazenda">
                <NovaFazenda />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/fazendas/:id"
          element={
            <AdminRoute>
              <AdminLayout title="Editar Fazenda">
                <EditarFazenda />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <AdminRoute>
              <AdminLayout title="Usuários">
                <UsuariosList />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/usuarios/novo"
          element={
            <AdminRoute>
              <AdminLayout title="Novo Usuário">
                <NovoUsuario />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/usuarios/:id"
          element={
            <AdminRoute>
              <AdminLayout title="Editar Usuário">
                <EditarUsuario />
              </AdminLayout>
            </AdminRoute>
          }
        />
        
        {/* Rotas Controller */}
        <Route
          path="/controller/dashboard"
          element={
            <ControllerRoute>
              <ControllerLayout title="Dashboard Controller">
                <div className="text-center py-12">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">Bem-vindo ao GestaUp</h2>
                  <p className="text-gray-600">Dashboard Controller - Visão da sua fazenda</p>
                </div>
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        
        {/* Redirecionamento padrão */}
        <Route path="/" element={<RoleRedirect />} />
      </Routes>
    </Router>
  )
}

export default App
