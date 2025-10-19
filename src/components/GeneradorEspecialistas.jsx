import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';

export default function GeneradorEspecialistas() {
  const [generando, setGenerando] = useState(false);
  const [especialistas, setEspecialistas] = useState([]);
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Generar contraseña aleatoria única
  const generarPassword = () => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return password;
  };

  const generarEspecialistas = async () => {
    try {
      setGenerando(true);
      setError('');
      setMensaje('');
      setProgreso(0);
      const nuevosEspecialistas = [];

      for (let i = 1; i <= 20; i++) {
        const numero = String(i).padStart(2, '0');
        const email = `especialista${numero}@teach.hn`;
        const password = generarPassword();
        const nombreCompleto = `Especialista ${numero}`;

        try {
          // 1. Crear usuario en Auth de Supabase
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
          });

          if (authError) throw authError;

          // 2. Crear perfil en tabla profiles
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                full_name: nombreCompleto,
                email: email,
                rol: 'especialista',
                activo: true
              }
            ]);

          if (profileError) throw profileError;

          nuevosEspecialistas.push({
            numero: numero,
            nombre: nombreCompleto,
            email: email,
            password: password,
            id_usuario: authData.user.id,
            estado: '✅ Creado'
          });

          setProgreso(Math.round((i / 20) * 100));
        } catch (err) {
          console.error(`Error creando especialista ${numero}:`, err);
          nuevosEspecialistas.push({
            numero: numero,
            nombre: nombreCompleto,
            email: email,
            password: 'ERROR',
            estado: `❌ ${err.message}`
          });
        }
      }

      setEspecialistas(nuevosEspecialistas);
      const exitosos = nuevosEspecialistas.filter(e => e.estado === '✅ Creado').length;
      setMensaje(`✅ Proceso completado: ${exitosos} de 20 especialistas creados exitosamente`);
    } catch (err) {
      setError(`❌ Error general: ${err.message}`);
    } finally {
      setGenerando(false);
      setProgreso(0);
    }
  };

  const descargarCSV = () => {
    if (especialistas.length === 0) return;

    const datosParaExportar = especialistas.map(e => ({
      'Número': e.numero,
      'Nombre Completo': e.nombre,
      'Email': e.email,
      'Contraseña': e.password,
      'Estado': e.estado
    }));

    const ws = XLSX.utils.json_to_sheet(datosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Especialistas');

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 8 },
      { wch: 20 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 }
    ];

    XLSX.writeFile(wb, `Especialistas_TEACH_${new Date().toLocaleDateString()}.xlsx`);
  };

  const copiarAlPortapapeles = () => {
    const texto = especialistas
      .map(e => `${e.email}\t${e.password}`)
      .join('\n');
    
    navigator.clipboard.writeText(texto);
    alert('Credenciales copiadas al portapapeles');
  };

  // ✅ NUEVA FUNCIÓN: Eliminar especialista con validación
  const eliminarEspecialista = async (especialistaEmail, especialistaId) => {
    try {
      console.log('🗑️ Intentando eliminar especialista:', especialistaEmail);

      // ✅ VALIDACIÓN CRÍTICA: Verificar si tiene docentes asignados
      const { data: docentesAsignados, error: docentesError } = await supabase
        .from('docentes')
        .select('id, nombre_completo, codigo_docente')
        .eq('especialista_id', especialistaId);

      if (docentesError) {
        console.error('Error verificando docentes:', docentesError);
        throw docentesError;
      }

      console.log('📊 Docentes encontrados:', docentesAsignados?.length || 0);

      // ✅ PROTECCIÓN: No permitir eliminar si tiene docentes
      if (docentesAsignados && docentesAsignados.length > 0) {
        const listaDocentes = docentesAsignados
          .slice(0, 5)
          .map(d => `• ${d.nombre_completo} (${d.codigo_docente})`)
          .join('\n');
        
        const masDocentes = docentesAsignados.length > 5 
          ? `\n... y ${docentesAsignados.length - 5} más`
          : '';

        alert(
          `❌ NO SE PUEDE ELIMINAR ESTE ESPECIALISTA\n\n` +
          `Tiene ${docentesAsignados.length} docente(s) asignado(s):\n\n` +
          listaDocentes + masDocentes +
          `\n\n⚠️ Primero debes reasignar o eliminar estos docentes.`
        );
        return;
      }

      // Confirmación final
      if (!confirm(
        `⚠️ ¿ESTÁS SEGURO?\n\n` +
        `Eliminarás el especialista:\n${especialistaEmail}\n\n` +
        `Esta acción NO se puede deshacer.`
      )) {
        console.log('❌ Eliminación cancelada por el usuario');
        return;
      }

      console.log('🔄 Eliminando especialista...');

      // Eliminar de auth (esto eliminará en cascada el perfil por la FK)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(especialistaId);

      if (deleteError) {
        console.error('Error eliminando usuario:', deleteError);
        throw deleteError;
      }

      console.log('✅ Especialista eliminado exitosamente');
      alert('✅ Especialista eliminado exitosamente');
      
      // Actualizar la lista local
      setEspecialistas(prev => prev.filter(e => e.email !== especialistaEmail));

    } catch (error) {
      console.error('❌ Error eliminando especialista:', error);
      alert(`❌ Error al eliminar especialista:\n${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Generador de Especialistas</h2>
        <p className="text-gray-600 mt-1">Crear 20 usuarios especialistas automáticamente</p>
      </div>

      {/* Card de instrucciones */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <p className="text-blue-900 text-sm">
          <strong>ℹ️ Información:</strong> Se crearán 20 especialistas con emails especialista01@teach.hn a especialista20@teach.hn, 
          cada uno con contraseña única y aleatoria. Descarga el Excel para guardar las credenciales.
        </p>
      </div>

      {/* Botón principal */}
      <div className="flex gap-3">
        <button
          onClick={generarEspecialistas}
          disabled={generando}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium transition-colors"
        >
          {generando ? '⏳ Generando...' : '🚀 Generar 20 Especialistas'}
        </button>
        
        {especialistas.length > 0 && (
          <>
            <button
              onClick={descargarCSV}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              📥 Descargar Excel
            </button>
            <button
              onClick={copiarAlPortapapeles}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
            >
              📋 Copiar Credenciales
            </button>
          </>
        )}
      </div>

      {/* Barra de progreso */}
      {generando && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progreso}%` }}
          ></div>
        </div>
      )}

      {/* Mensajes */}
      {mensaje && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Tabla de resultados */}
      {especialistas.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Resultados ({especialistas.length} especialistas)
            </h3>
          </div>

          <div className="overflow-x-auto">
            {/* ✅ TABLA MODIFICADA CON COLUMNA DE ACCIONES */}
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contraseña</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {especialistas.map((esp, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{esp.numero}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{esp.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-mono">{esp.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono bg-gray-50 rounded">
                      {esp.password.length > 20 ? esp.password.substring(0, 20) + '...' : esp.password}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        esp.estado.includes('✅')
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {esp.estado}
                      </span>
                    </td>
                    {/* ✅ NUEVA COLUMNA DE ACCIONES */}
                    <td className="px-6 py-4 text-sm">
                      {esp.estado.includes('✅') && esp.id_usuario && (
                        <button
                          onClick={() => eliminarEspecialista(esp.email, esp.id_usuario)}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors font-medium"
                          title="Eliminar especialista (solo si no tiene docentes asignados)"
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Info importante */}
          <div className="p-6 bg-yellow-50 border-t border-gray-200">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Importante:</strong> 
              <br />• Descarga el Excel para guardar las contraseñas en un lugar seguro
              <br />• Las contraseñas no se pueden recuperar de aquí, solo desde el Excel descargado
              <br />• Comparte las credenciales con cada especialista de forma segura
              <br />• Solo puedes eliminar especialistas que NO tengan docentes asignados
            </p>
          </div>
        </div>
      )}
    </div>
  );
}