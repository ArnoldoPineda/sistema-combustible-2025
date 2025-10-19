import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let timeoutId = null

    const initAuth = async () => {
      try {
        console.log('🔄 AuthContext: Inicializando...')
        
        timeoutId = setTimeout(() => {
          if (mounted && loading) {
            console.warn('⏰ Timeout alcanzado - forzando fin de carga')
            setLoading(false)
          }
        }, 5000)
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Error obteniendo sesión:', sessionError)
          if (mounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        if (!session?.user) {
          console.log('👤 No hay sesión activa')
          if (mounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        console.log('👤 Sesión encontrada:', session.user.email)
        
        if (mounted) {
          setUser(session.user)
        }

        console.log('📊 Cargando perfil desde DB...')
        
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        const { data: profileData, error: profileError } = await Promise.race([
          profilePromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile load timeout')), 3000)
          )
        ]).catch(err => {
          console.error('❌ Timeout o error cargando perfil:', err)
          return { data: null, error: err }
        })

        if (profileError || !profileData) {
          console.error('❌ Error cargando perfil - sesión corrupta')
          if (mounted) {
            await supabase.auth.signOut()
            localStorage.clear()
            sessionStorage.clear()
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        console.log('✅ Perfil cargado:', profileData)

        const perfilNormalizado = {
          ...profileData,
          nombre_completo: profileData.nombre_completo || profileData.full_name || profileData.email
        }

        if (mounted) {
          setProfile(perfilNormalizado)
          setLoading(false)
        }

      } catch (error) {
        console.error('❌ Error inesperado en initAuth:', error)
        if (mounted) {
          localStorage.clear()
          sessionStorage.clear()
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth state changed:', event)
        
        if (!mounted) return

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          setProfile(null)
          return
        }

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileData) {
            console.log('🔄 Perfil actualizado:', profileData)
            const perfilNormalizado = {
              ...profileData,
              nombre_completo: profileData.nombre_completo || profileData.full_name || profileData.email
            }
            setProfile(perfilNormalizado)
          }
        }
      }
    )

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = async () => {
    try {
      console.log('🚪 Cerrando sesión...')
      await supabase.auth.signOut()
      localStorage.clear()
      sessionStorage.clear()
      setUser(null)
      setProfile(null)
      console.log('✅ Sesión cerrada')
      window.location.href = '/login'
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error)
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/login'
    }
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    isAdmin: profile?.rol === 'administrador',
    isEspecialista: profile?.rol === 'especialista',
    isAdminEspecialista: profile?.rol === 'admin_especialista'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}