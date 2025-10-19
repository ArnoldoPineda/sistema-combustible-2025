import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Toast de loading
    const toastId = toast.loading('Iniciando sesión...')

    try {
      console.log('🔐 Intentando login con:', email)
      
      const { data, error: signInError } = await signIn(email, password)

      if (signInError) {
        console.error('❌ Error en signIn:', signInError)
        toast.error('Credenciales incorrectas. Verifica tu correo y contraseña.', {
          id: toastId,
        })
        setLoading(false)
        return
      }

      console.log('✅ Login exitoso, cargando perfil...')

      // Esperar a que se cargue el perfil desde la base de datos
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        console.error('❌ Error cargando perfil:', profileError)
        toast.error('Error al cargar el perfil del usuario', {
          id: toastId,
        })
        setLoading(false)
        return
      }

      console.log('✅ Perfil cargado:', profileData)

      // Verificar si el usuario está activo
      if (!profileData.activo) {
        toast.error('Tu cuenta está inactiva. Contacta al administrador.', {
          id: toastId,
        })
        setLoading(false)
        return
      }

      // Toast de éxito
      toast.success(`¡Bienvenido, ${profileData.nombre_completo}!`, {
        id: toastId,
        icon: '👋',
      })

      // Redirigir según el rol
      if (profileData.rol === 'administrador' || profileData.rol === 'admin_especialista') {
        console.log('➡️ Redirigiendo a /admin')
        navigate('/admin', { replace: true })
      } else if (profileData.rol === 'especialista') {
        console.log('➡️ Redirigiendo a /especialista')
        navigate('/especialista', { replace: true })
      } else {
        console.error('❌ Rol no reconocido:', profileData.rol)
        toast.error('Rol de usuario no válido', {
          id: toastId,
        })
        setLoading(false)
      }
    } catch (err) {
      console.error('❌ Error inesperado:', err)
      toast.error('Error al iniciar sesión. Intenta de nuevo.', {
        id: toastId,
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema TEACH Honduras
          </h1>
          <p className="text-gray-600">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="correo@ejemplo.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Credenciales de prueba:</p>
          <p className="font-mono mt-2">admin@teach.hn / admin123456</p>
          <p className="font-mono mt-1">especialista@teach.hn / especialista123</p>
        </div>
      </div>
    </div>
  )
}