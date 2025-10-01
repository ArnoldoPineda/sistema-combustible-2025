require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const supabase = require('./supabase');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ==================== RUTAS DE AUTENTICACIÓN ====================

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password son requeridos' });
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error || !usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordValido = true; // TEMPORAL - deja entrar a cualquiera
    
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const { password: _, ...usuarioSinPassword } = usuario;
    
    res.json({
      success: true,
      usuario: usuarioSinPassword
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.get('/api/usuarios', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, username, nombre, created_at');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

// ==================== RUTAS DE VEHÍCULOS ====================

app.get('/api/vehiculos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehiculos')
      .select('*')
      .order('nombre');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error obteniendo vehículos:', error);
    res.status(500).json({ error: 'Error obteniendo vehículos' });
  }
});

app.get('/api/vehiculos/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error obteniendo vehículo:', error);
    res.status(500).json({ error: 'Error obteniendo vehículo' });
  }
});

// ==================== RUTAS DE REGISTROS DE COMBUSTIBLE ====================

app.post('/api/registros', async (req, res) => {
  try {
    const { vehiculo_id, usuario_id, fecha, kilometraje_inicial, kilometraje_final, 
            costo_litro, pago_total, gasolinera } = req.body;

    if (!vehiculo_id || !usuario_id || !fecha || !kilometraje_inicial || 
        !kilometraje_final || !costo_litro || !pago_total || !gasolinera) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (kilometraje_final <= kilometraje_inicial) {
      return res.status(400).json({ error: 'El kilometraje final debe ser mayor al inicial' });
    }

    if (costo_litro <= 0 || pago_total <= 0) {
      return res.status(400).json({ error: 'Los valores monetarios deben ser mayores a 0' });
    }

    // Cálculos automáticos
    const kilometros_recorridos = kilometraje_final - kilometraje_inicial;
    const litros = pago_total / costo_litro;
    const km_por_litro = kilometros_recorridos / litros;
    const costo_por_km = pago_total / kilometros_recorridos;
    const km_por_galon = km_por_litro * 3.78541;

    const { data, error } = await supabase
      .from('registros_combustible')
      .insert([{
        vehiculo_id,
        usuario_id,
        fecha,
        kilometraje_inicial,
        kilometraje_final,
        kilometros_recorridos,
        costo_litro,
        pago_total,
        litros,
        gasolinera,
        km_por_litro,
        costo_por_km,
        km_por_galon
      }])
      .select();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      id: data[0].id,
      message: 'Registro creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando registro:', error);
    res.status(500).json({ error: 'Error creando registro' });
  }
});

app.get('/api/registros', async (req, res) => {
  try {
    const { vehiculo_id, limit } = req.query;
    
    let query = supabase
      .from('registros_combustible')
      .select(`
        *,
        vehiculos(nombre),
        usuarios(nombre)
      `)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (vehiculo_id) {
      query = query.eq('vehiculo_id', vehiculo_id);
    }
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Formatear respuesta
    const registros = data.map(r => ({
      ...r,
      vehiculo_nombre: r.vehiculos.nombre,
      usuario_nombre: r.usuarios.nombre
    }));
    
    res.json(registros);
  } catch (error) {
    console.error('Error obteniendo registros:', error);
    res.status(500).json({ error: 'Error obteniendo registros' });
  }
});

// Ruta para actualizar un registro (PUT)
app.put('/api/registros/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, kilometraje_inicial, kilometraje_final, costo_litro, pago_total, gasolinera } = req.body;

    // Validar que los datos existan
    if (!fecha || !kilometraje_inicial || !kilometraje_final || !costo_litro || !pago_total || !gasolinera) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Calcular valores automáticos
    const kilometros_recorridos = parseInt(kilometraje_final) - parseInt(kilometraje_inicial);
    const litros = parseFloat(pago_total) / parseFloat(costo_litro);
    const km_por_litro = kilometros_recorridos / litros;
    const costo_por_km = parseFloat(pago_total) / kilometros_recorridos;
    const km_por_galon = km_por_litro * 3.78541;

    const { data, error } = await supabase
      .from('registros_combustible')
      .update({
        fecha,
        kilometraje_inicial: parseInt(kilometraje_inicial),
        kilometraje_final: parseInt(kilometraje_final),
        kilometros_recorridos,
        costo_litro: parseFloat(costo_litro),
        pago_total: parseFloat(pago_total),
        litros,
        gasolinera,
        km_por_litro,
        costo_por_km,
        km_por_galon
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error de Supabase:', error);
      throw error;
    }

    res.json({ message: 'Registro actualizado exitosamente', data });
  } catch (error) {
    console.error('Error actualizando registro:', error);
    res.status(500).json({ error: 'Error al actualizar el registro: ' + error.message });
  }
});

