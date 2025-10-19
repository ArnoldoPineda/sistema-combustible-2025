import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';

export default function ImportadorDocentes() {
  const [importing, setImporting] = useState(false);
  const [log, setLog] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [reporteFinal, setReporteFinal] = useState(null);

  const addLog = (message, type = 'info') => {
    setLog((prev) => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview([]);
      setLog([]);
      setReporteFinal(null);
      addLog(`Archivo: ${selectedFile.name}`, 'success');
    }
  };

  const getValue = (row, possibleKeys) => {
    const rowKeys = Object.keys(row);
    for (const searchKey of possibleKeys) {
      if (row[searchKey] !== undefined && row[searchKey] !== null && row[searchKey] !== '') {
        return String(row[searchKey]).trim();
      }
      const found = rowKeys.find(k => k.trim().toUpperCase() === searchKey.trim().toUpperCase());
      if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') {
        return String(row[found]).trim();
      }
    }
    return null;
  };

  const handlePreview = async () => {
    if (!file) {
      addLog('Selecciona un archivo', 'error');
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { header: true });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const headers = Object.keys(data[0] || {});
      addLog(`Headers: ${headers.join(' | ')}`, 'info');
      setPreview(data.slice(0, 5));
      addLog(`Total: ${data.length} filas`, 'info');
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    }
  };

  const handleImport = async () => {
    if (!file) {
      addLog('Selecciona archivo', 'error');
      return;
    }

    setImporting(true);
    setLog([]);
    setReporteFinal(null);
    addLog('=== INICIANDO IMPORTACIÓN ===', 'info');

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { header: true });
      const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      addLog(`Total de filas: ${rawData.length}`, 'info');

      // PASO 1: Extraer centros únicos (código + depto + municipio)
      const centrosMap = new Map();
      for (const row of rawData) {
        const codigoCentro = getValue(row, ['CODIGO CENTRO', ' CODIGO CENTRO']) || '';
        const nombreCentro = getValue(row, ['CENTRO EDUCATIVO', ' CENTRO EDUCATIVO']) || '';
        const depto = getValue(row, ['DEPARTAMENTO', ' DEPARTAMENTO']) || 'Honduras';
        const muni = getValue(row, ['MUNICIPIO', ' MUNICIPIO']) || 'Sin especificar';

        const key = `${codigoCentro}|${depto}|${muni}`;
        
        if (!centrosMap.has(key) && codigoCentro) {
          centrosMap.set(key, {
            codigo_centro: codigoCentro,
            nombre_centro: nombreCentro || codigoCentro,
            departamento: depto,
            municipio: muni,
          });
        }
      }

      addLog(`Centros únicos a procesar: ${centrosMap.size}`, 'info');

      // PASO 2: Insertar centros uno por uno (ignorar si ya existen)
      const centrosArray = Array.from(centrosMap.values());
      let centrosInsertados = 0;
      const centrosCreados = [];

      for (const centro of centrosArray) {
        // Verificar si ya existe
        const { data: existe } = await supabase
          .from('centros_educativos')
          .select('id')
          .eq('codigo_centro', centro.codigo_centro)
          .eq('departamento', centro.departamento)
          .eq('municipio', centro.municipio)
          .single();

        if (existe) {
          centrosCreados.push({
            id: existe.id,
            codigo_centro: centro.codigo_centro,
            departamento: centro.departamento,
            municipio: centro.municipio,
          });
          continue;
        }

        // Si no existe, insertar
        const { data, error } = await supabase
          .from('centros_educativos')
          .insert([centro])
          .select();

        if (error) {
          addLog(`❌ Centro ${centro.codigo_centro}: ${error.message}`, 'error');
        } else if (data && data[0]) {
          centrosInsertados++;
          centrosCreados.push({
            id: data[0].id,
            codigo_centro: centro.codigo_centro,
            departamento: centro.departamento,
            municipio: centro.municipio,
          });
        }
      }

      addLog(`✓ ${centrosInsertados} centros creados`, 'success');

      // PASO 3: Crear lookup de centros
      const centroLookup = new Map();
      centrosCreados.forEach((c) => {
        const key = `${c.codigo_centro}|${c.departamento}|${c.municipio}`;
        centroLookup.set(key, c.id);
      });

      // PASO 4: Procesar docentes
      const docentes = [];
      const erroresDocentes = [];
      let rowNum = 2;

      for (const row of rawData) {
        const codigoCentro = getValue(row, ['CODIGO CENTRO', ' CODIGO CENTRO']) || '';
        const codigoDocente = getValue(row, ['CODIGO DOCENTE', ' CODIGO DOCENTE']);
        const nombreDocente = getValue(row, ['NOMBRE DOCENTE', ' NOMBRE DOCENTE']);
        const depto = getValue(row, ['DEPARTAMENTO', ' DEPARTAMENTO']) || 'Honduras';
        const muni = getValue(row, ['MUNICIPIO', ' MUNICIPIO']) || 'Sin especificar';
        const cedula = getValue(row, ['CEDULA IDENTIDAD', ' CEDULA IDENTIDAD']);
        const email = getValue(row, ['CORREO', ' CORREO']);
        const tel = getValue(row, ['TELEFONO', ' TELEFONO']);

        // Validar datos críticos
        if (!codigoDocente) {
          erroresDocentes.push({
            fila: rowNum,
            codigoDocente: 'N/A',
            nombreDocente: nombreDocente || 'N/A',
            razon: 'Falta código de docente'
          });
          rowNum++;
          continue;
        }

        if (!nombreDocente) {
          erroresDocentes.push({
            fila: rowNum,
            codigoDocente: codigoDocente,
            nombreDocente: 'N/A',
            razon: 'Falta nombre de docente'
          });
          rowNum++;
          continue;
        }

        if (!codigoCentro) {
          erroresDocentes.push({
            fila: rowNum,
            codigoDocente: codigoDocente,
            nombreDocente: nombreDocente,
            razon: 'Falta código de centro'
          });
          rowNum++;
          continue;
        }

        // Buscar centro
        const key = `${codigoCentro}|${depto}|${muni}`;
        const centroId = centroLookup.get(key);

        if (!centroId) {
          erroresDocentes.push({
            fila: rowNum,
            codigoDocente: codigoDocente,
            nombreDocente: nombreDocente,
            razon: `Centro no encontrado (${codigoCentro} en ${depto}, ${muni})`
          });
          rowNum++;
          continue;
        }

        // Docente válido
        docentes.push({
          codigo_centro: codigoCentro,
          codigo_docente: codigoDocente,
          nombre_completo: nombreDocente,
          cedula_identidad: cedula && cedula !== '#N/D' ? cedula : null,
          email: email && email !== '#N/D' ? email : null,
          celular: tel && tel !== '#N/D' ? tel : null,
          departamento: depto && depto !== '#N/D' ? depto : null,
          municipio: muni && muni !== '#N/D' ? muni : null,
          nombre_centro: nombreDocente,
          centro_id: centroId,
          especialista_id: null,
          estado: 'activo',
          notas: null,
        });

        rowNum++;
      }

      addLog(`Docentes válidos: ${docentes.length}`, 'info');
      if (erroresDocentes.length > 0) {
        addLog(`⚠️ Docentes con error: ${erroresDocentes.length}`, 'warning');
      }

      // PASO 5: Insertar docentes en lotes
      let docentesInsertados = 0;
      const erroresInsercion = [];

      if (docentes.length > 0) {
        for (let i = 0; i < docentes.length; i += 100) {
          const lote = docentes.slice(i, i + 100);
          const loteNum = Math.floor(i / 100) + 1;

          const { error } = await supabase.from('docentes').insert(lote);

          if (error) {
            addLog(`❌ Lote ${loteNum}: ${error.message}`, 'error');
            erroresInsercion.push({
              lote: loteNum,
              error: error.message,
              cantidad: lote.length
            });
          } else {
            docentesInsertados += lote.length;
            addLog(`✓ Lote ${loteNum}: ${lote.length} docentes`, 'success');
          }
        }
      }

      // PASO 6: Reporte final
      const reporte = {
        centrosProcesados: centrosCreados.length,
        docentesInsertados: docentesInsertados,
        docentesConError: erroresDocentes.length,
        erroresInsercion: erroresInsercion.length,
        detalles: {
          erroresDocentes: erroresDocentes.slice(0, 50),
          erroresInsercion: erroresInsercion
        }
      };

      setReporteFinal(reporte);

      addLog(`\n=== REPORTE FINAL ===`, 'info');
      addLog(`Centros procesados: ${reporte.centrosProcesados}`, 'success');
      addLog(`Docentes insertados: ${reporte.docentesInsertados}`, 'success');
      addLog(`Docentes con error: ${reporte.docentesConError}`, reporte.docentesConError > 0 ? 'warning' : 'info');
      addLog(`=== IMPORTACIÓN COMPLETADA ===`, 'success');

      setFile(null);

    } catch (error) {
      addLog(`ERROR CRÍTICO: ${error.message}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">📤 Importador Docentes</h2>
        <p className="text-sm text-gray-600 mb-4">Carga centros y docentes desde Excel</p>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={importing}
              className="block w-full text-sm"
            />
            {file && <p className="text-sm text-green-600 mt-2">✓ {file.name}</p>}
          </div>

          <button
            onClick={handlePreview}
            disabled={!file || importing}
            className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium disabled:bg-gray-400"
          >
            👀 Preview
          </button>

          <button
            onClick={handleImport}
            disabled={!file || importing}
            className={`w-full py-3 text-white rounded font-medium ${
              importing ? 'bg-gray-400' : file ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
            }`}
          >
            {importing ? '⏳ Importando...' : '📥 Importar'}
          </button>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Preview</h3>
          <div className="overflow-x-auto text-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {Object.keys(preview[0]).map((k) => (
                    <th key={k} className="border px-2 py-1 text-left text-xs">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="border px-2 py-1 text-xs">
                        {String(v).substring(0, 25)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Log</h3>
          <div className="bg-gray-900 rounded p-3 text-xs font-mono text-white max-h-96 overflow-y-auto">
            {log.map((e, i) => (
              <div key={i} className="mb-1">
                <span className="text-gray-400">[{e.time}]</span>
                <span
                  className={
                    e.type === 'error'
                      ? 'text-red-400'
                      : e.type === 'success'
                        ? 'text-green-400'
                        : e.type === 'warning'
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                  }
                >
                  {' '}{e.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {reporteFinal && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Reporte Final</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded">
                <p className="text-sm text-gray-600">Centros Procesados</p>
                <p className="text-2xl font-bold text-green-600">{reporteFinal.centrosProcesados}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-sm text-gray-600">Docentes Insertados</p>
                <p className="text-2xl font-bold text-blue-600">{reporteFinal.docentesInsertados}</p>
              </div>
              <div className={`${reporteFinal.docentesConError > 0 ? 'bg-yellow-50' : 'bg-gray-50'} p-4 rounded`}>
                <p className="text-sm text-gray-600">Docentes con Error</p>
                <p className={`text-2xl font-bold ${reporteFinal.docentesConError > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {reporteFinal.docentesConError}
                </p>
              </div>
              <div className={`${reporteFinal.erroresInsercion > 0 ? 'bg-red-50' : 'bg-gray-50'} p-4 rounded`}>
                <p className="text-sm text-gray-600">Errores de Inserción</p>
                <p className={`text-2xl font-bold ${reporteFinal.erroresInsercion > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {reporteFinal.erroresInsercion}
                </p>
              </div>
            </div>

            {reporteFinal.detalles.erroresDocentes.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm mb-2">Docentes con Error:</h4>
                <div className="bg-red-50 rounded p-3 max-h-40 overflow-y-auto text-xs">
                  {reporteFinal.detalles.erroresDocentes.map((err, i) => (
                    <div key={i} className="mb-2 pb-2 border-b border-red-200">
                      <p><strong>Fila {err.fila}:</strong> {err.codigoDocente}</p>
                      <p className="text-red-600">{err.razon}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}