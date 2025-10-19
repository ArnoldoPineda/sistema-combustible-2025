import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loading from './common/Loading'
import { useEffect } from 'react'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading, signOut } = useAuth()

  useEffect(() => {
    // Si terminó de cargar, hay usuario pero NO hay perfil = sesión corrupta
    if (!loading && user && !profile) {
      console.error('⚠️ Sesión corrupta detectada: usuario sin perfil')
      console.log('🧹 Limpiando sesión y redirigiendo al login...')
      
      // Limpiar sesión corrupta
      localStorage.clear()
      sessionStorage.clear()
      
      // Forzar redirección al login
      window.location.href = '/login'
    }
  }, [loading, user, profile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading message="Verificando permisos..." />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Si NO hay perfil después de cargar = sesión corrupta (el useEffect manejará esto)
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading message="Cargando perfil..." />
      </div>
    )
  }

  // ✅ NUEVO: Soporta tanto string como array de roles
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  
  if (!allowedRoles.includes(profile.rol)) {
    // Si el usuario tiene un rol diferente, redirigir a su dashboard correcto
    const correctPath = profile.rol === 'administrador' || profile.rol === 'admin_especialista' 
      ? '/admin' 
      : '/especialista'
    return <Navigate to={correctPath} replace />
  }

  return children
}