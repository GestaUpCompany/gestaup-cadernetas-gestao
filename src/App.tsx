import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Login } from './pages/auth/Login'
import { AdminLayout } from './components/layout/AdminLayout'
import { ControllerLayout } from './components/layout/ControllerLayout'
import { AdminRoute } from './components/routes/AdminRoute'
import { ControllerRoute } from './components/routes/ControllerRoute'
import { ConfinamentoRoute } from './components/routes/ConfinamentoRoute'
import { AdminDashboard } from './pages/admin/Dashboard'
import { FazendasList } from './pages/admin/Fazendas'
import { NovaFazenda } from './pages/admin/NovaFazenda'
import { EditarFazenda } from './pages/admin/EditarFazenda'
import { DetalhesFazenda } from './pages/admin/DetalhesFazenda'
import { GruposList } from './pages/admin/Grupos'
import { UsuariosList } from './pages/admin/Usuarios'
import { NovoUsuario } from './pages/admin/NovoUsuario'
import { EditarUsuario } from './pages/admin/EditarUsuario'
import { RelatorioAtividades } from './pages/admin/RelatorioAtividades'
import { ControllerDashboard } from './pages/controller/Dashboard'
import { Pastos } from './pages/controller/Pastos'
import { ModulosPastos } from './pages/controller/ModulosPastos'
import { Lotes } from './pages/controller/Lotes'
import { Funcionarios } from './pages/controller/Funcionarios'
import { Insumos } from './pages/controller/Insumos'
import { ItensSupermercado } from './pages/controller/ItensSupermercado'
import { Medicamentos } from './pages/controller/Medicamentos'
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
import { Formulacoes } from './pages/controller/Formulacoes'
import { Fornecedores } from './pages/controller/Fornecedores'
import { Frigorificos } from './pages/controller/Frigorificos'
import { CausasMorte } from './pages/controller/CausasMorte'
import { Racas } from './pages/controller/Racas'
import { CadastrosAuxiliares } from './pages/controller/CadastrosAuxiliares'
import { Rotinas } from './pages/controller/Rotinas'
import { AuditoriaRotinas } from './pages/controller/AuditoriaRotinas'
import { Currais } from './pages/controller/Currais'
import { HistoricoDietas } from './pages/controller/HistoricoDietas'
import { HistoricoPlanos } from './pages/controller/HistoricoPlanos'
import { BebedourosCadastro } from './pages/controller/BebedourosCadastro'
import { RegistrosMorte } from './pages/controller/RegistrosMorte'
import { RegistrosMorteDetalhes } from './pages/controller/RegistrosMorteDetalhes'
import { Pluviometros } from './pages/controller/Pluviometros'
import { RegistrosClima } from './pages/controller/RegistrosClima'
import { RegistrosClimaDetalhes } from './pages/controller/RegistrosClimaDetalhes'
import { RegistrosAbastecimento } from './pages/controller/RegistrosAbastecimento'
import { RegistrosAbastecimentoDetalhes } from './pages/controller/RegistrosAbastecimentoDetalhes'
import { RegistrosAlimentacao } from './pages/controller/RegistrosAlimentacao'
import { RegistrosAlimentacaoDetalhes } from './pages/controller/RegistrosAlimentacaoDetalhes'
import { RegistrosLimpeza } from './pages/controller/RegistrosLimpeza'
import { RegistrosLimpezaDetalhes } from './pages/controller/RegistrosLimpezaDetalhes'
import { RegistrosOperacoesMaquinas } from './pages/controller/RegistrosOperacoesMaquinas'
import { RegistrosOperacoesMaquinasDetalhes } from './pages/controller/RegistrosOperacoesMaquinasDetalhes'
import { RelatorioGado } from './pages/controller/RelatorioGado'
import { RelatorioSaude } from './pages/controller/RelatorioSaude'
import { MaquinasVeiculos } from './pages/controller/MaquinasVeiculos'
import { Setores } from './pages/controller/Setores'
import { Locais } from './pages/controller/Locais'
import { ItensAlmoxarifado } from './pages/controller/ItensAlmoxarifado'
import { Implementos } from './pages/controller/Implementos'
import { TratamentosMaternidade } from './pages/controller/TratamentosMaternidade'
import { Almoxarifado } from './pages/controller/Almoxarifado'
import { AlmoxarifadoDetalhes } from './pages/controller/AlmoxarifadoDetalhes'
import { ManutencaoMaquinas } from './pages/controller/ManutencaoMaquinas'
import { ManutencaoMaquinasDetalhes } from './pages/controller/ManutencaoMaquinasDetalhes'
import { Problemas } from './pages/controller/Problemas'
import { ProblemasDetalhes } from './pages/controller/ProblemasDetalhes'
import { HistoricoOcupacao } from './pages/controller/HistoricoOcupacao'
import { Individuos } from './pages/controller/Individuos'
import { IndividuoNovo } from './pages/controller/IndividuoNovo'
import { FaixasCategorias } from './pages/controller/FaixasCategorias'

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
          path="/admin/grupos"
          element={
            <AdminRoute>
              <AdminLayout>
                <GruposList />
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
        <Route
          path="/admin/relatorio-atividades"
          element={
            <AdminRoute>
              <AdminLayout>
                <RelatorioAtividades />
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
          path="/controller/modulos-pastos"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <ModulosPastos />
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
          path="/controller/historico-ocupacao"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <HistoricoOcupacao />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/historico-planos"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <HistoricoPlanos />
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
          path="/controller/medicamentos"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Medicamentos />
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
          path="/controller/itens-supermercado"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <ItensSupermercado />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/formulacoes"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Formulacoes />
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
          path="/controller/racas"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Racas />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadastros-auxiliares"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <CadastrosAuxiliares />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/rotinas"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Rotinas />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/auditoria-rotinas"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <AuditoriaRotinas />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/currais"
          element={
            <ControllerRoute>
              <ConfinamentoRoute>
                <ControllerLayout>
                  <Currais />
                </ControllerLayout>
              </ConfinamentoRoute>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/historico-dietas"
          element={
            <ControllerRoute>
              <ConfinamentoRoute>
                <ControllerLayout>
                  <HistoricoDietas />
                </ControllerLayout>
              </ConfinamentoRoute>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/bebedouros-cadastro"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <BebedourosCadastro />
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
          path="/controller/cadernetas/maternidade"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Maternidade />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/maternidade/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <MaternidadeDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/enfermaria"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Enfermaria />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/enfermaria/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <EnfermariaDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/pastagens"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <PastagensCaderneta />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/pastagens/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <PastagensDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/rodeio"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Rodeio />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/rodeio/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RodeioDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/suplementacao"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Suplementacao />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/suplementacao/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <SuplementacaoDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/bebedouros"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Bebedouros />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/bebedouros/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <BebedourosDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/movimentacao"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Movimentacao />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/movimentacao/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <MovimentacaoDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/morte"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RegistrosMorte />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/morte/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RegistrosMorteDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/pluviometros"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Pluviometros />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/clima"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RegistrosClima />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/clima/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RegistrosClimaDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/abastecimento"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RegistrosAbastecimento />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/abastecimento/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RegistrosAbastecimentoDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/alimentacao"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RegistrosAlimentacao />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/alimentacao/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RegistrosAlimentacaoDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/limpeza"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RegistrosLimpeza />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/limpeza/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RegistrosLimpezaDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/operacoes-maquinas"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RegistrosOperacoesMaquinas />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/operacoes-maquinas/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RegistrosOperacoesMaquinasDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/relatorios/gado"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RelatorioGado />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/relatorios/saude"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <RelatorioSaude />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/maquinas-veiculos"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <MaquinasVeiculos />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/setores"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Setores />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/locais"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Locais />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/itens-almoxarifado"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <ItensAlmoxarifado />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/implementos"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Implementos />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/tratamentos-maternidade"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <TratamentosMaternidade />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/almoxarifado"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Almoxarifado />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/almoxarifado/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <AlmoxarifadoDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/manutencao-maquinas"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <ManutencaoMaquinas />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/manutencao-maquinas/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <ManutencaoMaquinasDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/problemas"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Problemas />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/cadernetas/problemas/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <ProblemasDetalhes />
              </ControllerLayout>
            </ControllerRoute>
          }
        />

        <Route
          path="/controller/individuos"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <Individuos />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/individuos/novo"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <IndividuoNovo />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/individuos/:id"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <IndividuoNovo />
              </ControllerLayout>
            </ControllerRoute>
          }
        />
        <Route
          path="/controller/faixas-categorias"
          element={
            <ControllerRoute>
              <ControllerLayout>
                <FaixasCategorias />
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
