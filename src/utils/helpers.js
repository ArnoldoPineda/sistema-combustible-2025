import { VALORES_TEACH } from './constants'

// Calcular puntaje de una dimensión
export const calcularPuntajeDimension = (respuestas, itemsDimension) => {
  let suma = 0
  let count = 0

  itemsDimension.forEach(item => {
    const valor = respuestas[item]
    if (valor && valor !== 'n/a') {
      suma += VALORES_TEACH[valor] || 0
      count++
    }
  })

  return count > 0 ? (suma / count).toFixed(2) : 0
}

// Calcular puntaje global
export const calcularPuntajeGlobal = (puntajeA, puntajeB, puntajeC) => {
  const suma = parseFloat(puntajeA) + parseFloat(puntajeB) + parseFloat(puntajeC)
  return (suma / 3).toFixed(2)
}

// Formatear fecha
export const formatearFecha = (fecha) => {
  if (!fecha) return '-'
  const date = new Date(fecha)
  return date.toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Obtener color según puntaje
export const getColorPuntaje = (puntaje) => {
  const num = parseFloat(puntaje)
  if (num >= 2.5) return 'text-green-600'
  if (num >= 2) return 'text-yellow-600'
  return 'text-red-600'
}

// Exportar a Excel (placeholder - implementar con XLSX)
export const exportarExcel = async (datos, nombreArchivo) => {
  // Implementar con la librería XLSX
  console.log('Exportando:', nombreArchivo, datos)
}