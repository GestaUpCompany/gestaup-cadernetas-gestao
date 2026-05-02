import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Login } from './pages/auth/Login'
import { Signup } from './pages/auth/Signup'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-100">
                <div className="container mx-auto px-4 py-8">
                  <h1 className="text-3xl font-bold text-gray-800">GestaUp - Cadernetas Gestão</h1>
                  <p className="text-gray-600 mt-2">Interface Web Administrativa</p>
                  <p className="text-green-600 mt-4">Autenticado com sucesso!</p>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
