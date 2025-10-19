import { useState, useEffect, useCallback, useRef, memo } from 'react'; 
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

// ➕ IMPORTS NUEVOS (Guía 1)
import toast from 'react-hot-toast';
import ModalConfirmacion from '../../components/common/ModalConfirmacion.jsx';

// MEJORA 1: Componente ItemEvaluacion optimizado con React.memo
const ItemEvaluacion = memo(({ codigo, texto, escala = 'scale', valor, onChange }) => {
  // Prevenir que el click cause scroll
  const handleChange = useCallback((e) => {
    e.preventDefault();
    onChange(codigo, e.target.value);
  }, [codigo, onChange]);

  return (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
      <p className="text-sm font-medium text-gray-900 mb-2">{texto}</p>
      <div className="flex gap-3">
        {escala === 'scale2' && (
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name={codigo}
              value="N/A"
              checked={valor === 'N/A'}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm">N/A</span>
          </label>
        )}
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name={codigo}
            value="B"
            checked={valor === 'B'}
            onChange={handleChange}
            className="mr-2"
          />
          <span className="text-sm font-medium text-red-600">Bajo</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name={codigo}
            value="M"
            checked={valor === 'M'}
            onChange={handleChange}
            className="mr-2"
          />
          <span className="text-sm font-medium text-yellow-600">Medio</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name={codigo}
            value="A"
            checked={valor === 'A'}
            onChange={handleChange}
            className="mr-2"
          />
          <span className="text-sm font-medium text-green-600">Alto</span>
        </label>
      </div>
    </div>
  );
});

ItemEvaluacion.displayName = 'ItemEvaluacion';

