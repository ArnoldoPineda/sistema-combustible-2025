import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function GestionAsignaciones() {
  const [loading, setLoading] = useState(true);
  const [docentes, setDocentes] = useState([]);
  const [especialistas, setEspecialistas] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [filteredAsignaciones, setFilteredAsignaciones] = useState([]);
  const [docentesSinAsignar, setDocentesSinAsignar] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  const [filtros, setFiltros] = useState({
    docente: '',
    especialista: ''
  });

  const [nuevaAsignacion, setNuevaAsignacion] = useState({
    docente_id: '',
    especialista_id: '',
    notas: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [filtros, asignaciones]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar docentes
      const { data: docentesData, error: docentesError } = await supabase
        .from('docentes')
        .select('*')
        .eq('estado', 'activo')
        .order('nombre_completo');

      if (docentesError) throw docentesError;
      setDocentes(docentesData || []);

      // Cargar especialistas activos
      const { data: especialistasData, error: especialistasError } = await supabase
        .from('profiles')
        .select('id, nombre_completo, email')
        .eq('rol', 'especialista')
        .eq('activo', true)
        .order('nombre_completo');

      if (especialistasError) throw especialistasError;
      setEspecialistas(especialistasData || []);

      // Cargar asignaciones activas con JOIN
      const { data: asignacionesData, error: asignacionesError } = await supabase
        .from('asignaciones')
        .select(`
          *,
          docentes (
            codigo_docente,
            nombre_completo,
            nombre_centro,
            departamento
          ),
          especialista:profiles!especialista_id (
            nombre_completo
          )
        `)
        .eq('estado', 'activa')
        .order('fecha_asignacion', { ascending: false });

      if (asignacionesError) throw asignacionesError;
      setAsignaciones(asignacionesData || []);
      setFilteredAsignaciones(asignacionesData || []);

      // Calcular docentes sin asignar
      const docentesConAsignacion = asignacionesData?.map(a => a.docente_id) || [];
      const sinAsignar = docentesData?.filter(d => !docentesConAsignacion.includes(d.id)) || [];
      setDocentesSinAsignar(sinAsignar);

    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...asignaciones];

    if (filtros.docente) {
      resultado = resultado.filter(a => a.docente_id === filtros.docente);
    }

    if (filtros.especialista) {
      resultado = resultado.filter(a => a.especialista_id === filtros.especialista);
    }

    setFilteredAsignaciones(resultado);
  };

  const handleCrearAsignacion = async () => {
    try {
      if (!nuevaAsignacion.docente_id || !nuevaAsignacion.especialista_id) {
        alert('Por favor selecciona un docente y un especialista');
        return;
      }

      // Verificar si el docente ya tiene asignación activa
      const { data: existente } = await supabase
        .from('asignaciones')
        .select('id')
        .eq('docente_id', nuevaAsignacion.docente_id)
        .eq('estado', 'activa')
        .single();

      if (existente) {
        alert('Este docente ya tiene una asignación activa');
        return;
      }

      const { error } = await supabase
        .from('asignaciones')
        .insert([{
          docente_id: nuevaAsignacion.docente_id,
          especialista_id: nuevaAsignacion.especialista_id,
          notas: nuevaAsignacion.notas,
          estado: 'activa'
        }]);

      if (error) throw error;

      alert('Asignación creada exitosamente');
      setMostrarModal(false);
      setNuevaAsignacion({ docente_id: '', especialista_id: '', notas: '' });
      cargarDatos();
    } catch (error) {
      console.error('Error creando asignación:', error);
      alert('Error al crear la asignación');
    }
  };

  const handleEliminarAsignacion = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta asignación?')) return;

    try {
      const { error } = await supabase
        .from('asignaciones')
        .update({ estado: 'inactiva' })
        .eq('id', id);

      if (error) throw error;

      alert('Asignación eliminada exitosamente');
      cargarDatos();
    } catch (error) {
      console.error('Error eliminando asignación:', error);
      alert('Error al eliminar la asignación');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando asignaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Asignaciones</h2>
          <p className="text-gray-600 mt-1">Asignar docentes a especialistas para evaluación TEACH</p>
        </div>
        <button
          onClick={() => setMostrarModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Nueva Asignación
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Docentes Asignados</p>
          <p className="text-3xl font-bold text-green-600">{asignaciones.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Docentes Sin Asignar</p>
          <p className="text-3xl font-bold text-orange-600">{docentesSinAsignar.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Especialistas Activos</p>
          <p className="text-3xl font-bold text-blue-600">{especialistas.length}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por Docente
            </label>
            <select
              value={filtros.docente}
              onChange={(e) => setFiltros({ ...filtros, docente: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los docentes</option>
              {docentes.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.nombre_completo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por Especialista
            </label>
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
        </div>

        {(filtros.docente || filtros.especialista) && (
          <div className="mt-4">
            <button
              onClick={() => setFiltros({ docente: '', especialista: '' })}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Limpiar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla de Asignaciones */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Asignaciones Activas ({filteredAsignaciones.length})
          </h3>
        </div>

        {filteredAsignaciones.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl block mb-3">👥</span>
            <p className="text-gray-500">No hay asignaciones activas</p>
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
                    Docente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Centro Educativo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialista
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Asignación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAsignaciones.map((asignacion) => (
                  <tr key={asignacion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {asignacion.docentes?.codigo_docente}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {asignacion.docentes?.nombre_completo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {asignacion.docentes?.nombre_centro}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {asignacion.especialista?.nombre_completo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(asignacion.fecha_asignacion).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEliminarAsignacion(asignacion.id)}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nueva Asignación */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Nueva Asignación</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Docente
                </label>
                <select
                  value={nuevaAsignacion.docente_id}
                  onChange={(e) => setNuevaAsignacion({ ...nuevaAsignacion, docente_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar docente...</option>
                  {docentesSinAsignar.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.nombre_completo} - {doc.nombre_centro}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especialista
                </label>
                <select
                  value={nuevaAsignacion.especialista_id}
                  onChange={(e) => setNuevaAsignacion({ ...nuevaAsignacion, especialista_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar especialista...</option>
                  {especialistas.map(esp => (
                    <option key={esp.id} value={esp.id}>{esp.nombre_completo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (Opcional)
                </label>
                <textarea
                  value={nuevaAsignacion.notas}
                  onChange={(e) => setNuevaAsignacion({ ...nuevaAsignacion, notas: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setMostrarModal(false);
                  setNuevaAsignacion({ docente_id: '', especialista_id: '', notas: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearAsignacion}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear Asignación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}