import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DashboardAsignaciones() {
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    totalDocentes: 0,
    asignados: 0,
    sinAsignar: 0,
    totalEspecialistas: 0
  });
  const [resumenEspecialistas, setResumenEspecialistas] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      console.log('🔄 Cargando datos del dashboard...');

      // Cargar estadísticas generales
      const { data: docentes, error: errorDocentes } = await supabase
        .from('docentes')
        .select('id, especialista_id, nombre_completo, codigo_docente, nombre_centro, departamento');

      if (errorDocentes) {
        console.error('❌ Error cargando docentes:', errorDocentes);
        throw errorDocentes;
      }

      console.log('✅ Docentes cargados:', docentes?.length || 0);

      const totalDocentes = docentes?.length || 0;
      const asignados = docentes?.filter(d => d.especialista_id).length || 0;
      const sinAsignar = totalDocentes - asignados;

      // Cargar especialistas activos
      const { data: especialistas, error: errorEspecialistas } = await supabase
        .from('profiles')
        .select('id, nombre_completo, email')
        .eq('rol', 'especialista')
        .eq('activo', true)
        .order('nombre_completo');

      if (errorEspecialistas) {
        console.error('❌ Error cargando especialistas:', errorEspecialistas);
        throw errorEspecialistas;
      }

      console.log('✅ Especialistas cargados:', especialistas?.length || 0);

      // Calcular resumen por especialista
      const resumen = especialistas?.map(esp => {
        const docentesAsignados = docentes?.filter(d => d.especialista_id === esp.id) || [];
        return {
          id: esp.id,
          nombre: esp.nombre_completo,
          email: esp.email,
          totalDocentes: docentesAsignados.length,
          docentes: docentesAsignados
        };
      }) || [];

      // Ordenar por cantidad de docentes (descendente)
      resumen.sort((a, b) => b.totalDocentes - a.totalDocentes);

      setEstadisticas({
        totalDocentes,
        asignados,
        sinAsignar,
        totalEspecialistas: especialistas?.length || 0
      });

      setResumenEspecialistas(resumen);

      console.log('✅ Dashboard cargado exitosamente');

    } catch (error) {
      console.error('❌ Error cargando dashboard:', error);
      alert('Error al cargar el dashboard de asignaciones: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const especialistasSinAsignar = resumenEspecialistas.filter(e => e.totalDocentes === 0).length;
  
  // 🔧 FIX: Evitar división por cero
  const promedioDocentes = estadisticas.totalEspecialistas > 0 
    ? Math.round(estadisticas.asignados / estadisticas.totalEspecialistas)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard de Asignaciones</h2>
        <p className="text-gray-600 mt-1">Resumen general del sistema de asignación de docentes</p>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Docentes</p>
              <p className="text-3xl font-bold text-gray-900">{estadisticas.totalDocentes}</p>
            </div>
            <span className="text-4xl">👥</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Asignados</p>
              <p className="text-3xl font-bold text-green-600">{estadisticas.asignados}</p>
              <p className="text-xs text-gray-500 mt-1">
                {estadisticas.totalDocentes > 0 
                  ? Math.round((estadisticas.asignados / estadisticas.totalDocentes) * 100)
                  : 0}% del total
              </p>
            </div>
            <span className="text-4xl">✅</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sin Asignar</p>
              <p className="text-3xl font-bold text-orange-600">{estadisticas.sinAsignar}</p>
              <p className="text-xs text-gray-500 mt-1">
                {estadisticas.totalDocentes > 0 
                  ? Math.round((estadisticas.sinAsignar / estadisticas.totalDocentes) * 100)
                  : 0}% pendiente
              </p>
            </div>
            <span className="text-4xl">⏳</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Especialistas</p>
              <p className="text-3xl font-bold text-purple-600">{estadisticas.totalEspecialistas}</p>
              <p className="text-xs text-gray-500 mt-1">
                Promedio: {promedioDocentes} docentes
              </p>
            </div>
            <span className="text-4xl">🎯</span>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {(estadisticas.sinAsignar > 0 || especialistasSinAsignar > 0) && (
        <div className="space-y-3">
          {estadisticas.sinAsignar > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
              <div className="flex">
                <span className="text-2xl mr-3">⚠️</span>
                <div>
                  <p className="text-sm text-orange-700">
                    <strong>Hay {estadisticas.sinAsignar} docente(s) sin asignar.</strong>
                    {' '}Considera asignarlos para que puedan ser evaluados.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {especialistasSinAsignar > 0 && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <span className="text-2xl mr-3">ℹ️</span>
                <div>
                  <p className="text-sm text-blue-700">
                    <strong>{especialistasSinAsignar} especialista(s) no tienen docentes asignados.</strong>
                    {' '}Verifica la distribución de carga.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resumen por Especialista */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Resumen por Especialista ({resumenEspecialistas.length})
        </h3>
        
        {resumenEspecialistas.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay especialistas registrados</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumenEspecialistas.map(esp => (
              <div 
                key={esp.id} 
                className={`border rounded-lg p-4 ${
                  esp.totalDocentes === 0 
                    ? 'border-orange-300 bg-orange-50' 
                    : esp.totalDocentes > promedioDocentes * 1.5
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 truncate">{esp.nombre}</p>
                    <p className="text-xs text-gray-500 truncate">{esp.email}</p>
                  </div>
                  <div className="ml-2 text-right">
                    <span className={`text-2xl font-bold ${
                      esp.totalDocentes === 0 
                        ? 'text-orange-600' 
                        : esp.totalDocentes > promedioDocentes * 1.5
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`}>
                      {esp.totalDocentes}
                    </span>
                  </div>
                </div>
                
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    {esp.totalDocentes === 0 && '⚠️ Sin docentes asignados'}
                    {esp.totalDocentes === 1 && '1 docente asignado'}
                    {esp.totalDocentes > 1 && `${esp.totalDocentes} docentes asignados`}
                  </p>
                  
                  {esp.totalDocentes > promedioDocentes * 1.5 && promedioDocentes > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Sobrecargado (promedio: {promedioDocentes})
                    </p>
                  )}
                </div>

                {/* Mini lista de docentes */}
                {esp.totalDocentes > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                      Ver docentes ({esp.totalDocentes})
                    </summary>
                    <div className="mt-2 pl-2 border-l-2 border-blue-200 space-y-1 max-h-40 overflow-y-auto">
                      {esp.docentes.map(doc => (
                        <div key={doc.id} className="text-xs text-gray-700">
                          • {doc.nombre_completo}
                          <span className="text-gray-500 ml-1">({doc.codigo_docente})</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botón de recarga */}
      <div className="flex justify-end">
        <button
          onClick={cargarDatos}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          🔄 Recargar Datos
        </button>
      </div>
    </div>
  );
}