export default function FormularioEvaluacionTEACH({ docente, onClose, onSuccess, evaluacionExistente = null }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('contexto');
  const [loading, setLoading] = useState(false);
  const [esEdicion, setEsEdicion] = useState(false);

  // ➕ ESTADO PARA MODAL DE CONFIRMACIÓN (Guía 3 - Paso A)
  const [modalConfirm, setModalConfirm] = useState({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false
  });
  
  // MEJORA 2: Ref para mantener posición del scroll
  const contentRef = useRef(null);
  const scrollPositionRef = useRef(0);
  
  // MEJORA 4B: Auto-guardado de borradores
  const [autoGuardadoStatus, setAutoGuardadoStatus] = useState('guardado'); // 'guardando' | 'guardado' | 'cambios'
  const [hayChangios, setHayChangios] = useState(false);
  const autoGuardadoIntervalRef = useRef(null);
  const ultimaGuardadaRef = useRef(new Date());
  
  // Información contextual
  const [infoContextual, setInfoContextual] = useState({
    hora_inicio: '',
    hora_fin: '',
    nivel_grado: '',
    materia: '',
    formato_clase: 'presencial',
    lengua_instruccion: 'español',
    observaciones: ''
  });

  // Respuestas TEACH - 36 ítems
  const [respuestas, setRespuestas] = useState({
    // DIMENSIÓN A: AMBIENTE DEL AULA (9 ítems)
    a1_1: '', a1_2: '', a1_3: '', a1_4a: '', a1_4b: '', a1_6: '',
    a2_1: '', a2_2: '', a2_3: '',
    
    // DIMENSIÓN B: INSTRUCCIÓN (12 ítems)
    b3_1: '', b3_2: '', b3_3: '', b3_4: '',
    b4_1: '', b4_2: '', b4_3: '',
    b5_1: '', b5_2: '',
    b6_1: '', b6_2: '', b6_3: '',
    
    // DIMENSIÓN C: SOCIOEMOCIONAL (9 ítems)
    c7_1: '', c7_2: '', c7_3: '',
    c8_1: '', c8_2: '', c8_3: '',
    c9_1: '', c9_2: '', c9_3: '',
    
    // Observaciones de Enfoque (3)
    enfoque_1: '',
    enfoque_2: '',
    enfoque_3: ''
  });

  // Puntajes calculados
  const [puntajes, setPuntajes] = useState({
    a1: 0, a2: 0, b3: 0, b4: 0, b5: 0, b6: 0, c7: 0, c8: 0, c9: 0,
    ambiente: 0, instruccion: 0, socioemocional: 0, global: 0
  });

  // MEJORA 3: Función de conversión optimizada
  const convertirValor = useCallback((valor) => {
    if (valor === 'A') return 3;
    if (valor === 'M') return 2;
    if (valor === 'B') return 1;
    return 0;
  }, []);

  // NUEVO: Cargar datos del borrador si existe
  useEffect(() => {
    if (evaluacionExistente) {
      console.log('📝 Cargando borrador existente:', evaluacionExistente);
      setEsEdicion(true);
      
      // Cargar información contextual
      setInfoContextual({
        hora_inicio: evaluacionExistente.hora_inicio || '',
        hora_fin: evaluacionExistente.hora_fin || '',
        nivel_grado: evaluacionExistente.nivel_grado || '',
        materia: evaluacionExistente.materia || '',
        formato_clase: evaluacionExistente.formato_clase || 'presencial',
        lengua_instruccion: evaluacionExistente.lengua_instruccion || 'español',
        observaciones: evaluacionExistente.observaciones || ''
      });

      // Cargar respuestas - IMPORTANTE: verificar si es objeto o string JSON
      if (evaluacionExistente.respuestas) {
        let respuestasCargadas;
        
        // Si respuestas es un string JSON, parsearlo
        if (typeof evaluacionExistente.respuestas === 'string') {
          try {
            respuestasCargadas = JSON.parse(evaluacionExistente.respuestas);
          } catch (e) {
            console.error('Error parseando respuestas:', e);
            respuestasCargadas = {};
          }
        } else {
          // Si ya es un objeto, usarlo directamente
          respuestasCargadas = evaluacionExistente.respuestas;
        }
        
        console.log('✅ Respuestas cargadas:', respuestasCargadas);
        console.log('📊 Items completados:', Object.values(respuestasCargadas).filter(r => r !== '').length);
        
        setRespuestas(respuestasCargadas);
      }
    }
  }, [evaluacionExistente]);

  // MEJORA 4: Calcular puntajes optimizado con debounce
  useEffect(() => {
    // Guardar posición actual del scroll ANTES de calcular
    if (contentRef.current) {
      scrollPositionRef.current = contentRef.current.scrollTop;
    }

    const calcularPuntajes = () => {
      // A1: Trato Respetuoso (6 ítems)
      const a1 = ['a1_1', 'a1_2', 'a1_3', 'a1_4a', 'a1_4b', 'a1_6']
        .filter(k => respuestas[k] && respuestas[k] !== 'N/A')
        .map(k => convertirValor(respuestas[k]));
      const puntaje_a1 = a1.length > 0 ? (a1.reduce((a, b) => a + b, 0) / a1.length).toFixed(2) : 0;

      // A2: Manejo Comportamiento (3 ítems)
      const a2 = ['a2_1', 'a2_2', 'a2_3']
        .filter(k => respuestas[k])
        .map(k => convertirValor(respuestas[k]));
      const puntaje_a2 = a2.length > 0 ? (a2.reduce((a, b) => a + b, 0) / a2.length).toFixed(2) : 0;

      // B3: Facilitación (4 ítems)
      const b3 = ['b3_1', 'b3_2', 'b3_3', 'b3_4']
        .filter(k => respuestas[k])
        .map(k => convertirValor(respuestas[k]));
      const puntaje_b3 = b3.length > 0 ? (b3.reduce((a, b) => a + b, 0) / b3.length).toFixed(2) : 0;

      // B4: Avance (3 ítems)
      const b4 = ['b4_1', 'b4_2', 'b4_3']
        .filter(k => respuestas[k])
        .map(k => convertirValor(respuestas[k]));
      const puntaje_b4 = b4.length > 0 ? (b4.reduce((a, b) => a + b, 0) / b4.length).toFixed(2) : 0;

      // B5: Retroalimentación (2 ítems)
      const b5 = ['b5_1', 'b5_2']
        .filter(k => respuestas[k])
        .map(k => convertirValor(respuestas[k]));
      const puntaje_b5 = b5.length > 0 ? (b5.reduce((a, b) => a + b, 0) / b5.length).toFixed(2) : 0;

      // B6: Pensamiento Crítico (3 ítems)
      const b6 = ['b6_1', 'b6_2', 'b6_3']
        .filter(k => respuestas[k])
        .map(k => convertirValor(respuestas[k]));
      const puntaje_b6 = b6.length > 0 ? (b6.reduce((a, b) => a + b, 0) / b6.length).toFixed(2) : 0;

      // C7: Autonomía (3 ítems)
      const c7 = ['c7_1', 'c7_2', 'c7_3']
        .filter(k => respuestas[k])
        .map(k => convertirValor(respuestas[k]));
      const puntaje_c7 = c7.length > 0 ? (c7.reduce((a, b) => a + b, 0) / c7.length).toFixed(2) : 0;

      // C8: Perseverancia (3 ítems)
      const c8 = ['c8_1', 'c8_2', 'c8_3']
        .filter(k => respuestas[k])
        .map(k => convertirValor(respuestas[k]));
      const puntaje_c8 = c8.length > 0 ? (c8.reduce((a, b) => a + b, 0) / c8.length).toFixed(2) : 0;

      // C9: Habilidades Sociales (3 ítems)
      const c9 = ['c9_1', 'c9_2', 'c9_3']
        .filter(k => respuestas[k])
        .map(k => convertirValor(respuestas[k]));
      const puntaje_c9 = c9.length > 0 ? (c9.reduce((a, b) => a + b, 0) / c9.length).toFixed(2) : 0;

      // Dimensiones
      const subdimensionesAmbiente = [parseFloat(puntaje_a1), parseFloat(puntaje_a2)].filter(p => p > 0);
      const puntaje_ambiente = subdimensionesAmbiente.length > 0 
        ? (subdimensionesAmbiente.reduce((a, b) => a + b, 0) / subdimensionesAmbiente.length).toFixed(2) 
        : 0;

      const subdimensionesInstruccion = [parseFloat(puntaje_b3), parseFloat(puntaje_b4), parseFloat(puntaje_b5), parseFloat(puntaje_b6)].filter(p => p > 0);
      const puntaje_instruccion = subdimensionesInstruccion.length > 0 
        ? (subdimensionesInstruccion.reduce((a, b) => a + b, 0) / subdimensionesInstruccion.length).toFixed(2) 
        : 0;

      const subdimensionesSocio = [parseFloat(puntaje_c7), parseFloat(puntaje_c8), parseFloat(puntaje_c9)].filter(p => p > 0);
      const puntaje_socioemocional = subdimensionesSocio.length > 0 
        ? (subdimensionesSocio.reduce((a, b) => a + b, 0) / subdimensionesSocio.length).toFixed(2) 
        : 0;

      // Global
      const dimensiones = [parseFloat(puntaje_ambiente), parseFloat(puntaje_instruccion), parseFloat(puntaje_socioemocional)].filter(p => p > 0);
      const puntaje_global = dimensiones.length > 0 
        ? (dimensiones.reduce((a, b) => a + b, 0) / dimensiones.length).toFixed(2) 
        : 0;

      setPuntajes({
        a1: puntaje_a1, a2: puntaje_a2, b3: puntaje_b3, b4: puntaje_b4,
        b5: puntaje_b5, b6: puntaje_b6, c7: puntaje_c7, c8: puntaje_c8, c9: puntaje_c9,
        ambiente: puntaje_ambiente,
        instruccion: puntaje_instruccion,
        socioemocional: puntaje_socioemocional,
        global: puntaje_global
      });
    };

    calcularPuntajes();

    // MEJORA 5: Restaurar posición del scroll DESPUÉS de calcular
    requestAnimationFrame(() => {
      if (contentRef.current && scrollPositionRef.current > 0) {
        contentRef.current.scrollTop = scrollPositionRef.current;
      }
    });
  }, [respuestas, convertirValor]);

  // MEJORA 6: Handler optimizado con useCallback
  const handleRespuestaChange = useCallback((codigo, valor) => {
    setRespuestas(prev => ({ ...prev, [codigo]: valor }));
    // Marcar que hay cambios sin guardar
    setHayChangios(true);
    setAutoGuardadoStatus('cambios');
  }, []);

  // MEJORA 4B: Función para auto-guardar sin mostrar alerta
  const handleAutoGuardar = async () => {
    if (!hayChangios || !esEdicion || !evaluacionExistente) return;

    try {
      setAutoGuardadoStatus('guardando');

      const evaluacion = {
        docente_id: docente.id,
        evaluador_id: user.id,
        ...infoContextual,
        respuestas: respuestas,
        puntaje_ambiente: parseFloat(puntajes.ambiente),
        puntaje_instruccion: parseFloat(puntajes.instruccion),
        puntaje_socioemocional: parseFloat(puntajes.socioemocional),
        puntaje_global: parseFloat(puntajes.global),
        puntaje_a1: parseFloat(puntajes.a1),
        puntaje_a2: parseFloat(puntajes.a2),
        puntaje_b3: parseFloat(puntajes.b3),
        puntaje_b4: parseFloat(puntajes.b4),
        puntaje_b5: parseFloat(puntajes.b5),
        puntaje_b6: parseFloat(puntajes.b6),
        puntaje_c7: parseFloat(puntajes.c7),
        puntaje_c8: parseFloat(puntajes.c8),
        puntaje_c9: parseFloat(puntajes.c9),
        estado_evaluacion: 'borrador'
      };

      const result = await supabase
        .from('evaluaciones')
        .update(evaluacion)
        .eq('id', evaluacionExistente.id);

      if (result.error) throw result.error;

      console.log('💾 Auto-guardado completado');
      setAutoGuardadoStatus('guardado');
      setHayChangios(false);
      ultimaGuardadaRef.current = new Date();
    } catch (error) {
      console.error('Error en auto-guardado:', error);
      setAutoGuardadoStatus('cambios');
    }
  };

  // MEJORA 4B: Configurar intervalo de auto-guardado
  useEffect(() => {
    if (!esEdicion) return;

    // Configurar intervalo de 60 segundos
    autoGuardadoIntervalRef.current = setInterval(() => {
      handleAutoGuardar();
    }, 60000); // 60 segundos

    // Limpiar intervalo al desmontar
    return () => {
      if (autoGuardadoIntervalRef.current) {
        clearInterval(autoGuardadoIntervalRef.current);
      }
    };
  }, [esEdicion, hayChangios, respuestas, infoContextual, puntajes]);

  // MEJORA 4B: Guardar automáticamente al cerrar si hay cambios
  const handleCerrarSeguro = async () => {
    if (hayChangios && esEdicion && evaluacionExistente) {
      await handleAutoGuardar();
    }
    onClose?.();
  };

  // ⚙️ Guardar con TOASTS (Guía 2 y 5) — Reemplaza alerts
  const handleGuardar = async (estado = 'borrador') => {
    try {
      setLoading(true);

      // Validar que al menos algunas respuestas estén completas
      const respuestasCompletas = Object.values(respuestas).filter(r => r !== '').length;
      if (respuestasCompletas < 10) {
        toast.error('Por favor completa al menos 10 ítems antes de guardar');
        setLoading(false);
        return;
      }

      const evaluacion = {
        docente_id: docente.id,
        evaluador_id: user.id,
        ...infoContextual,
        respuestas: respuestas,
        puntaje_ambiente: parseFloat(puntajes.ambiente),
        puntaje_instruccion: parseFloat(puntajes.instruccion),
        puntaje_socioemocional: parseFloat(puntajes.socioemocional),
        puntaje_global: parseFloat(puntajes.global),
        puntaje_a1: parseFloat(puntajes.a1),
        puntaje_a2: parseFloat(puntajes.a2),
        puntaje_b3: parseFloat(puntajes.b3),
        puntaje_b4: parseFloat(puntajes.b4),
        puntaje_b5: parseFloat(puntajes.b5),
        puntaje_b6: parseFloat(puntajes.b6),
        puntaje_c7: parseFloat(puntajes.c7),
        puntaje_c8: parseFloat(puntajes.c8),
        puntaje_c9: parseFloat(puntajes.c9),
        estado_evaluacion: estado
      };

      // Loading actualizable
      const toastId = toast.loading('Guardando evaluación...');

      let error;
      if (esEdicion && evaluacionExistente) {
        const result = await supabase
          .from('evaluaciones')
          .update(evaluacion)
          .eq('id', evaluacionExistente.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('evaluaciones')
          .insert([evaluacion]);
        error = result.error;
      }

      if (error) {
        toast.error('Error al guardar la evaluación', { id: toastId });
        throw error;
      }

      toast.success(`Evaluación ${esEdicion ? 'actualizada' : 'guardada'} como ${estado}`, { id: toastId });
      setHayChangios(false);
      setAutoGuardadoStatus('guardado');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('Error guardando evaluación:', error);
      // Ya mostramos toast de error arriba si viene de Supabase; por si acaso:
      toast.error('Error al guardar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Confirmación para "Completar Evaluación" (Guía 3 - Paso B)
  const handleCompletarClick = () => {
    setModalConfirm({
      isOpen: true,
      type: 'success',
      title: 'Confirmar evaluación',
      message: '¿Deseas marcar esta evaluación como COMPLETADA? Luego no podrás editarla.',
      onConfirm: async () => {
        try {
          setModalConfirm(prev => ({ ...prev, isLoading: true }));
          await handleGuardar('completada');
        } finally {
          setModalConfirm(prev => ({ ...prev, isLoading: false, isOpen: false }));
        }
      },
      isLoading: false
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {esEdicion ? '✏️ Editar Evaluación TEACH (Borrador)' : 'Evaluación TEACH'}
              </h2>
              <p className="text-gray-600 mt-1">
                Docente: <span className="font-medium">{docente.nombre_completo}</span>
              </p>
              <p className="text-sm text-gray-500">Centro: {docente.nombre_centro}</p>
              
              {/* NUEVO: Indicador de auto-guardado */}
              {esEdicion && (
                <div className="mt-2 flex items-center gap-2">
                  {autoGuardadoStatus === 'guardando' && (
                    <span className="text-sm text-blue-600 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                      💾 Guardando...
                    </span>
                  )}
                  {autoGuardadoStatus === 'guardado' && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      ✅ Guardado automáticamente
                    </span>
                  )}
                  {autoGuardadoStatus === 'cambios' && (
                    <span className="text-sm text-orange-600 flex items-center gap-1">
                      ⚠️ Cambios sin guardar
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleCerrarSeguro}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Puntajes en tiempo real */}
          <div className="mt-4 grid grid-cols-4 gap-3">
            <div className="bg-blue-50 p-3 rounded text-center">
              <p className="text-xs text-blue-600 font-medium">AMBIENTE</p>
              <p className="text-2xl font-bold text-blue-700">{puntajes.ambiente}</p>
            </div>
            <div className="bg-green-50 p-3 rounded text-center">
              <p className="text-xs text-green-600 font-medium">INSTRUCCIÓN</p>
              <p className="text-2xl font-bold text-green-700">{puntajes.instruccion}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded text-center">
              <p className="text-xs text-purple-600 font-medium">SOCIOEMOCIONAL</p>
              <p className="text-2xl font-bold text-purple-700">{puntajes.socioemocional}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded text-center">
              <p className="text-xs text-orange-600 font-medium">GLOBAL</p>
              <p className="text-2xl font-bold text-orange-700">{puntajes.global}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('contexto')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'contexto'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Contexto
            </button>
            <button
              onClick={() => setActiveTab('ambiente')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'ambiente'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              A. Ambiente ( {Object.values(respuestas).slice(0, 9).filter(r => r !== '').length} )
            </button>
            <button
              onClick={() => setActiveTab('instruccion')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'instruccion'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              B. Instrucción ( {Object.values(respuestas).slice(9, 21).filter(r => r !== '').length} )
            </button>
            <button
              onClick={() => setActiveTab('socioemocional')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'socioemocional'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              C. Socioemocional ( {Object.values(respuestas).slice(21, 30).filter(r => r !== '').length} )
            </button>
            <button
              onClick={() => setActiveTab('enfoque')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'enfoque'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Enfoque
            </button>
          </div>
        </div>

        {/* Content - MEJORA 7: Ref agregado al contenedor de scroll */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          {/* TAB: CONTEXTO */}
          {activeTab === 'contexto' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Contextual</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    value={infoContextual.hora_inicio}
                    onChange={(e) => {
                      setInfoContextual({...infoContextual, hora_inicio: e.target.value});
                      setHayChangios(true);
                      setAutoGuardadoStatus('cambios');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                  <input
                    type="time"
                    value={infoContextual.hora_fin}
                    onChange={(e) => {
                      setInfoContextual({...infoContextual, hora_fin: e.target.value});
                      setHayChangios(true);
                      setAutoGuardadoStatus('cambios');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nivel/Grado</label>
                  <input
                    type="text"
                    placeholder="Ej: Prebásica II"
                    value={infoContextual.nivel_grado}
                    onChange={(e) => {
                      setInfoContextual({...infoContextual, nivel_grado: e.target.value});
                      setHayChangios(true);
                      setAutoGuardadoStatus('cambios');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Materia</label>
                  <input
                    type="text"
                    placeholder="Ej: Matemáticas"
                    value={infoContextual.materia}
                    onChange={(e) => {
                      setInfoContextual({...infoContextual, materia: e.target.value});
                      setHayChangios(true);
                      setAutoGuardadoStatus('cambios');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formato de Clase</label>
                  <select
                    value={infoContextual.formato_clase}
                    onChange={(e) => {
                      setInfoContextual({...infoContextual, formato_clase: e.target.value});
                      setHayChangios(true);
                      setAutoGuardadoStatus('cambios');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="virtual">Virtual</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lengua de Instrucción</label>
                  <input
                    type="text"
                    placeholder="Ej: Español"
                    value={infoContextual.lengua_instruccion}
                    onChange={(e) => {
                      setInfoContextual({...infoContextual, lengua_instruccion: e.target.value});
                      setHayChangios(true);
                      setAutoGuardadoStatus('cambios');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones Generales</label>
                <textarea
                  rows="4"
                  value={infoContextual.observaciones}
                  onChange={(e) => {
                    setInfoContextual({...infoContextual, observaciones: e.target.value});
                    setHayChangios(true);
                    setAutoGuardadoStatus('cambios');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Notas adicionales sobre la evaluación..."
                />
              </div>
            </div>
          )}

          {/* TAB: DIMENSIÓN A - AMBIENTE */}
          {activeTab === 'ambiente' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">DIMENSIÓN A: AMBIENTE DEL AULA</h3>
              
              {/* A1: Trato Respetuoso */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-blue-700 mb-3 bg-blue-50 p-2 rounded">
                  A1. Trato Respetuoso y Sensibilidad (Puntaje: {puntajes.a1})
                </h4>
                <ItemEvaluacion 
                  codigo="a1_1" 
                  texto="A1.1 - El docente trata respetuosamente a todos los niños/as"
                  valor={respuestas.a1_1}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="a1_2" 
                  texto="A1.2 - El docente utiliza lenguaje positivo con los niños/as"
                  valor={respuestas.a1_2}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="a1_3" 
                  texto="A1.3 - El docente responde a las necesidades de los niños/as"
                  escala="scale2"
                  valor={respuestas.a1_3}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="a1_4a" 
                  texto="A1.4a - El docente no exhibe sesgos de género"
                  valor={respuestas.a1_4a}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="a1_4b" 
                  texto="A1.4b - El docente no exhibe sesgos de discapacidad"
                  valor={respuestas.a1_4b}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="a1_6" 
                  texto="A1.6 - El docente no exhibe sesgos y desafía estereotipos en la sala de clases"
                  valor={respuestas.a1_6}
                  onChange={handleRespuestaChange}
                />
              </div>

              {/* A2: Manejo del Comportamiento */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-blue-700 mb-3 bg-blue-50 p-2 rounded">
                  A2. Manejo Positivo del Comportamiento (Puntaje: {puntajes.a2})
                </h4>
                <ItemEvaluacion 
                  codigo="a2_1" 
                  texto="A2.1 - El docente establece expectativas claras de comportamiento"
                  valor={respuestas.a2_1}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="a2_2" 
                  texto="A2.2 - El docente reconoce el buen comportamiento de los niños/as"
                  valor={respuestas.a2_2}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="a2_3" 
                  texto="A2.3 - El docente redirige el mal comportamiento y se enfoca en la conducta esperada"
                  valor={respuestas.a2_3}
                  onChange={handleRespuestaChange}
                />
              </div>
            </div>
          )}

          {/* TAB: DIMENSIÓN B - INSTRUCCIÓN */}
          {activeTab === 'instruccion' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">DIMENSIÓN B: INSTRUCCIÓN</h3>
              
              {/* B3: Facilitación */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-green-700 mb-3 bg-green-50 p-2 rounded">
                  B3. Facilitación del Aprendizaje (Puntaje: {puntajes.b3})
                </h4>
                <ItemEvaluacion 
                  codigo="b3_1" 
                  texto="B3.1 - El docente articula explícitamente los objetivos de la actividad"
                  valor={respuestas.b3_1}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="b3_2" 
                  texto="B3.2 - El docente explica conceptos usando múltiples formas de representación"
                  valor={respuestas.b3_2}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="b3_3" 
                  texto="B3.3 - El docente realiza conexiones con otros conocimientos o vidas cotidianas"
                  valor={respuestas.b3_3}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="b3_4" 
                  texto="B3.4 - El docente utiliza lenguaje apropiado para el nivel de desarrollo"
                  valor={respuestas.b3_4}
                  onChange={handleRespuestaChange}
                />
              </div>

              {/* B4: Avance */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-green-700 mb-3 bg-green-50 p-2 rounded">
                  B4. Avance del Aprendizaje (Puntaje: {puntajes.b4})
                </h4>
                <ItemEvaluacion 
                  codigo="b4_1" 
                  texto="B4.1 - El docente usa estrategias para determinar el nivel de entendimiento"
                  valor={respuestas.b4_1}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="b4_2" 
                  texto="B4.2 - El docente monitorea a la mayoría de los niños/as durante actividades"
                  valor={respuestas.b4_2}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="b4_3" 
                  texto="B4.3 - El docente ajusta su enseñanza al nivel de los niños/as"
                  valor={respuestas.b4_3}
                  onChange={handleRespuestaChange}
                />
              </div>

              {/* B5: Retroalimentación */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-green-700 mb-3 bg-green-50 p-2 rounded">
                  B5. Retroalimentación (Puntaje: {puntajes.b5})
                </h4>
                <ItemEvaluacion 
                  codigo="b5_1" 
                  texto="B5.1 - El docente hace comentarios específicos para clarificar confusiones"
                  valor={respuestas.b5_1}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="b5_2" 
                  texto="B5.2 - El docente hace comentarios específicos que ayudan a identificar logros"
                  valor={respuestas.b5_2}
                  onChange={handleRespuestaChange}
                />
              </div>

              {/* B6: Pensamiento Crítico */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-green-700 mb-3 bg-green-50 p-2 rounded">
                  B6. Pensamiento Crítico (Puntaje: {puntajes.b6})
                </h4>
                <ItemEvaluacion 
                  codigo="b6_1" 
                  texto="B6.1 - El docente hace preguntas abiertas"
                  valor={respuestas.b6_1}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="b6_2" 
                  texto="B6.2 - El docente ofrece actividades de pensamiento"
                  valor={respuestas.b6_2}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="b6_3" 
                  texto="B6.3 - Los niños/as hacen preguntas abiertas o desarrollan actividades de pensamiento"
                  valor={respuestas.b6_3}
                  onChange={handleRespuestaChange}
                />
              </div>
            </div>
          )}

          {/* TAB: DIMENSIÓN C - SOCIOEMOCIONAL */}
          {activeTab === 'socioemocional' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">DIMENSIÓN C: HABILIDADES SOCIOEMOCIONALES</h3>
              
              {/* C7: Autonomía */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-purple-700 mb-3 bg-purple-50 p-2 rounded">
                  C7. Autonomía (Puntaje: {puntajes.c7})
                </h4>
                <ItemEvaluacion 
                  codigo="c7_1" 
                  texto="C7.1 - El docente ofrece opciones a los niños/as"
                  valor={respuestas.c7_1}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="c7_2" 
                  texto="C7.2 - El docente ofrece oportunidades para que asuman roles dentro de la clase"
                  valor={respuestas.c7_2}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="c7_3" 
                  texto="C7.3 - Los niños/as se ofrecen para participar en la sala de clases"
                  valor={respuestas.c7_3}
                  onChange={handleRespuestaChange}
                />
              </div>

              {/* C8: Perseverancia */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-purple-700 mb-3 bg-purple-50 p-2 rounded">
                  C8. Perseverancia (Puntaje: {puntajes.c8})
                </h4>
                <ItemEvaluacion 
                  codigo="c8_1" 
                  texto="C8.1 - El docente reconoce los esfuerzos de los niños/as"
                  valor={respuestas.c8_1}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="c8_2" 
                  texto="C8.2 - El docente responde positivamente a los desafíos de los niños/as"
                  valor={respuestas.c8_2}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="c8_3" 
                  texto="C8.3 - El docente incentiva la planificación en el aula"
                  valor={respuestas.c8_3}
                  onChange={handleRespuestaChange}
                />
              </div>

              {/* C9: Habilidades Sociales */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-purple-700 mb-3 bg-purple-50 p-2 rounded">
                  C9. Habilidades Sociales (Puntaje: {puntajes.c9})
                </h4>
                <ItemEvaluacion 
                  codigo="c9_1" 
                  texto="C9.1 - El docente promueve la colaboración entre los niños/as"
                  valor={respuestas.c9_1}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="c9_2" 
                  texto="C9.2 - El docente promueve habilidades intra o interpersonales"
                  valor={respuestas.c9_2}
                  onChange={handleRespuestaChange}
                />
                <ItemEvaluacion 
                  codigo="c9_3" 
                  texto="C9.3 - Los niños/as colaboran entre sí a través de interacciones entre pares"
                  valor={respuestas.c9_3}
                  onChange={handleRespuestaChange}
                />
              </div>
            </div>
          )}

          {/* TAB: ENFOQUE */}
          {activeTab === 'enfoque' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">OBSERVACIONES DE ENFOQUE ESTUDIANTIL</h3>
              <p className="text-sm text-gray-600 mb-6">
                Evalúe en tres momentos diferentes de la clase cuántos estudiantes NO están enfocados en la actividad de aprendizaje.
              </p>

              <div className="mb-4 p-4 bg-orange-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Observación 1 - Los niños/as están enfocados en la actividad (Inicio)
                </p>
                <div className="flex gap-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="enfoque_1"
                      value="B"
                      checked={respuestas.enfoque_1 === 'B'}
                      onChange={(e) => handleRespuestaChange('enfoque_1', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-red-600">Bajo (6+ no enfocados)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="enfoque_1"
                      value="M"
                      checked={respuestas.enfoque_1 === 'M'}
                      onChange={(e) => handleRespuestaChange('enfoque_1', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-yellow-600">Medio (2-5 no enfocados)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="enfoque_1"
                      value="A"
                      checked={respuestas.enfoque_1 === 'A'}
                      onChange={(e) => handleRespuestaChange('enfoque_1', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-green-600">Alto (0-1 no enfocados)</span>
                  </label>
                </div>
              </div>

              <div className="mb-4 p-4 bg-orange-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Observación 2 - Los niños/as están enfocados en la actividad (Desarrollo)
                </p>
                <div className="flex gap-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="enfoque_2"
                      value="B"
                      checked={respuestas.enfoque_2 === 'B'}
                      onChange={(e) => handleRespuestaChange('enfoque_2', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-red-600">Bajo (6+ no enfocados)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="enfoque_2"
                      value="M"
                      checked={respuestas.enfoque_2 === 'M'}
                      onChange={(e) => handleRespuestaChange('enfoque_2', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-yellow-600">Medio (2-5 no enfocados)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="enfoque_2"
                      value="A"
                      checked={respuestas.enfoque_2 === 'A'}
                      onChange={(e) => handleRespuestaChange('enfoque_2', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-green-600">Alto (0-1 no enfocados)</span>
                  </label>
                </div>
              </div>

              <div className="mb-4 p-4 bg-orange-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Observación 3 - Los niños/as están enfocados en la actividad (Cierre)
                </p>
                <div className="flex gap-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="enfoque_3"
                      value="B"
                      checked={respuestas.enfoque_3 === 'B'}
                      onChange={(e) => handleRespuestaChange('enfoque_3', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-red-600">Bajo (6+ no enfocados)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="enfoque_3"
                      value="M"
                      checked={respuestas.enfoque_3 === 'M'}
                      onChange={(e) => handleRespuestaChange('enfoque_3', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-yellow-600">Medio (2-5 no enfocados)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="enfoque_3"
                      value="A"
                      checked={respuestas.enfoque_3 === 'A'}
                      onChange={(e) => handleRespuestaChange('enfoque_3', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-green-600">Alto (0-1 no enfocados)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Ítems completados: {Object.values(respuestas).filter(r => r !== '').length} / 36
              {esEdicion && <span className="ml-2 text-yellow-600 font-semibold">• Editando borrador</span>}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCerrarSeguro}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleGuardar('borrador')}
                disabled={loading}
                className="px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
              >
                {esEdicion ? 'Actualizar Borrador' : 'Guardar Borrador'}
              </button>
              <button
                onClick={handleCompletarClick} 
                disabled={loading}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                {esEdicion ? 'Completar Evaluación' : 'Guardar Completada'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ➕ MODAL DE CONFIRMACIÓN (Guía 3 - Paso C) */}
      <ModalConfirmacion
        isOpen={modalConfirm.isOpen}
        onClose={() => setModalConfirm(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfirm.onConfirm}
        title={modalConfirm.title}
        message={modalConfirm.message}
        type={modalConfirm.type}
        isLoading={modalConfirm.isLoading}
      />
    </div>
  );
}
