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
import { DetalhesFazenda } from './pages/admin/DetalhesFazenda'
import { UsuariosList } from './pages/admin/Usuarios'
import { NovoUsuario } from './pages/admin/NovoUsuario'
import { EditarUsuario } from './pages/admin/EditarUsuario'
import { ControllerDashboard } from './pages/controller/Dashboard'
import { Pastos } from './pages/controller/Pastos'
import { Lotes } from './pages/controller/Lotes'

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
          path="/admin/fazendas/:id/detalhes"
          element={
            <AdminRoute>
              <AdminLayout title="Detalhes da Fazenda">
                <DetalhesFazenda />
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
                <ControllerDashboard />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/pastos"
          element={
            <ControllerRoute>
              <ControllerLayout title="Pastos">
                <Pastos />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/lotes"
          element={
            <ControllerRoute>
              <ControllerLayout title="Lotes">
                <Lotes />
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
