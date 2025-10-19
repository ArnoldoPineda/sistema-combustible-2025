import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import * as XLSX from 'xlsx';

export default function DashboardAdminEstadisticas() {
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    totalEvaluaciones: 0,
    evaluacionesCompletadas: 0,
    evaluacionesBorrador: 0,
    promedioGlobal: 0,
    especialistas: [],
    departamentos: [],
    evaluacionesPorEspecialista: [],
    todasLasEvaluaciones: [],
    topEspecialistas: [],
    bottomEspecialistas: []
  });

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);

      // 1. Obtener TODAS las evaluaciones con especialista y docente
      const { data: evaluaciones, error } = await supabase
        .from('evaluaciones')
        .select(`
          id, created_at, updated_at, estado_evaluacion,
          puntaje_ambiente, puntaje_instruccion, puntaje_socioemocional, puntaje_global,
          docentes(nombre_completo, nombre_centro, departamento),
          evaluador_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('📊 Total de evaluaciones cargadas:', evaluaciones?.length || 0);

      if (!evaluaciones || evaluaciones.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Obtener datos de especialistas
      const { data: especialistas } = await supabase
        .from('profiles')
        .select('id, full_name, rol');

      const especialistasMap = {};
      especialistas?.forEach(esp => {
        especialistasMap[esp.id] = esp.full_name || 'Sin nombre';
      });

      // 3. Procesar datos
      const completadas = evaluaciones.filter(e => e.estado_evaluacion === 'completada');
      const borradores = evaluaciones.filter(e => e.estado_evaluacion === 'borrador');
      
      const promedioGlobal = completadas.length > 0
        ? (completadas.reduce((sum, e) => sum + (e.puntaje_global || 0), 0) / completadas.length).toFixed(2)
        : 0;

      // 4. Evaluaciones por especialista
      const porEspecialista = {};
      completadas.forEach(ev => {
        const espId = ev.evaluador_id;
        if (!porEspecialista[espId]) {
          porEspecialista[espId] = { nombre: especialistasMap[espId] || 'Desconocido', count: 0, promedio: 0, suma: 0 };
        }
        porEspecialista[espId].count++;
        porEspecialista[espId].suma += ev.puntaje_global || 0;
      });

      const evaluacionesPorEspecialista = Object.entries(porEspecialista).map(([id, data]) => ({
        especialista: data.nombre,
        evaluaciones: data.count,
        promedio: (data.suma / data.count).toFixed(2)
      }));

      // 5. Top y Bottom especialistas
      const conPromedios = Object.entries(porEspecialista).map(([id, data]) => ({
        especialista: data.nombre,
        evaluaciones: data.count,
        promedio: parseFloat((data.suma / data.count).toFixed(2))
      })).sort((a, b) => b.promedio - a.promedio);

      // 6. Evaluaciones por departamento
      const porDepartamento = {};
      completadas.forEach(ev => {
        const dept = ev.docentes?.departamento || 'Otros';
        if (!porDepartamento[dept]) {
          porDepartamento[dept] = 0;
        }
        porDepartamento[dept]++;
      });

      const departamentos = Object.entries(porDepartamento)
        .map(([dept, count]) => ({ departamento: dept, evaluaciones: count }))
        .sort((a, b) => b.evaluaciones - a.evaluaciones);

      // 7. Preparar datos para tabla
      const todasLasEvaluaciones = evaluaciones.map(ev => ({
        fecha: new Date(ev.created_at).toLocaleDateString('es-HN'),
        docente: ev.docentes?.nombre_completo || 'Sin nombre',
        centro: ev.docentes?.nombre_centro || 'Sin centro',
        departamento: ev.docentes?.departamento || 'Otros',
        ambiente: ev.puntaje_ambiente?.toFixed(2) || '0.00',
        instruccion: ev.puntaje_instruccion?.toFixed(2) || '0.00',
        socioemocional: ev.puntaje_socioemocional?.toFixed(2) || '0.00',
        global: ev.puntaje_global?.toFixed(2) || '0.00',
        estado: ev.estado_evaluacion
      }));

      setEstadisticas({
        totalEvaluaciones: evaluaciones.length,
        evaluacionesCompletadas: completadas.length,
        evaluacionesBorrador: borradores.length,
        promedioGlobal,
        especialistas: evaluacionesPorEspecialista,
        departamentos,
        evaluacionesPorEspecialista,
        todasLasEvaluaciones,
        topEspecialistas: conPromedios.slice(0, 3),
        bottomEspecialistas: conPromedios.slice(-3).reverse()
      });

    } catch (error) {
      console.error('Error cargando estadísticas admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportarAExcel = () => {
    try {
      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(estadisticas.todasLasEvaluaciones);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Evaluaciones');

      // Ajustar anchos de columna
      const colWidths = [
        { wch: 12 },  // fecha
        { wch: 25 },  // docente
        { wch: 25 },  // centro
        { wch: 15 },  // departamento
        { wch: 10 },  // ambiente
        { wch: 12 },  // instruccion
        { wch: 15 },  // socioemocional
        { wch: 10 },  // global
        { wch: 12 }   // estado
      ];
      ws['!cols'] = colWidths;

      // Descargar
      XLSX.writeFile(wb, `Evaluaciones_TEACH_${new Date().toLocaleDateString()}.xlsx`);
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      alert('Error al exportar a Excel');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Cargando estadísticas globales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panel de Administrador - Estadísticas Globales</h2>
          <p className="text-gray-600 mt-1">Monitoreo de todas las evaluaciones TEACH del sistema</p>
        </div>
        <button
          onClick={exportarAExcel}
          disabled={estadisticas.todasLasEvaluaciones.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
        >
          📥 Exportar a Excel
        </button>
      </div>

      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600 font-medium">Total Evaluaciones</p>
          <p className="text-3xl font-bold text-blue-700">{estadisticas.totalEvaluaciones}</p>
          <p className="text-xs text-blue-500 mt-1">de 300 meta</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 font-medium">Completadas</p>
          <p className="text-3xl font-bold text-green-700">{estadisticas.evaluacionesCompletadas}</p>
          <p className="text-xs text-green-500 mt-1">
            {estadisticas.totalEvaluaciones > 0
              ? Math.round((estadisticas.evaluacionesCompletadas / estadisticas.totalEvaluaciones) * 100)
              : 0}%
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-600 font-medium">Borradores</p>
          <p className="text-3xl font-bold text-yellow-700">{estadisticas.evaluacionesBorrador}</p>
          <p className="text-xs text-yellow-500 mt-1">sin completar</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-600 font-medium">Promedio Global</p>
          <p className="text-3xl font-bold text-purple-700">{estadisticas.promedioGlobal}</p>
          <p className="text-xs text-purple-500 mt-1">de 3.0</p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <p className="text-sm text-orange-600 font-medium">Departamentos</p>
          <p className="text-3xl font-bold text-orange-700">{estadisticas.departamentos.length}</p>
          <p className="text-xs text-orange-500 mt-1">activos</p>
        </div>
      </div>

      {/* Gráficos */}
      {estadisticas.evaluacionesPorEspecialista.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluaciones por Especialista</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={estadisticas.evaluacionesPorEspecialista}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="especialista" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="evaluaciones" fill="#3b82f6" name="Evaluaciones" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {estadisticas.departamentos.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluaciones por Departamento</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={estadisticas.departamentos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="departamento" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="evaluaciones" fill="#10b981" name="Evaluaciones" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top y Bottom Especialistas */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 3 - Especialistas con Mayor Promedio</h3>
          <div className="space-y-3">
            {estadisticas.topEspecialistas.length > 0 ? (
              estadisticas.topEspecialistas.map((esp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{idx + 1}. {esp.especialista}</p>
                    <p className="text-sm text-gray-500">{esp.evaluaciones} evaluaciones</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{esp.promedio}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Sin datos</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bottom 3 - Especialistas con Menor Promedio</h3>
          <div className="space-y-3">
            {estadisticas.bottomEspecialistas.length > 0 ? (
              estadisticas.bottomEspecialistas.map((esp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{idx + 1}. {esp.especialista}</p>
                    <p className="text-sm text-gray-500">{esp.evaluaciones} evaluaciones</p>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{esp.promedio}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Todas las Evaluaciones */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Tabla Consolidada de Evaluaciones ({estadisticas.todasLasEvaluaciones.length})
        </h3>
        
        {estadisticas.todasLasEvaluaciones.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No hay evaluaciones en el sistema</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Docente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centro</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ambiente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instrucción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Socioemocional</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Global</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {estadisticas.todasLasEvaluaciones.map((ev, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{ev.fecha}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{ev.docente}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{ev.centro}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{ev.departamento}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">{ev.ambiente}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">{ev.instruccion}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-purple-600">{ev.socioemocional}</td>
                    <td className="px-4 py-3 text-sm font-bold text-orange-600">{ev.global}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        ev.estado === 'completada'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ev.estado === 'completada' ? 'Completada' : 'Borrador'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}