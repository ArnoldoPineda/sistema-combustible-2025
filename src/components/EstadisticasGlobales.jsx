import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

export default function EstadisticasGlobales() {
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    evaluacionesPorSemana: [],
    promediosPorDimension: [],
    topDocentes: [],
    bottomDocentes: [],
    tiempoPromedio: 0,
    totalEvaluaciones: 0,
    evaluacionesPorDepartamento: [],
    tituloAspectos: ''
  });

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);

      // Obtener TODAS las evaluaciones completadas
      const { data: evaluaciones, error } = await supabase
        .from('evaluaciones')
        .select(`
          id, created_at, updated_at, 
          puntaje_ambiente, puntaje_instruccion, puntaje_socioemocional, puntaje_global,
          docentes(nombre_completo, nombre_centro)
        `)
        .eq('estado_evaluacion', 'completada')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!evaluaciones || evaluaciones.length === 0) {
        setLoading(false);
        return;
      }

      console.log('📊 Evaluaciones cargadas:', evaluaciones.length);

      // 1. PROGRESO POR SEMANA
      const evaluacionesPorSemana = calcularEvaluacionesPorSemana(evaluaciones);

      // 2. PROMEDIO POR DIMENSIÓN
      const promediosPorDimension = calcularPromedioDimensiones(evaluaciones);

      // 3. TOP 3 Y BOTTOM 3
      const { top, bottom } = calcularTopBottom(evaluaciones);

      // 4. TIEMPO PROMEDIO ENTRE CREACIÓN Y COMPLETACIÓN
      const tiempoPromedio = calcularTiempoPromedio(evaluaciones);

      // 5. EVALUACIONES POR DEPARTAMENTO
      const evaluacionesPorDepartamento = calcularPorDepartamento(evaluaciones);

      setEstadisticas({
        evaluacionesPorSemana,
        promediosPorDimension,
        topDocentes: top,
        bottomDocentes: bottom,
        tiempoPromedio,
        totalEvaluaciones: evaluaciones.length,
        evaluacionesPorDepartamento,
        tituloAspectos: 'Resumen de Desempeño'
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularEvaluacionesPorSemana = (evaluaciones) => {
    const semanas = {};

    evaluaciones.forEach(ev => {
      const fecha = new Date(ev.created_at);
      const semana = obtenerSemana(fecha);

      if (!semanas[semana]) {
        semanas[semana] = 0;
      }
      semanas[semana]++;
    });

    // Retornar últimas 8 semanas
    return Object.entries(semanas)
      .sort()
      .slice(-8)
      .map(([semana, count]) => ({
        semana,
        evaluaciones: count
      }));
  };

  const obtenerSemana = (fecha) => {
    const inicio = new Date(fecha);
    inicio.setDate(inicio.getDate() - inicio.getDay());
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 6);

    return `${inicio.toLocaleDateString('es-ES', { month: 'short', day: '2-digit' })} - ${fin.toLocaleDateString('es-ES', { month: 'short', day: '2-digit' })}`;
  };

  const calcularPromedioDimension = (evaluaciones, dimension) => {
    const puntajes = evaluaciones
      .map(ev => {
        if (dimension === 'Ambiente') return ev.puntaje_ambiente;
        if (dimension === 'Instrucción') return ev.puntaje_instruccion;
        if (dimension === 'Socioemocional') return ev.puntaje_socioemocional;
        return 0;
      })
      .filter(p => p > 0);

    if (puntajes.length === 0) return 0;
    return (puntajes.reduce((a, b) => a + b, 0) / puntajes.length).toFixed(2);
  };

  const calcularPromedioDimensiones = (evaluaciones) => {
    return [
      {
        dimension: 'Ambiente',
        promedio: parseFloat(calcularPromedioDimension(evaluaciones, 'Ambiente')),
        color: '#3b82f6'
      },
      {
        dimension: 'Instrucción',
        promedio: parseFloat(calcularPromedioDimension(evaluaciones, 'Instrucción')),
        color: '#10b981'
      },
      {
        dimension: 'Socioemocional',
        promedio: parseFloat(calcularPromedioDimension(evaluaciones, 'Socioemocional')),
        color: '#a855f7'
      }
    ];
  };

  const calcularTopBottom = (evaluaciones) => {
    // Agrupar por docente y obtener última evaluación
    const docentes = {};

    evaluaciones.forEach(ev => {
      const nombreDocente = ev.docentes?.nombre_completo || 'Sin nombre';
      if (!docentes[nombreDocente] || new Date(ev.created_at) > new Date(docentes[nombreDocente].created_at)) {
        docentes[nombreDocente] = {
          nombre: nombreDocente,
          puntaje: ev.puntaje_global,
          centro: ev.docentes?.nombre_centro || 'Sin centro',
          created_at: ev.created_at
        };
      }
    });

    const docentes_array = Object.values(docentes)
      .sort((a, b) => b.puntaje - a.puntaje);

    return {
      top: docentes_array.slice(0, 3),
      bottom: docentes_array.slice(-3).reverse()
    };
  };

  const calcularTiempoPromedio = (evaluaciones) => {
    const tiempos = evaluaciones.map(ev => {
      const inicio = new Date(ev.created_at);
      const fin = new Date(ev.updated_at);
      const diferencia = (fin - inicio) / (1000 * 60); // minutos
      return diferencia;
    });

    if (tiempos.length === 0) return 0;
    const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
    return Math.round(promedio);
  };

  const calcularPorDepartamento = (evaluaciones) => {
    const departamentos = {};

    evaluaciones.forEach(ev => {
      // Extraer departamento del nombre del centro (formato: "CIUDAD")
      const centro = ev.docentes?.nombre_centro || 'Otros';
      if (!departamentos[centro]) {
        departamentos[centro] = 0;
      }
      departamentos[centro]++;
    });

    return Object.entries(departamentos)
      .map(([centro, count]) => ({
        centro,
        evaluaciones: count
      }))
      .sort((a, b) => b.evaluaciones - a.evaluaciones);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Título y Resumen General */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Estadísticas Globales</h2>
        
        {/* Cards de resumen */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium">Total Evaluaciones</p>
            <p className="text-3xl font-bold text-blue-700">{estadisticas.totalEvaluaciones}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-medium">Promedio Global</p>
            <p className="text-3xl font-bold text-green-700">
              {estadisticas.promediosPorDimension.length > 0
                ? (estadisticas.promediosPorDimension.reduce((a, b) => a + b.promedio, 0) / 3).toFixed(2)
                : '0.00'}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-600 font-medium">Tiempo Promedio</p>
            <p className="text-3xl font-bold text-purple-700">{estadisticas.tiempoPromedio} min</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-600 font-medium">Centros Educativos</p>
            <p className="text-3xl font-bold text-orange-700">{estadisticas.evaluacionesPorDepartamento.length}</p>
          </div>
        </div>
      </div>

      {/* Gráfico: Progreso por semana */}
      {estadisticas.evaluacionesPorSemana.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluaciones por Semana</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={estadisticas.evaluacionesPorSemana}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="semana" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="evaluaciones"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 5 }}
                name="Evaluaciones"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico: Promedio por Dimensión */}
      {estadisticas.promediosPorDimension.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Promedio de Puntajes por Dimensión</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={estadisticas.promediosPorDimension}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dimension" />
              <YAxis domain={[0, 3]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="promedio" fill="#10b981" name="Promedio" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top 3 y Bottom 3 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top 3 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 3 - Mejor Desempeño</h3>
          <div className="space-y-3">
            {estadisticas.topDocentes.map((docente, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{idx + 1}. {docente.nombre}</p>
                  <p className="text-sm text-gray-500">{docente.centro}</p>
                </div>
                <p className="text-2xl font-bold text-green-700">{docente.puntaje.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom 3 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bottom 3 - Menor Desempeño</h3>
          <div className="space-y-3">
            {estadisticas.bottomDocentes.map((docente, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{idx + 1}. {docente.nombre}</p>
                  <p className="text-sm text-gray-500">{docente.centro}</p>
                </div>
                <p className="text-2xl font-bold text-red-700">{docente.puntaje.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evaluaciones por Centro Educativo */}
      {estadisticas.evaluacionesPorDepartamento.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluaciones por Centro Educativo</h3>
          <div className="space-y-2">
            {estadisticas.evaluacionesPorDepartamento.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2">
                <p className="text-sm font-medium text-gray-700">{item.centro}</p>
                <div className="flex items-center gap-3">
                  <div className="w-48 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(item.evaluaciones / estadisticas.totalEvaluaciones) * 100}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-sm font-bold text-gray-900 w-12 text-right">{item.evaluaciones}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje si no hay datos */}
      {estadisticas.totalEvaluaciones === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg text-center">
          <p className="text-yellow-800">No hay evaluaciones completadas aún. Los datos aparecerán una vez que se completen evaluaciones.</p>
        </div>
      )}
    </div>
  );
}