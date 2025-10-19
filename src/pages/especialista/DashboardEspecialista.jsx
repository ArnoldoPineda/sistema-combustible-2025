import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import FormularioEvaluacionTEACH from './FormularioEvaluacionTEACH';
import GraficosEvaluacion from '../../components/GraficosEvaluacion';
import ExportarPDF from '../../components/ExportarPDF';
import EstadisticasGlobales from '../../components/EstadisticasGlobales';
import MisDocentes from './MisDocentes';

export default function DashboardEspecialista() {
  const { user, profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [docentesAsignados, setDocentesAsignados] = useState([]);
  const [evaluacionesRealizadas, setEvaluacionesRealizadas] = useState([]);
  const [docenteSeleccionado, setDocenteSeleccionado] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarDetalleEvaluacion, setMostrarDetalleEvaluacion] = useState(false);
  const [evaluacionSeleccionada, setEvaluacionSeleccionada] = useState(null);
  const [vistaActiva, setVistaActiva] = useState('docentes');
  const [estadisticas, setEstadisticas] = useState({
    totalAsignados: 0,
    pendientes: 0,
    completados: 0
  });
  
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [docenteParaEvaluar, setDocenteParaEvaluar] = useState(null);
  const [evaluacionesPrevias, setEvaluacionesPrevias] = useState([]);

  const cargaInicial = useRef(false);

  useEffect(() => {
    if (user?.id && !cargaInicial.current) {
      cargaInicial.current = true;
      const cargarDatos = async () => {
        await cargarDocentesAsignados();
        await cargarEvaluacionesRealizadas();
      };
      cargarDatos();
    }
  }, [user?.id]);

const cargarDocentesAsignados = async () => {
  try {
    setLoading(true);

    if (!user?.id) {
      console.log('⚠️ No hay user.id disponible');
      setLoading(false);
      return;
    }

    console.log('🔍 Cargando docentes para especialista:', user.id);

    // ✅ VALIDACIÓN DE SEGURIDAD: Solo SUS docentes asignados
    const { data, error } = await supabase
      .from('docentes')
      .select('*')
      .eq('especialista_id', user.id) // ✅ CRÍTICO: Solo docentes de ESTE especialista
      .eq('estado', 'activo')
      .order('nombre_completo');

    if (error) {
      console.error('❌ Error en Supabase:', error);
      throw error;
    }

    // ✅ VALIDACIÓN: Verificar que todos los docentes pertenecen al especialista
    const docentesInvalidos = data?.filter(d => d.especialista_id !== user.id) || [];
    if (docentesInvalidos.length > 0) {
      console.error('🚨 ALERTA DE SEGURIDAD: Docentes no autorizados detectados:', docentesInvalidos);
      // Filtrar solo los válidos
      const docentesValidos = data?.filter(d => d.especialista_id === user.id) || [];
      setDocentesAsignados(docentesValidos);
      setEstadisticas(prev => ({
        ...prev,
        totalAsignados: docentesValidos.length || 0
      }));
      return docentesValidos.length;
    }

    console.log('✅ Docentes cargados:', data?.length || 0);
    setDocentesAsignados(data || []);
    setEstadisticas(prev => ({
      ...prev,
      totalAsignados: data?.length || 0
    }));

    return data?.length || 0;

  } catch (error) {
    console.error('Error cargando docentes asignados:', error);
    alert('Error al cargar docentes asignados');
    return 0;
  } finally {
    setLoading(false);
  }
};

  const cargarEvaluacionesRealizadas = async () => {
    try {
      if (!user?.id) return;

      console.log('🔍 Cargando evaluaciones del especialista:', user.id);

      const { data, error } = await supabase
        .from('evaluaciones')
        .select(`
          *,
          docentes (
            codigo_docente,
            nombre_completo,
            nombre_centro,
            departamento
          )
        `)
        .eq('evaluador_id', user.id)
        .order('fecha_evaluacion', { ascending: false });

      if (error) throw error;

      console.log('✅ Evaluaciones cargadas:', data?.length || 0);
      setEvaluacionesRealizadas(data || []);

      const completadas = data?.filter(e => e.estado_evaluacion === 'completada').length || 0;
      
      console.log('📊 Estadísticas calculadas:', {
        completadas,
        data: data?.length
      });

      setEstadisticas(prev => {
        const totalAsignados = prev.totalAsignados || 0;
        const pendientes = Math.max(0, totalAsignados - completadas);
        
        console.log('📊 Actualizando estadísticas:', {
          totalAsignados,
          completadas,
          pendientes
        });
        
        return {
          totalAsignados,
          completados: completadas,
          pendientes
        };
      });

    } catch (error) {
      console.error('Error cargando evaluaciones:', error);
    }
  };

  const verificarYEvaluar = async (docente) => {
  console.log('🎯 verificarYEvaluar llamado con:', docente);
  
  try {
    // Buscar evaluaciones previas
    const { data, error } = await supabase
      .from('evaluaciones')
      .select('id, fecha_evaluacion, estado_evaluacion, puntaje_global')
      .eq('docente_id', docente.id)
      .eq('evaluador_id', user.id)
      .order('fecha_evaluacion', { ascending: false });

    if (error) {
      console.error('Error buscando evaluaciones:', error);
      throw error;
    }

    console.log('📊 Evaluaciones encontradas:', data?.length || 0);

    if (data && data.length > 0) {
      console.log('✅ Evaluaciones previas encontradas:', data.length);
      setDocenteParaEvaluar(docente);
      setEvaluacionesPrevias(data);
      setMostrarModalConfirmacion(true);
    } else {
      console.log('✅ Sin evaluaciones previas, iniciando evaluación directa');
      iniciarEvaluacion(docente);
    }
  } catch (error) {
    console.error('❌ Error verificando evaluaciones:', error);
    alert('Error al verificar evaluaciones previas. Iniciando evaluación de todos modos...');
    iniciarEvaluacion(docente);
  }
};

  const iniciarEvaluacion = (docente) => {
  console.log('📝 Iniciando evaluación para:', docente.nombre_completo);
  setDocenteSeleccionado(docente);
  setEvaluacionSeleccionada(null);
  setMostrarFormulario(true);
  setMostrarModalConfirmacion(false);
};

  const continuarEvaluacion = async (evaluacion) => {
    try {
      console.log('🔄 Continuando evaluación:', evaluacion);
      
      let docente = docentesAsignados.find(d => d.id === evaluacion.docente_id);
      
      if (!docente && evaluacion.docentes) {
        docente = {
          id: evaluacion.docente_id,
          codigo_docente: evaluacion.docentes.codigo_docente,
          nombre_completo: evaluacion.docentes.nombre_completo,
          nombre_centro: evaluacion.docentes.nombre_centro,
          departamento: evaluacion.docentes.departamento
        };
      }
      
      if (!docente) {
        alert('No se encontró el docente asociado a esta evaluación');
        return;
      }

      setDocenteSeleccionado(docente);
      setEvaluacionSeleccionada(evaluacion);
      setMostrarFormulario(true);
    } catch (error) {
      console.error('Error cargando borrador:', error);
      alert('Error al cargar el borrador');
    }
  };

 const verDetalleDocente = (docente) => {
  // Crear modal personalizado en lugar de alert
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-xl font-bold text-gray-900">Detalle del Docente</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
      </div>
      <div class="space-y-3">
        <div><span class="font-semibold">Nombre:</span> ${docente.nombre_completo}</div>
        <div><span class="font-semibold">Código:</span> ${docente.codigo_docente}</div>
        <div><span class="font-semibold">DNI:</span> ${docente.cedula_identidad || 'N/A'}</div>
        <div><span class="font-semibold">Centro:</span> ${docente.nombre_centro}</div>
        <div><span class="font-semibold">Departamento:</span> ${docente.departamento}</div>
        <div><span class="font-semibold">Municipio:</span> ${docente.municipio || 'N/A'}</div>
        <div><span class="font-semibold">Email:</span> ${docente.email || 'N/A'}</div>
        <div><span class="font-semibold">Celular:</span> ${docente.celular || 'N/A'}</div>
      </div>
      <div class="mt-6 flex justify-end">
        <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Cerrar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

  const verDetalleEvaluacion = (evaluacion) => {
    setEvaluacionSeleccionada(evaluacion);
    setMostrarDetalleEvaluacion(true);
  };

  const eliminarEvaluacion = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta evaluación?')) return;

    try {
      const { error } = await supabase
        .from('evaluaciones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Evaluación eliminada exitosamente');
      await cargarDocentesAsignados();
      await cargarEvaluacionesRealizadas();
    } catch (error) {
      console.error('Error eliminando evaluación:', error);
      alert('Error al eliminar la evaluación');
    }
  };

  const obtenerEstadoDocente = (docenteId) => {
    const evaluacion = evaluacionesRealizadas.find(
      ev => ev.docente_id === docenteId && ev.estado_evaluacion === 'completada'
    );
    
    if (evaluacion) {
      return {
        evaluado: true,
        fecha: new Date(evaluacion.fecha_evaluacion).toLocaleDateString('es-HN'),
        puntaje: evaluacion.puntaje_global?.toFixed(2) || 'N/A'
      };
    }
    
    return { evaluado: false };
  };

  const handleSignOut = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      console.log('🚪 Iniciando cierre de sesión...');
      
      // Método 1: Usar signOut del contexto
      if (signOut && typeof signOut === 'function') {
        await signOut();
        console.log('✅ Sesión cerrada con éxito');
        return;
      }
      
      // Método 2: Cerrar sesión directamente con Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error en signOut:', error);
      }
      
      // Método 3: Forzar limpieza manual (fallback)
      console.log('⚠️ Usando método de limpieza manual');
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirigir
      window.location.href = '/login';
      
    } catch (error) {
      console.error('❌ Error crítico cerrando sesión:', error);
      // Forzar cierre de sesión limpiando todo
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos del especialista...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No se pudo cargar la información del usuario</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header con Botón de Cerrar Sesión */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div>
  <h1 className="text-3xl font-bold text-gray-900">Especialista en tableros de instrumentos</h1>
  {profile?.nombre_completo && (
    <p className="text-gray-600 mt-1">
      👤 <span className="font-semibold">{profile.nombre_completo}</span>
    </p>
  )}
  <p className="text-gray-600 mt-1">Gestión de docentes asignados y evaluaciones TEACH</p>
</div>
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSignOut}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
            >
              Cerrar Sesión
            </button>
            
            {/* Botón de emergencia (solo visible si hay problemas) */}
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Cerrar sesión forzada?')) {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/login';
                }
              }}
              className="px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 text-xs"
              title="Cierre de sesión de emergencia"
            >
              🆘
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 mt-4 flex-wrap">
          <button
            type="button"
            onClick={() => setVistaActiva('docentes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              vistaActiva === 'docentes'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📚 Docentes Asignados
          </button>
          <button
            type="button"
            onClick={() => setVistaActiva('evaluaciones')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              vistaActiva === 'evaluaciones'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📊 Evaluaciones Realizadas ({evaluacionesRealizadas.length})
          </button>
          <button
            type="button"
            onClick={() => setVistaActiva('estadisticas')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              vistaActiva === 'estadisticas'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📈 Estadísticas
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total asignados</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.totalAsignados}</p>
            </div>
            <span className="text-4xl">👥</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Evaluaciones Pendientes</p>
              <p className="text-2xl font-bold text-orange-600">{estadisticas.pendientes}</p>
            </div>
            <span className="text-4xl">⏳</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Evaluaciones completadas</p>
              <p className="text-2xl font-bold text-green-600">{estadisticas.completados}</p>
            </div>
            <span className="text-4xl">✅</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Progreso</p>
              <p className="text-2xl font-bold text-purple-600">
                {estadisticas.totalAsignados > 0 
                  ? Math.round((estadisticas.completados / estadisticas.totalAsignados) * 100)
                  : 0}%
              </p>
            </div>
            <span className="text-4xl">📋</span>
          </div>
        </div>
      </div>

      {/* VISTA: DOCENTES ASIGNADOS */}
      {vistaActiva === 'docentes' && (
        <MisDocentes
          docentesAsignados={docentesAsignados}
          evaluacionesRealizadas={evaluacionesRealizadas}
          onVerificarEvaluar={verificarYEvaluar}
          onVerDetalle={verDetalleDocente}
          obtenerEstadoDocente={obtenerEstadoDocente}
        />
      )}

      {/* VISTA: EVALUACIONES REALIZADAS */}
      {vistaActiva === 'evaluaciones' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Evaluaciones Realizadas ({evaluacionesRealizadas.length})
            </h2>
          </div>

          {evaluacionesRealizadas.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl block mb-3">📋</span>
              <p className="text-gray-500">No has realizado evaluaciones aún</p>
              <button
                type="button"
                onClick={() => setVistaActiva('docentes')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Ir a Docentes Asignados
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Docente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Centro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ambiente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Instrucción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Socioemocional
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Global
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {evaluacionesRealizadas.map((evaluacion) => (
                    <tr key={evaluacion.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(evaluacion.fecha_evaluacion).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {evaluacion.docentes?.nombre_completo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {evaluacion.docentes?.nombre_centro}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="font-bold text-blue-600">
                          {evaluacion.puntaje_ambiente?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="font-bold text-green-600">
                          {evaluacion.puntaje_instruccion?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="font-bold text-purple-600">
                          {evaluacion.puntaje_socioemocional?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="font-bold text-orange-600 text-lg">
                          {evaluacion.puntaje_global?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          evaluacion.estado_evaluacion === 'completada'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {evaluacion.estado_evaluacion === 'completada' ? 'Completada' : 'Borrador'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {evaluacion.estado_evaluacion === 'borrador' && (
                            <button
                              type="button"
                              onClick={() => continuarEvaluacion(evaluacion)}
                              className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                            >
                              ✏️ Continuar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => verDetalleEvaluacion(evaluacion)}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Ver Detalle
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminarEvaluacion(evaluacion.id)}
                            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VISTA: ESTADÍSTICAS GLOBALES */}
      {vistaActiva === 'estadisticas' && (
        <EstadisticasGlobales />
      )}

      {/* Modal de Confirmación */}
      {mostrarModalConfirmacion && docenteParaEvaluar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 bg-yellow-100 rounded-full p-3 mr-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Docente Ya Evaluado
                </h3>
                <p className="text-gray-700 mb-4">
                  El docente <strong>{docenteParaEvaluar.nombre_completo}</strong> ya tiene{' '}
                  <strong>{evaluacionesPrevias.length}</strong>{' '}
                  {evaluacionesPrevias.length === 1 ? 'evaluación' : 'evaluaciones'} realizada(s) previamente.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-60 overflow-y-auto">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Evaluaciones Previas:</h4>
                  {evaluacionesPrevias.map((ev, index) => (
                    <div key={ev.id} className="bg-white rounded p-3 mb-2 border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Evaluación #{index + 1}
                          </p>
                          <p className="text-xs text-gray-600">
                            Fecha: {new Date(ev.fecha_evaluacion).toLocaleDateString('es-HN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">
                            {ev.puntaje_global?.toFixed(2) || 'N/A'}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            ev.estado_evaluacion === 'completada'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {ev.estado_evaluacion}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Nota:</strong> Puedes crear una nueva evaluación para seguimiento o 
                    ver las evaluaciones anteriores desde "Evaluaciones Realizadas".
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  window._evaluating = false; // Limpiar bandera
                  setMostrarModalConfirmacion(false);
                  setDocenteParaEvaluar(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  window._evaluating = false; // Limpiar bandera
                  setVistaActiva('evaluaciones');
                  setMostrarModalConfirmacion(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ver Evaluaciones Anteriores
              </button>
              <button
                type="button"
                onClick={() => iniciarEvaluacion(docenteParaEvaluar)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                ✅ Crear Nueva Evaluación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal del Formulario */}
      {mostrarFormulario && docenteSeleccionado && (
        <FormularioEvaluacionTEACH
          docente={docenteSeleccionado}
          evaluacionExistente={evaluacionSeleccionada}
          onClose={() => {
            window._evaluating = false;
            setMostrarFormulario(false);
            setDocenteSeleccionado(null);
            setEvaluacionSeleccionada(null);
          }}
          onSuccess={async () => {
            window._evaluating = false;
            console.log('🔄 Recargando datos después de éxito...');
            await cargarDocentesAsignados();
            await cargarEvaluacionesRealizadas();
          }}
        />
      )}

      {/* Modal de Detalle */}
      {mostrarDetalleEvaluacion && evaluacionSeleccionada && (
        <DetalleEvaluacion
          evaluacion={evaluacionSeleccionada}
          onClose={() => {
            setMostrarDetalleEvaluacion(false);
            setEvaluacionSeleccionada(null);
          }}
        />
      )}
    </div>
  );
}

function DetalleEvaluacion({ evaluacion, onClose }) {
  const [tabActiva, setTabActiva] = useState('resumen');

  const obtenerColorPuntaje = (puntaje) => {
    if (puntaje >= 2.5) return 'text-green-600';
    if (puntaje >= 2.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Detalle de Evaluación TEACH</h2>
              <p className="text-gray-600 mt-1">
                Docente: <span className="font-medium">{evaluacion.docentes?.nombre_completo}</span>
              </p>
              <p className="text-sm text-gray-500">
                Fecha: {new Date(evaluacion.fecha_evaluacion).toLocaleDateString()} • 
                Estado: {evaluacion.estado_evaluacion === 'completada' ? 'Completada' : 'Borrador'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setTabActiva('resumen')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                tabActiva === 'resumen'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📊 Resumen
            </button>
            <button
              type="button"
              onClick={() => setTabActiva('graficos')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                tabActiva === 'graficos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📈 Gráficos
            </button>
          </div>
        </div>

        {tabActiva === 'resumen' && (
          <>
            <div className="p-6 bg-gray-50 border-b">
              <h3 className="text-lg font-semibold mb-4">Puntajes por Dimensión</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg text-center shadow">
                  <p className="text-sm text-gray-600 mb-1">AMBIENTE</p>
                  <p className={`text-3xl font-bold ${obtenerColorPuntaje(evaluacion.puntaje_ambiente)}`}>
                    {evaluacion.puntaje_ambiente?.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg text-center shadow">
                  <p className="text-sm text-gray-600 mb-1">INSTRUCCIÓN</p>
                  <p className={`text-3xl font-bold ${obtenerColorPuntaje(evaluacion.puntaje_instruccion)}`}>
                    {evaluacion.puntaje_instruccion?.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg text-center shadow">
                  <p className="text-sm text-gray-600 mb-1">SOCIOEMOCIONAL</p>
                  <p className={`text-3xl font-bold ${obtenerColorPuntaje(evaluacion.puntaje_socioemocional)}`}>
                    {evaluacion.puntaje_socioemocional?.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg text-center shadow border-2 border-orange-300">
                  <p className="text-sm text-gray-600 mb-1">GLOBAL</p>
                  <p className={`text-3xl font-bold ${obtenerColorPuntaje(evaluacion.puntaje_global)}`}>
                    {evaluacion.puntaje_global?.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-md font-semibold mb-3">Puntajes por Subdimensión</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-blue-600 font-medium">A1: Trato Respetuoso</p>
                    <p className="text-xl font-bold text-blue-700">{evaluacion.puntaje_a1?.toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-blue-600 font-medium">A2: Manejo Comportamiento</p>
                    <p className="text-xl font-bold text-blue-700">{evaluacion.puntaje_a2?.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-green-600 font-medium">B3: Facilitación</p>
                    <p className="text-xl font-bold text-green-700">{evaluacion.puntaje_b3?.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-green-600 font-medium">B4: Avance</p>
                    <p className="text-xl font-bold text-green-700">{evaluacion.puntaje_b4?.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-green-600 font-medium">B5: Retroalimentación</p>
                    <p className="text-xl font-bold text-green-700">{evaluacion.puntaje_b5?.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-green-600 font-medium">B6: Pensamiento Crítico</p>
                    <p className="text-xl font-bold text-green-700">{evaluacion.puntaje_b6?.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-xs text-purple-600 font-medium">C7: Autonomía</p>
                    <p className="text-xl font-bold text-purple-700">{evaluacion.puntaje_c7?.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-xs text-purple-600 font-medium">C8: Perseverancia</p>
                    <p className="text-xl font-bold text-purple-700">{evaluacion.puntaje_c8?.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-xs text-purple-600 font-medium">C9: Habilidades Sociales</p>
                    <p className="text-xl font-bold text-purple-700">{evaluacion.puntaje_c9?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-lg font-semibold mb-4">Información de la Observación</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Horario</p>
                  <p className="font-medium">{evaluacion.hora_inicio || '-'} - {evaluacion.hora_fin || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nivel/Grado</p>
                  <p className="font-medium">{evaluacion.nivel_grado || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Materia</p>
                  <p className="font-medium">{evaluacion.materia || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Formato</p>
                  <p className="font-medium capitalize">{evaluacion.formato_clase || '-'}</p>
                </div>
              </div>

              {evaluacion.observaciones && (
                <div className="mb-6">
                  <h4 className="text-md font-semibold mb-2">Observaciones</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded">{evaluacion.observaciones}</p>
                </div>
              )}
            </div>
          </>
        )}

        {tabActiva === 'graficos' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-8">
              <GraficosEvaluacion evaluacion={evaluacion} tipo="radar" />
              <GraficosEvaluacion evaluacion={evaluacion} tipo="barras" />
              <GraficosEvaluacion evaluacion={evaluacion} tipo="comparativo" />
            </div>
          </div>
        )}

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            <ExportarPDF evaluacion={evaluacion} />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}