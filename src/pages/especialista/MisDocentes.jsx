import { useState, useMemo } from 'react';

export default function MisDocentes({
  docentesAsignados = [],
  evaluacionesRealizadas = [],
  onVerificarEvaluar,
  onVerDetalle,
  obtenerEstadoDocente
}) {
  const [filtros, setFiltros] = useState({
    departamento: '',
    busqueda: ''
  });

  // Debug: Ver qué props llegan
  console.log('🔍 MisDocentes recibió:', {
    docentesAsignados: docentesAsignados.length,
    evaluacionesRealizadas: evaluacionesRealizadas.length,
    onVerificarEvaluar: typeof onVerificarEvaluar,
    onVerDetalle: typeof onVerDetalle,
    obtenerEstadoDocente: typeof obtenerEstadoDocente
  });

  const filteredDocentes = useMemo(() => {
    let resultado = [...docentesAsignados];

    if (filtros.departamento) {
      resultado = resultado.filter(d => d.departamento === filtros.departamento);
    }

    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(d =>
        d.nombre_completo?.toLowerCase().includes(busqueda) ||
        d.codigo_docente?.toLowerCase().includes(busqueda) ||
        d.nombre_centro?.toLowerCase().includes(busqueda)
      );
    }

    return resultado;
  }, [docentesAsignados, filtros]);

  const departamentosUnicos = [...new Set(docentesAsignados.map(d => d.departamento))].filter(Boolean);
  
  const completados = evaluacionesRealizadas.filter(e => e.estado_evaluacion === 'completada').length;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="busqueda-docente" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar (Nombre o Código)
            </label>
            <input
              id="busqueda-docente"
              name="busqueda"
              type="text"
              placeholder="Buscar docente..."
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="filtro-departamento" className="block text-sm font-medium text-gray-700 mb-1">
              Departamento
            </label>
            <select
              id="filtro-departamento"
              name="departamento"
              value={filtros.departamento}
              onChange={(e) => setFiltros({ ...filtros, departamento: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los departamentos</option>
              {departamentosUnicos.map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>
        </div>

        {(filtros.busqueda || filtros.departamento) && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setFiltros({ departamento: '', busqueda: '' })}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla de Docentes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Mis Docentes Asignados ({filteredDocentes.length})
            {completados > 0 && (
              <span className="ml-3 text-sm text-green-600 font-normal">
                ✅ {completados} de {docentesAsignados.length} evaluados
              </span>
            )}
          </h2>
        </div>

        {filteredDocentes.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl block mb-3">👥</span>
            <p className="text-gray-500">
              {filtros.busqueda || filtros.departamento
                ? 'No se encontraron docentes con los filtros aplicados'
                : 'No tienes docentes asignados actualmente'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre Completo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Centro Educativo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Municipio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado Docente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado Evaluación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocentes.map((docente) => {
                  const estadoEval = obtenerEstadoDocente(docente.id);
                  return (
                    <tr key={docente.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {docente.codigo_docente}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {docente.nombre_completo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {docente.nombre_centro}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {docente.departamento}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {docente.municipio}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          docente.estado === 'activo'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {docente.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {estadoEval.evaluado ? (
                          <div className="flex flex-col">
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                              ✅ Evaluado
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              {estadoEval.fecha}
                            </span>
                            <span className="text-xs text-gray-600 font-semibold">
                              Puntaje: {estadoEval.puntaje}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                            ⏳ Pendiente
                          </span>
                        )}
                      </td>
                      {/* ✅ SECCIÓN MODIFICADA CON VALIDACIONES */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              // ✅ VALIDACIÓN: Verificar que la función existe
                              if (!onVerificarEvaluar) {
                                console.error('❌ SEGURIDAD: onVerificarEvaluar no disponible');
                                alert('Error: No tienes permisos para realizar esta acción');
                                return;
                              }
                              
                              // ✅ VALIDACIÓN: Verificar que el docente es válido
                              if (!docente?.id) {
                                console.error('❌ SEGURIDAD: Docente inválido');
                                alert('Error: Docente no válido');
                                return;
                              }
                              
                              console.log('🎯 Evaluando docente autorizado:', docente.codigo_docente);
                              onVerificarEvaluar(docente);
                            }}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            {estadoEval.evaluado ? 'Re-evaluar' : 'Evaluar'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              // ✅ VALIDACIÓN: Verificar que la función existe
                              if (!onVerDetalle) {
                                console.error('❌ SEGURIDAD: onVerDetalle no disponible');
                                return;
                              }
                              
                              console.log('📋 Ver detalle docente:', docente.codigo_docente);
                              onVerDetalle(docente);
                            }}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                          >
                            Ver Detalle
                          </button>
                        </div>
                      </td>
                      {/* ✅ FIN DE SECCIÓN MODIFICADA */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}