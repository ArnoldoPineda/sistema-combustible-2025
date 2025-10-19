import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function GestionAsignacionesDocentes() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [docentes, setDocentes] = useState([]);
  const [especialistas, setEspecialistas] = useState([]);
  const [cambios, setCambios] = useState({});
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    busqueda: '',
    departamento: '',
    centro: '',
    especialista: '',
    estado: 'todos'
  });

  // Estado para mostrar/ocultar resumen de especialistas
  const [mostrarResumen, setMostrarResumen] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const { data: docentesData, error: errorDocentes } = await supabase
        .from('docentes')
        .select('id, codigo_docente, nombre_completo, departamento, municipio, nombre_centro, especialista_id')
        .order('nombre_completo');

      if (errorDocentes) throw errorDocentes;

      const { data: especialistasData, error: errorEspecialistas } = await supabase
        .from('profiles')
        .select('id, nombre_completo, email')
        .eq('rol', 'especialista')
        .eq('activo', true)
        .order('nombre_completo');

      if (errorEspecialistas) throw errorEspecialistas;

      setDocentes(docentesData || []);
      setEspecialistas(especialistasData || []);
      setCambios({});

    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCambioAsignacion = (docenteId, especialistaId) => {
    setCambios(prevCambios => {
      const nuevosCambios = { ...prevCambios };
      nuevosCambios[docenteId] = especialistaId || null;
      return nuevosCambios;
    });
  };

  const guardarCambios = async () => {
    const cambiosPendientes = Object.keys(cambios);
    
    if (cambiosPendientes.length === 0) {
      alert('No hay cambios para guardar.');
      return;
    }

    if (!window.confirm(`¿Guardar ${cambiosPendientes.length} cambio(s)?`)) {
      return;
    }

    try {
      setGuardando(true);
      let exitosos = 0;

      for (const docenteId of cambiosPendientes) {
        const especialistaId = cambios[docenteId];
        
        const { error } = await supabase
          .from('docentes')
          .update({ especialista_id: especialistaId })
          .eq('id', docenteId);

        if (!error) {
          exitosos++;
        }
      }

      alert(`✅ ${exitosos} asignación(es) guardada(s) exitosamente.`);
      await cargarDatos();

    } catch (error) {
      console.error('Error guardando cambios:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  // Función para obtener el valor actual de especialista (considerando cambios pendientes)
  const obtenerEspecialistaActual = (docenteId, especialistaIdOriginal) => {
    return cambios[docenteId] !== undefined ? cambios[docenteId] : especialistaIdOriginal;
  };

  // Filtrar docentes
  const docentesFiltrados = docentes.filter(docente => {
    const especialistaActual = obtenerEspecialistaActual(docente.id, docente.especialista_id);

    // Filtro de búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      const coincide = 
        (docente.nombre_completo || '').toLowerCase().includes(busqueda) ||
        (docente.codigo_docente || '').toLowerCase().includes(busqueda) ||
        (docente.nombre_centro || '').toLowerCase().includes(busqueda);
      if (!coincide) return false;
    }

    // Filtro de departamento
    if (filtros.departamento && docente.departamento !== filtros.departamento) {
      return false;
    }

    // Filtro de centro
    if (filtros.centro && docente.nombre_centro !== filtros.centro) {
      return false;
    }

    // Filtro de especialista
    if (filtros.especialista && especialistaActual !== filtros.especialista) {
      return false;
    }

    // Filtro de estado
    if (filtros.estado === 'asignados' && !especialistaActual) {
      return false;
    }
    if (filtros.estado === 'sin_asignar' && especialistaActual) {
      return false;
    }

    return true;
  });

  // Calcular estadísticas
  const totalDocentes = docentes.length;
  const docentesAsignados = docentes.filter(d => {
    const espActual = obtenerEspecialistaActual(d.id, d.especialista_id);
    return espActual !== null && espActual !== undefined && espActual !== '';
  }).length;
  const docentesSinAsignar = totalDocentes - docentesAsignados;
  const cambiosPendientes = Object.keys(cambios).length;

  // Calcular resumen por especialista
  const resumenEspecialistas = especialistas.map(esp => {
    const docentesAsignadosAEspecialista = docentes.filter(d => {
      const espActual = obtenerEspecialistaActual(d.id, d.especialista_id);
      return espActual === esp.id;
    });
    return {
      ...esp,
      totalDocentes: docentesAsignadosAEspecialista.length,
      docentes: docentesAsignadosAEspecialista
    };
  }).sort((a, b) => b.totalDocentes - a.totalDocentes);

  const promedioDocentes = especialistas.length > 0 
    ? Math.round(docentesAsignados / especialistas.length) 
    : 0;

  // Obtener listas únicas para filtros
  const departamentos = [...new Set(docentes.map(d => d.departamento).filter(Boolean))].sort();
  const centros = [...new Set(docentes.map(d => d.nombre_centro).filter(Boolean))].sort();

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      departamento: '',
      centro: '',
      especialista: '',
      estado: 'todos'
    });
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prevFiltros => ({
      ...prevFiltros,
      [campo]: valor
    }));
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Asignación de Docentes</h1>
        <p className="text-gray-600 mt-2">Asigna docentes a especialistas para que puedan ser evaluados</p>
      </div>

      {/* Cards de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Docentes</p>
              <p className="text-3xl font-bold text-gray-900">{totalDocentes}</p>
            </div>
            <span className="text-4xl">👥</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Asignados</p>
              <p className="text-3xl font-bold text-green-600">{docentesAsignados}</p>
              <p className="text-xs text-gray-500 mt-1">
                {totalDocentes > 0 ? Math.round((docentesAsignados / totalDocentes) * 100) : 0}% del total
              </p>
            </div>
            <span className="text-4xl">✅</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sin Asignar</p>
              <p className="text-3xl font-bold text-orange-600">{docentesSinAsignar}</p>
              <p className="text-xs text-gray-500 mt-1">
                {totalDocentes > 0 ? Math.round((docentesSinAsignar / totalDocentes) * 100) : 0}% pendiente
              </p>
            </div>
            <span className="text-4xl">⏳</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Especialistas</p>
              <p className="text-3xl font-bold text-purple-600">{especialistas.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                Promedio: {promedioDocentes} docentes
              </p>
            </div>
            <span className="text-4xl">🎯</span>
          </div>
        </div>
      </div>

      {/* Alerta de cambios pendientes */}
      {cambiosPendientes > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <p className="text-sm text-yellow-700">
              <strong>Tienes {cambiosPendientes} cambio(s) sin guardar.</strong> No olvides hacer clic en "Guardar" para aplicar los cambios.
            </p>
          </div>
        </div>
      )}

      {/* Resumen por Especialista (Colapsable) */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => setMostrarResumen(!mostrarResumen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            📊 Resumen por Especialista ({especialistas.length})
          </h3>
          <span className="text-2xl">{mostrarResumen ? '▼' : '▶'}</span>
        </button>

        {mostrarResumen && (
          <div className="px-6 pb-6">
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
                      <p className="font-medium text-gray-900 truncate">{esp.nombre_completo}</p>
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

                  {/* Botón para filtrar por este especialista */}
                  {esp.totalDocentes > 0 && (
                    <button
                      onClick={() => handleFiltroChange('especialista', esp.id)}
                      className="mt-3 w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Ver docentes asignados →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">🔍 Filtros</h3>
          <button
            onClick={limpiarFiltros}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Limpiar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Nombre, código o centro..."
              value={filtros.busqueda}
              onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departamento
            </label>
            <select
              value={filtros.departamento}
              onChange={(e) => handleFiltroChange('departamento', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Todos</option>
              {departamentos.map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>

          {/* Centro Educativo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Centro
            </label>
            <select
              value={filtros.centro}
              onChange={(e) => handleFiltroChange('centro', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Todos</option>
              {centros.map(centro => (
                <option key={centro} value={centro}>{centro}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) => handleFiltroChange('estado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="todos">Todos</option>
              <option value="asignados">Asignados</option>
              <option value="sin_asignar">Sin asignar</option>
            </select>
          </div>
        </div>

        {/* Filtro de especialista (si está activo) */}
        {filtros.especialista && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-700">
                <strong>Filtrando por especialista:</strong>{' '}
                {especialistas.find(e => e.id === filtros.especialista)?.nombre_completo || 'Desconocido'}
              </p>
              <button
                onClick={() => handleFiltroChange('especialista', '')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ✕ Quitar filtro
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Mostrando <strong>{docentesFiltrados.length}</strong> de <strong>{totalDocentes}</strong> docentes
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setCambios({})}
            disabled={cambiosPendientes === 0}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
          >
            Cancelar Cambios
          </button>
          <button
            onClick={guardarCambios}
            disabled={guardando || cambiosPendientes === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {guardando ? 'Guardando...' : `💾 Guardar ${cambiosPendientes > 0 ? `(${cambiosPendientes})` : ''}`}
          </button>
        </div>
      </div>

      {/* Tabla de docentes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Lista de Docentes</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centro</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Especialista</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {docentesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No se encontraron docentes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                docentesFiltrados.map((docente, index) => {
                  const valorActual = cambios[docente.id] !== undefined 
                    ? cambios[docente.id] 
                    : docente.especialista_id;

                  const tieneCambio = cambios[docente.id] !== undefined;

                  return (
                    <tr 
                      key={docente.id}
                      className={tieneCambio ? 'bg-yellow-50' : ''}
                    >
                      <td className="px-6 py-4 text-sm">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium">{docente.codigo_docente || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{docente.nombre_completo || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{docente.departamento || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{docente.nombre_centro || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={valorActual || ''}
                            onChange={(e) => handleCambioAsignacion(docente.id, e.target.value)}
                            className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                              tieneCambio ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Sin asignar</option>
                            {especialistas.map(esp => (
                              <option key={esp.id} value={esp.id}>
                                {esp.nombre_completo}
                              </option>
                            ))}
                          </select>
                          {tieneCambio && (
                            <span className="text-yellow-600 text-sm">●</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}