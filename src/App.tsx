import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Login } from './pages/auth/Login'
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
import { Funcionarios } from './pages/controller/Funcionarios'
import { Insumos } from './pages/controller/Insumos'
import { Cadernetas } from './pages/controller/Cadernetas'
import { Maternidade } from './pages/controller/Maternidade'
import { MaternidadeDetalhes } from './pages/controller/MaternidadeDetalhes'
import { Enfermaria } from './pages/controller/Enfermaria'
import { EnfermariaDetalhes } from './pages/controller/EnfermariaDetalhes'
import { PastagensCaderneta } from './pages/controller/PastagensCaderneta'
import { PastagensDetalhes } from './pages/controller/PastagensDetalhes'
import { Rodeio } from './pages/controller/Rodeio'
import { RodeioDetalhes } from './pages/controller/RodeioDetalhes'
import { Suplementacao } from './pages/controller/Suplementacao'
import { SuplementacaoDetalhes } from './pages/controller/SuplementacaoDetalhes'
import { Bebedouros } from './pages/controller/Bebedouros'
import { BebedourosDetalhes } from './pages/controller/BebedourosDetalhes'
import { Movimentacao } from './pages/controller/Movimentacao'
import { MovimentacaoDetalhes } from './pages/controller/MovimentacaoDetalhes'
import { Mineral } from './pages/controller/Mineral'
import { Proteinado } from './pages/controller/Proteinado'
import { Racao } from './pages/controller/Racao'
import { Dietas } from './pages/controller/Dietas'
import { Fornecedores } from './pages/controller/Fornecedores'
import { Frigorificos } from './pages/controller/Frigorificos'
import { CausasMorte } from './pages/controller/CausasMorte'

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
        
        {/* Rotas Admin */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/fazendas"
          element={
            <AdminRoute>
              <AdminLayout>
                <FazendasList />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/fazendas/nova"
          element={
            <AdminRoute>
              <AdminLayout>
                <NovaFazenda />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/fazendas/:id"
          element={
            <AdminRoute>
              <AdminLayout>
                <EditarFazenda />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/fazendas/:id/detalhes"
          element={
            <AdminRoute>
              <AdminLayout>
                <DetalhesFazenda />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <AdminRoute>
              <AdminLayout>
                <UsuariosList />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/usuarios/novo"
          element={
            <AdminRoute>
              <AdminLayout>
                <NovoUsuario />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/usuarios/:id"
          element={
            <AdminRoute>
              <AdminLayout>
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
              <ControllerLayout>
                <ControllerDashboard />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/pastos"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Pastos />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/lotes"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Lotes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/funcionarios"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Funcionarios />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/insumos"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Insumos />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/mineral"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Mineral />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/proteinado"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Proteinado />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/racao"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Racao />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/dietas"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Dietas />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/fornecedores"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Fornecedores />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/frigorificos"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Frigorificos />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/causas-morte"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <CausasMorte />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Cadernetas />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/maternidade"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Maternidade />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/maternidade/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <MaternidadeDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/enfermaria"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Enfermaria />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/enfermaria/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <EnfermariaDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/pastagens-caderneta"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <PastagensCaderneta />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/pastagens-caderneta/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <PastagensDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/rodeio"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Rodeio />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/rodeio/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RodeioDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/suplementacao"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Suplementacao />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/suplementacao/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <SuplementacaoDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/bebedouros"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Bebedouros />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/bebedouros/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <BebedourosDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/movimentacao"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Movimentacao />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/movimentacao/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <MovimentacaoDetalhes />
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
