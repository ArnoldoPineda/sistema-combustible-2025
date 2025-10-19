import FormularioEvaluacionTEACH from '../especialista/FormularioEvaluacionTEACH';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function GestionEvaluaciones() {
  const { profile } = useAuth();
  const esAdminEspecialista = profile?.rol === 'admin_especialista';

  const [loading, setLoading] = useState(true);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [filteredEvaluaciones, setFilteredEvaluaciones] = useState([]);
  const [especialistas, setEspecialistas] = useState([]);
  const [evaluacionSeleccionada, setEvaluacionSeleccionada] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [mostrarFormularioEvaluacion, setMostrarFormularioEvaluacion] = useState(false);
  const [docenteAEvaluar, setDocenteAEvaluar] = useState(null);
  
  const [filtros, setFiltros] = useState({
    especialista: '',
    departamento: '',
    estado: '',
    busqueda: ''
  });

  const [estadisticas, setEstadisticas] = useState({
    totalEvaluaciones: 0,
    completadas: 0,
    borradores: 0,
    promedioGlobal: 0,
    promedioAmbiente: 0,
    promedioInstruccion: 0,
    promedioSocioemocional: 0
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    aplicarFiltros();
    calcularEstadisticas();
  }, [filtros, evaluaciones]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const { data: evalData, error: evalError } = await supabase
        .from('evaluaciones')
        .select(`
          *,
          docentes (
            codigo_docente,
            nombre_completo,
            nombre_centro,
            departamento,
            municipio
          ),
          evaluador:profiles!evaluador_id (
            nombre_completo,
            email
          )
        `)
        .order('fecha_evaluacion', { ascending: false });

      if (evalError) throw evalError;

      setEvaluaciones(evalData || []);
      setFilteredEvaluaciones(evalData || []);

      const { data: espData, error: espError } = await supabase
        .from('profiles')
        .select('id, nombre_completo, email')
        .eq('rol', 'especialista')
        .eq('activo', true)
        .order('nombre_completo');

      if (espError) throw espError;

      setEspecialistas(espData || []);

    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar las evaluaciones');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...evaluaciones];

    if (filtros.especialista) {
      resultado = resultado.filter(e => e.evaluador_id === filtros.especialista);
    }

    if (filtros.departamento) {
      resultado = resultado.filter(e => e.docentes?.departamento === filtros.departamento);
    }

    if (filtros.estado) {
      resultado = resultado.filter(e => e.estado_evaluacion === filtros.estado);
    }

    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(e =>
        e.docentes?.nombre_completo?.toLowerCase().includes(busqueda) ||
        e.docentes?.codigo_docente?.toLowerCase().includes(busqueda) ||
        e.docentes?.nombre_centro?.toLowerCase().includes(busqueda)
      );
    }

    setFilteredEvaluaciones(resultado);
  };

  const calcularEstadisticas = () => {
    const total = filteredEvaluaciones.length;
    const completadas = filteredEvaluaciones.filter(e => e.estado_evaluacion === 'completada').length;
    const borradores = filteredEvaluaciones.filter(e => e.estado_evaluacion === 'borrador').length;

    const evaluacionesCompletas = filteredEvaluaciones.filter(e => 
      e.estado_evaluacion === 'completada' && e.puntaje_global > 0
    );

    const promedioGlobal = evaluacionesCompletas.length > 0
      ? evaluacionesCompletas.reduce((sum, e) => sum + (e.puntaje_global || 0), 0) / evaluacionesCompletas.length
      : 0;

    const promedioAmbiente = evaluacionesCompletas.length > 0
      ? evaluacionesCompletas.reduce((sum, e) => sum + (e.puntaje_ambiente || 0), 0) / evaluacionesCompletas.length
      : 0;

    const promedioInstruccion = evaluacionesCompletas.length > 0
      ? evaluacionesCompletas.reduce((sum, e) => sum + (e.puntaje_instruccion || 0), 0) / evaluacionesCompletas.length
      : 0;

    const promedioSocioemocional = evaluacionesCompletas.length > 0
      ? evaluacionesCompletas.reduce((sum, e) => sum + (e.puntaje_socioemocional || 0), 0) / evaluacionesCompletas.length
      : 0;

    setEstadisticas({
      totalEvaluaciones: total,
      completadas,
      borradores,
      promedioGlobal,
      promedioAmbiente,
      promedioInstruccion,
      promedioSocioemocional
    });
  };

  const verDetalle = (evaluacion) => {
    setEvaluacionSeleccionada(evaluacion);
    setMostrarDetalle(true);
  };

  const abrirFormularioEvaluacion = (docente) => {
    setDocenteAEvaluar(docente);
    setMostrarFormularioEvaluacion(true);
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
      cargarDatos();
    } catch (error) {
      console.error('Error eliminando evaluación:', error);
      alert('Error al eliminar la evaluación');
    }
  };

  const exportarCSV = () => {
    const headers = [
      'Fecha','Especialista','Docente','Código Docente','Centro','Departamento','Municipio',
      'Ambiente','Instrucción','Socioemocional','Global',
      'A1','A2','B3','B4','B5','B6','C7','C8','C9','Estado'
    ];

    const rows = filteredEvaluaciones.map(e => [
      new Date(e.fecha_evaluacion).toLocaleDateString(),
      e.evaluador?.nombre_completo || '',
      e.docentes?.nombre_completo || '',
      e.docentes?.codigo_docente || '',
      e.docentes?.nombre_centro || '',
      e.docentes?.departamento || '',
      e.docentes?.municipio || '',
      e.puntaje_ambiente?.toFixed(2) || '0.00',
      e.puntaje_instruccion?.toFixed(2) || '0.00',
      e.puntaje_socioemocional?.toFixed(2) || '0.00',
      e.puntaje_global?.toFixed(2) || '0.00',
      e.puntaje_a1?.toFixed(2) || '0.00',
      e.puntaje_a2?.toFixed(2) || '0.00',
      e.puntaje_b3?.toFixed(2) || '0.00',
      e.puntaje_b4?.toFixed(2) || '0.00',
      e.puntaje_b5?.toFixed(2) || '0.00',
      e.puntaje_b6?.toFixed(2) || '0.00',
      e.puntaje_c7?.toFixed(2) || '0.00',
      e.puntaje_c8?.toFixed(2) || '0.00',
      e.puntaje_c9?.toFixed(2) || '0.00',
      e.estado_evaluacion || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `evaluaciones_teach_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departamentosUnicos = [...new Set(evaluaciones.map(e => e.docentes?.departamento).filter(Boolean))];

  const obtenerColorPuntaje = (puntaje) => {
    if (puntaje >= 2.5) return 'text-green-600';
    if (puntaje >= 2.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando evaluaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Evaluaciones TEACH</h2>
          <p className="text-gray-600 mt-1">Vista completa de todas las evaluaciones del sistema</p>
        </div>
        <button
          onClick={exportarCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <span>📥</span>
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{estadisticas.totalEvaluaciones}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Completadas</p>
          <p className="text-2xl font-bold text-green-600">{estadisticas.completadas}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Borradores</p>
          <p className="text-2xl font-bold text-yellow-600">{estadisticas.borradores}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <p className="text-xs text-blue-600 font-medium">Promedio Ambiente</p>
          <p className={`text-2xl font-bold ${obtenerColorPuntaje(estadisticas.promedioAmbiente)}`}>
            {estadisticas.promedioAmbiente.toFixed(2)}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <p className="text-xs text-green-600 font-medium">Promedio Instrucción</p>
          <p className={`text-2xl font-bold ${obtenerColorPuntaje(estadisticas.promedioInstruccion)}`}>
            {estadisticas.promedioInstruccion.toFixed(2)}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-4">
          <p className="text-xs text-purple-600 font-medium">Promedio Socioemocional</p>
          <p className={`text-2xl font-bold ${obtenerColorPuntaje(estadisticas.promedioSocioemocional)}`}>
            {estadisticas.promedioSocioemocional.toFixed(2)}
          </p>
        </div>
        <div className="bg-orange-50 rounded-lg shadow p-4 border-2 border-orange-300">
          <p className="text-xs text-orange-600 font-medium">Promedio Global</p>
          <p className={`text-2xl font-bold ${obtenerColorPuntaje(estadisticas.promedioGlobal)}`}>
            {estadisticas.promedioGlobal.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Docente</label>
            <input
              type="text"
              placeholder="Nombre o código..."
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Especialista</label>
            <select
              value={filtros.especialista}
              onChange={(e) => setFiltros({ ...filtros, especialista: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los especialistas</option>
              {especialistas.map(esp => (
                <option key={esp.id} value={esp.id}>{esp.nombre_completo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
            <select
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="completada">Completada</option>
              <option value="borrador">Borrador</option>
            </select>
          </div>
        </div>

        {(filtros.busqueda || filtros.especialista || filtros.departamento || filtros.estado) && (
          <div className="mt-4">
            <button
              onClick={() => setFiltros({ especialista: '', departamento: '', estado: '', busqueda: '' })}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Limpiar Filtros
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Evaluaciones ({filteredEvaluaciones.length})
          </h3>
        </div>

        {filteredEvaluaciones.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl block mb-3">📋</span>
            <p className="text-gray-500">No se encontraron evaluaciones</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialista</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Docente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ambiente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instrucción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Socioemocional</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Global</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvaluaciones.map((evaluacion) => (
                  <tr key={evaluacion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(evaluacion.fecha_evaluacion).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{evaluacion.evaluador?.nombre_completo}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{evaluacion.docentes?.nombre_completo}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{evaluacion.docentes?.nombre_centro}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{evaluacion.docentes?.departamento}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{evaluacion.puntaje_ambiente?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{evaluacion.puntaje_instruccion?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">{evaluacion.puntaje_socioemocional?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-bold text-lg ${obtenerColorPuntaje(evaluacion.puntaje_global)}`}>
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
                        <button
                          onClick={() => verDetalle(evaluacion)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Ver
                        </button>
                        <button
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
      {/* Lista de docentes para evaluar (solo admin_especialista) */}
      {esAdminEspecialista && (
        <ListaDocentesParaEvaluar 
          onEvaluar={abrirFormularioEvaluacion}
        />
      )}

      {/* Modal de formulario de evaluación */}
      {mostrarFormularioEvaluacion && docenteAEvaluar && (
        <FormularioEvaluacionTEACH
          docente={docenteAEvaluar}
          onClose={() => {
            setMostrarFormularioEvaluacion(false);
            setDocenteAEvaluar(null);
          }}
          onSuccess={() => {
            cargarDatos();
            setMostrarFormularioEvaluacion(false);
            setDocenteAEvaluar(null);
          }}
        />
      )}

      {/* Modal de Detalle */}
      {mostrarDetalle && evaluacionSeleccionada && (
        <DetalleEvaluacionAdmin
          evaluacion={evaluacionSeleccionada}
          onClose={() => {
            setMostrarDetalle(false);
            setEvaluacionSeleccionada(null);
          }}
        />
      )}
    </div>
  );
}

// Componente de detalle
function DetalleEvaluacionAdmin({ evaluacion, onClose }) {
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
                Evaluador: {evaluacion.evaluador?.nombre_completo} • 
                Fecha: {new Date(evaluacion.fecha_evaluacion).toLocaleDateString()}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold mb-4">Puntajes por Dimensión</h3>
          <div className="grid grid-cols-4 gap-4 mb-6">
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

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Información del Docente</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Código</p>
                  <p className="font-medium">{evaluacion.docentes?.codigo_docente}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Centro Educativo</p>
                  <p className="font-medium">{evaluacion.docentes?.nombre_centro}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ubicación</p>
                  <p className="font-medium">{evaluacion.docentes?.departamento}, {evaluacion.docentes?.municipio}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Información de la Observación</h3>
              <div className="space-y-2">
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
            </div>
          </div>

          {evaluacion.observaciones && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-2">Observaciones</h4>
              <p className="text-gray-700 bg-gray-50 p-4 rounded">{evaluacion.observaciones}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente para listar docentes y evaluar
function ListaDocentesParaEvaluar({ onEvaluar }) {
  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    cargarDocentes();
  }, []);

  const cargarDocentes = async () => {
    try {
      const { data, error } = await supabase
        .from('docentes')
        .select('*')
        .order('nombre_completo');

      if (error) throw error;
      setDocentes(data || []);
    } catch (error) {
      console.error('Error cargando docentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const docentesFiltrados = docentes.filter(d =>
    d.nombre_completo?.toLowerCase().includes(filtro.toLowerCase()) ||
    d.codigo_docente?.toLowerCase().includes(filtro.toLowerCase())
  );

  if (loading) return <p className="text-center py-4">Cargando docentes...</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">🎯 Evaluar Docente</h3>
      <input
        type="text"
        placeholder="Buscar docente por nombre o código..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg mb-4"
      />
      <div className="max-h-96 overflow-y-auto">
        {docentesFiltrados.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No se encontraron docentes</p>
        ) : (
          docentesFiltrados.map(docente => (
            <div key={docente.id} className="flex justify-between items-center p-3 border-b hover:bg-gray-50">
              <div>
                <p className="font-medium">{docente.nombre_completo}</p>
                <p className="text-sm text-gray-600">{docente.codigo_docente} - {docente.nombre_centro}</p>
              </div>
              <button
                onClick={() => onEvaluar(docente)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Evaluar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}