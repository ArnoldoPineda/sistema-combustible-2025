import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function GraficosEvaluacion({ evaluacion, tipo = 'radar' }) {
  
  // Datos para gráfico de radar (9 subdimensiones)
  const dataRadar = [
    { subdimension: 'A1: Trato', puntaje: evaluacion.puntaje_a1 || 0, fullMark: 3 },
    { subdimension: 'A2: Comportamiento', puntaje: evaluacion.puntaje_a2 || 0, fullMark: 3 },
    { subdimension: 'B3: Facilitación', puntaje: evaluacion.puntaje_b3 || 0, fullMark: 3 },
    { subdimension: 'B4: Avance', puntaje: evaluacion.puntaje_b4 || 0, fullMark: 3 },
    { subdimension: 'B5: Retroalimentación', puntaje: evaluacion.puntaje_b5 || 0, fullMark: 3 },
    { subdimension: 'B6: Pensamiento', puntaje: evaluacion.puntaje_b6 || 0, fullMark: 3 },
    { subdimension: 'C7: Autonomía', puntaje: evaluacion.puntaje_c7 || 0, fullMark: 3 },
    { subdimension: 'C8: Perseverancia', puntaje: evaluacion.puntaje_c8 || 0, fullMark: 3 },
    { subdimension: 'C9: Habilidades', puntaje: evaluacion.puntaje_c9 || 0, fullMark: 3 },
  ];

  // Datos para gráfico de barras (3 dimensiones principales)
  const dataBarras = [
    { dimension: 'Ambiente', puntaje: evaluacion.puntaje_ambiente || 0, color: '#3b82f6' },
    { dimension: 'Instrucción', puntaje: evaluacion.puntaje_instruccion || 0, color: '#10b981' },
    { dimension: 'Socioemocional', puntaje: evaluacion.puntaje_socioemocional || 0, color: '#8b5cf6' },
  ];

  // Datos comparativos (promedio ideal vs obtenido)
  const dataComparativo = [
    { categoria: 'Ambiente', obtenido: evaluacion.puntaje_ambiente || 0, ideal: 2.5 },
    { categoria: 'Instrucción', obtenido: evaluacion.puntaje_instruccion || 0, ideal: 2.5 },
    { categoria: 'Socioemocional', obtenido: evaluacion.puntaje_socioemocional || 0, ideal: 2.5 },
  ];

  // Gráfico de Radar
  if (tipo === 'radar') {
    return (
      <div className="w-full h-[400px]">
        <h3 className="text-center text-lg font-semibold mb-4 text-gray-700">
          Gráfico de Radar - 9 Subdimensiones
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={dataRadar}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subdimension" style={{ fontSize: '12px' }} />
            <PolarRadiusAxis angle={90} domain={[0, 3]} />
            <Radar name="Puntaje" dataKey="puntaje" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Gráfico de Barras
  if (tipo === 'barras') {
    return (
      <div className="w-full h-[400px]">
        <h3 className="text-center text-lg font-semibold mb-4 text-gray-700">
          Gráfico de Barras - 3 Dimensiones Principales
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataBarras}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dimension" />
            <YAxis domain={[0, 3]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="puntaje" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Gráfico Comparativo
  if (tipo === 'comparativo') {
    return (
      <div className="w-full h-[400px]">
        <h3 className="text-center text-lg font-semibold mb-4 text-gray-700">
          Comparativo: Obtenido vs Ideal (2.5)
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataComparativo}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="categoria" />
            <YAxis domain={[0, 3]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="obtenido" fill="#10b981" name="Obtenido" />
            <Bar dataKey="ideal" fill="#f59e0b" name="Ideal" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}