// Departamentos de Honduras
export const DEPARTAMENTOS_HONDURAS = [
  'Atlántida',
  'Choluteca',
  'Colón',
  'Comayagua',
  'Copán',
  'Cortés',
  'El Paraíso',
  'Francisco Morazán',
  'Gracias a Dios',
  'Intibucá',
  'Islas de la Bahía',
  'La Paz',
  'Lempira',
  'Ocotepeque',
  'Olancho',
  'Santa Bárbara',
  'Valle',
  'Yoro'
]

// Opciones de respuesta TEACH
export const OPCIONES_TEACH = {
  BAJO: 'bajo',
  MEDIO: 'medio',
  ALTO: 'alto',
  NA: 'n/a'
}

// Valores numéricos para cálculos
export const VALORES_TEACH = {
  bajo: 1,
  medio: 2,
  alto: 3,
  'n/a': 0
}

// Estructura del instrumento TEACH
export const ESTRUCTURA_TEACH = {
  dimensionA: {
    nombre: 'Ambiente del Aula',
    subdimensiones: {
      A1: {
        nombre: 'Trato respetuoso y sensibilidad',
        items: ['a1_1', 'a1_2', 'a1_3', 'a1_4', 'a1_5', 'a1_6']
      },
      A2: {
        nombre: 'Manejo positivo del comportamiento',
        items: ['a2_1', 'a2_2', 'a2_3']
      }
    }
  },
  dimensionB: {
    nombre: 'Instrucción',
    subdimensiones: {
      B3: {
        nombre: 'Facilitación del aprendizaje',
        items: ['b3_1', 'b3_2', 'b3_3', 'b3_4']
      },
      B4: {
        nombre: 'Avance del aprendizaje',
        items: ['b4_1', 'b4_2', 'b4_3']
      },
      B5: {
        nombre: 'Retroalimentación',
        items: ['b5_1', 'b5_2']
      },
      B6: {
        nombre: 'Pensamiento crítico',
        items: ['b6_1', 'b6_2', 'b6_3']
      }
    }
  },
  dimensionC: {
    nombre: 'Habilidades Socioemocionales',
    subdimensiones: {
      C7: {
        nombre: 'Autonomía',
        items: ['c7_1', 'c7_2', 'c7_3']
      },
      C8: {
        nombre: 'Perseverancia',
        items: ['c8_1', 'c8_2', 'c8_3']
      },
      C9: {
        nombre: 'Habilidades sociales',
        items: ['c9_1', 'c9_2', 'c9_3']
      }
    }
  }
}

// Roles del sistema
export const ROLES = {
  ADMIN: 'administrador',
  ESPECIALISTA: 'especialista'
}