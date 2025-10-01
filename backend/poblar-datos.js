// Script para poblar datos del Honda Pilot desde Excel a Supabase
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const SUPABASE_URL = 'https://lizgdoulwdqljloliyuw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpemdkb3Vsd2RxbGpsb2xpeXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMTk4ODUsImV4cCI6MjA3NDc5NTg4NX0.8GMaS0ebU1Wgb0aeRNkK_juKsfSe_acdgJilzgOGyCY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function poblarDatosHondaPilot() {
  try {
    console.log('Iniciando proceso...');
    
    // 1. Leer el archivo Excel
    const workbook = XLSX.readFile('../Control Combustible Pilot 2025.xlsx');
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Total de registros encontrados: ${data.length}`);

    // 2. Configuración
    const VEHICULO_ID = 1; // Honda Pilot
    const USUARIO_ID = 3;  // Admin
    const GASOLINERA_DEFAULT = 'OTRAS';

    // 3. Preparar los datos
    const registrosParaInsertar = data.map(row => ({
      vehiculo_id: VEHICULO_ID,
      usuario_id: USUARIO_ID,
    fecha: (() => {
  const excelDate = row.FECHA;
  if (typeof excelDate === 'number') {
    // Convertir número serial de Excel a fecha
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  } else if (excelDate instanceof Date) {
    return excelDate.toISOString().split('T')[0];
  } else if (typeof excelDate === 'string') {
    return new Date(excelDate).toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0]; // fallback
})(),
      kilometraje_inicial: Math.round(row['KILOMETRAJE INICIAL']),
      kilometraje_final: Math.round(row['KILOMETRAJE FINAL']),
      kilometros_recorridos: Math.round(row['KILOMETRO RECORRIDO']),
      costo_litro: parseFloat(row['COSTO LITRO'].toFixed(2)),
      pago_total: parseFloat(row['PAGO TOTAL'].toFixed(2)),
      litros: parseFloat(row['LITROS DE ACUERDO AL PAGO'].toFixed(2)),
      gasolinera: GASOLINERA_DEFAULT,
      km_por_litro: parseFloat(row['KILOMETROS POR LITRO'].toFixed(2)),
      costo_por_km: parseFloat(row['COSTO POR KILOMETRO'].toFixed(2)),
      km_por_galon: parseFloat(row['KILOMETRO POR GALON'].toFixed(2))
    }));

    console.log('Primer registro:');
    console.log(JSON.stringify(registrosParaInsertar[0], null, 2));

    // 4. Insertar en lotes
    const BATCH_SIZE = 50;
    let insertados = 0;

    for (let i = 0; i < registrosParaInsertar.length; i += BATCH_SIZE) {
      const batch = registrosParaInsertar.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('registros_combustible')
        .insert(batch);

      if (error) {
        console.error(`Error en lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      } else {
        insertados += batch.length;
        console.log(`Insertados ${insertados}/${registrosParaInsertar.length}`);
      }
    }

    console.log('\nProceso completado!');
    console.log(`Registros insertados: ${insertados}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

poblarDatosHondaPilot();