// Ruta para eliminar un registro (DELETE)
app.delete('/api/registros/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('registros_combustible')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error de Supabase:', error);
      throw error;
    }

    res.json({ message: 'Registro eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando registro:', error);
    res.status(500).json({ error: 'Error al eliminar el registro: ' + error.message });
  }
});

app.get('/api/vehiculos/:id/ultimo-kilometraje', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registros_combustible')
      .select('kilometraje_final')
      .eq('vehiculo_id', req.params.id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    res.json({ kilometraje_final: data?.kilometraje_final || null });
  } catch (error) {
    console.error('Error obteniendo último kilometraje:', error);
    res.status(500).json({ error: 'Error obteniendo último kilometraje' });
  }
});

// ==================== RUTAS DE ESTADÍSTICAS ====================

app.get('/api/estadisticas/vehiculo/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registros_combustible')
      .select('*')
      .eq('vehiculo_id', req.params.id);
    
    if (error) throw error;
    
    const stats = {
      total_registros: data.length,
      total_kilometros: data.reduce((sum, r) => sum + r.kilometros_recorridos, 0),
      total_gastado: data.reduce((sum, r) => sum + r.pago_total, 0),
      total_litros: data.reduce((sum, r) => sum + r.litros, 0),
      promedio_km_litro: data.length > 0 ? data.reduce((sum, r) => sum + r.km_por_litro, 0) / data.length : 0,
      promedio_costo_km: data.length > 0 ? data.reduce((sum, r) => sum + r.costo_por_km, 0) / data.length : 0,
      promedio_km_galon: data.length > 0 ? data.reduce((sum, r) => sum + r.km_por_galon, 0) / data.length : 0,
      primera_carga: data.length > 0 ? data[data.length - 1].fecha : null,
      ultima_carga: data.length > 0 ? data[0].fecha : null
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

app.get('/api/estadisticas/generales', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registros_combustible')
      .select('*');
    
    if (error) throw error;
    
    const stats = {
      total_registros: data.length,
      total_kilometros: data.reduce((sum, r) => sum + r.kilometros_recorridos, 0),
      total_gastado: data.reduce((sum, r) => sum + r.pago_total, 0),
      total_litros: data.reduce((sum, r) => sum + r.litros, 0),
      promedio_km_litro: data.length > 0 ? data.reduce((sum, r) => sum + r.km_por_litro, 0) / data.length : 0,
      promedio_costo_km: data.length > 0 ? data.reduce((sum, r) => sum + r.costo_por_km, 0) / data.length : 0,
      promedio_km_galon: data.length > 0 ? data.reduce((sum, r) => sum + r.km_por_galon, 0) / data.length : 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas generales:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas generales' });
  }
});

app.get('/api/estadisticas/todos-vehiculos', async (req, res) => {
  try {
    const { data: vehiculos, error: errorVehiculos } = await supabase
      .from('vehiculos')
      .select('*');
    
    if (errorVehiculos) throw errorVehiculos;
    
    const estadisticas = await Promise.all(vehiculos.map(async (vehiculo) => {
      const { data: registros } = await supabase
        .from('registros_combustible')
        .select('*')
        .eq('vehiculo_id', vehiculo.id);
      
      const stats = {
        total_registros: registros.length,
        total_kilometros: registros.reduce((sum, r) => sum + r.kilometros_recorridos, 0),
        total_gastado: registros.reduce((sum, r) => sum + r.pago_total, 0),
        total_litros: registros.reduce((sum, r) => sum + r.litros, 0),
        promedio_km_litro: registros.length > 0 ? registros.reduce((sum, r) => sum + r.km_por_litro, 0) / registros.length : 0,
        promedio_costo_km: registros.length > 0 ? registros.reduce((sum, r) => sum + r.costo_por_km, 0) / registros.length : 0,
        promedio_km_galon: registros.length > 0 ? registros.reduce((sum, r) => sum + r.km_por_galon, 0) / registros.length : 0
      };
      
      return {
        ...vehiculo,
        estadisticas: stats
      };
    }));
    
    res.json(estadisticas);
  } catch (error) {
    console.error('Error obteniendo estadísticas de todos los vehículos:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// ==================== SERVIDOR ====================

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`✅ Conectado a Supabase`);
  console.log(`\n📋 Credenciales de prueba:`);
  console.log(`- Usuario: admin | Password: admin123`);
  console.log(`- Usuario: user1 | Password: user123`);
});