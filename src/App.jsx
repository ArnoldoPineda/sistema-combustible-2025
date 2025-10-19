import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/auth/Login'
import DashboardEspecialista from './pages/especialista/DashboardEspecialista'
import DashboardAdmin from './pages/administrador/DashboardAdmin'
import Loading from './components/common/Loading'

const AppRoutes = () => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading message="Cargando..." />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user && profile ? (
            profile.rol === 'administrador' || profile.rol === 'admin_especialista'
              ? <Navigate to="/admin" replace />
              : <Navigate to="/especialista" replace />
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole={['administrador', 'admin_especialista']}>
            <DashboardAdmin />
          </ProtectedRoute>
        }
      />

      <Route
        path="/especialista"
        element={
          <ProtectedRoute requiredRole="especialista">
            <DashboardEspecialista />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          user && profile ? (
            profile.rol === 'administrador' || profile.rol === 'admin_especialista'
              ? <Navigate to="/admin" replace />
              : <Navigate to="/especialista" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        {/* 🔥 TOASTER GLOBAL - Configuración perfecta para Honduras */}
        <Toaster 
          position="top-right"
          reverseOrder={false}
          gutter={8}
          containerClassName=""
          containerStyle={{}}
          toastOptions={{
            // Configuración por defecto
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              fontSize: '14px',
              borderRadius: '8px',
              padding: '12px 20px',
            },
            // Toast de éxito (verde)
            success: {
              duration: 3000,
              style: {
                background: '#10b981',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#10b981',
              },
            },
            // Toast de error (rojo)
            error: {
              duration: 5000,
              style: {
                background: '#ef4444',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#ef4444',
              },
            },
            // Toast de loading (azul)
            loading: {
              style: {
                background: '#3b82f6',
                color: '#fff',
              },
            },
          }}
        />
        
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App