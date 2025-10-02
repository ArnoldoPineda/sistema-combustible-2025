import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_URL = 'https://sistema-combustible-2025.onrender.com/api';
const GASOLINERAS = ['UNO', 'TEXACO', 'SHELL', 'OTRAS'];

// URLs de imágenes de los vehículos (puedes reemplazarlas con tus propias imágenes)
const VEHICLE_IMAGES = {
  'Honda Pilot': '/images/honda-pilot.jpeg',
  'BMW': '/images/BMW.jpeg',
  'Land Rover': '/images/land-rover.jpeg'
};

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];

function App() {
  const [usuario, setUsuario] = useState(null);
  const [tabActiva, setTabActiva] = useState('capturador');
  const [vehiculos, setVehiculos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState(null);
  const [estadisticasVehiculos, setEstadisticasVehiculos] = useState([]);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);

  const [formData, setFormData] = useState({
    vehiculo_id: '',
    fecha: new Date().toISOString().split('T')[0],
    kilometraje_inicial: '',
    kilometraje_final: '',
    costo_litro: '',
    pago_total: '',
    gasolinera: 'UNO'
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (usuario) {
      cargarVehiculos();
      cargarRegistros();
      cargarEstadisticas();
    }
  }, [usuario]);

  const cargarVehiculos = async () => {
    try {
      const response = await axios.get(`${API_URL}/vehiculos`);
      setVehiculos(response.data);
    } catch (error) {
      console.error('Error cargando vehículos:', error);
    }
  };

  const cargarRegistros = async () => {
    try {
      const response = await axios.get(`${API_URL}/registros?limit=1000`);
      setRegistros(response.data);
    } catch (error) {
      console.error('Error cargando registros:', error);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const [generales, porVehiculo] = await Promise.all([
        axios.get(`${API_URL}/estadisticas/generales`),
        axios.get(`${API_URL}/estadisticas/todos-vehiculos`)
      ]);
      setEstadisticasGenerales(generales.data);
      setEstadisticasVehiculos(porVehiculo.data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const seleccionarVehiculo = async (vehiculo) => {
    setVehiculoSeleccionado(vehiculo);
    setFormData(prev => ({ ...prev, vehiculo_id: vehiculo.id }));
    
    try {
      const response = await axios.get(`${API_URL}/vehiculos/${vehiculo.id}/ultimo-kilometraje`);
      if (response.data.kilometraje_final) {
        setFormData(prev => ({
          ...prev,
          kilometraje_inicial: response.data.kilometraje_final
        }));
      }
    } catch (error) {
      console.error('Error cargando último kilometraje:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
      const response = await axios.post(`${API_URL}/login`, { username, password });
      setUsuario(response.data.usuario);
    } catch (error) {
      setError(error.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUsuario(null);
    setTabActiva('capturador');
    setVehiculoSeleccionado(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDecimalInputChange = (e) => {
    const { name, value } = e.target;
    const regex = /^\d*\.?\d{0,2}$/;
    
    if (value === '' || regex.test(value)) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const dataToSend = {
        ...formData,
        usuario_id: usuario.id,
        vehiculo_id: parseInt(formData.vehiculo_id),
        kilometraje_inicial: parseInt(formData.kilometraje_inicial),
        kilometraje_final: parseInt(formData.kilometraje_final),
        costo_litro: parseFloat(formData.costo_litro),
        pago_total: parseFloat(formData.pago_total)
      };

      await axios.post(`${API_URL}/registros`, dataToSend);
      setSuccess('Registro guardado exitosamente');
      
      setFormData({
        vehiculo_id: formData.vehiculo_id,
        fecha: new Date().toISOString().split('T')[0],
        kilometraje_inicial: formData.kilometraje_final,
        kilometraje_final: '',
        costo_litro: '',
        pago_total: '',
        gasolinera: 'UNO'
      });

      cargarRegistros();
      cargarEstadisticas();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Error al guardar el registro');
    } finally {
      setLoading(false);
    }
  };

  const calcularValores = () => {
    const kmInicial = parseInt(formData.kilometraje_inicial) || 0;
    const kmFinal = parseInt(formData.kilometraje_final) || 0;
    const costoLitro = parseFloat(formData.costo_litro) || 0;
    const pagoTotal = parseFloat(formData.pago_total) || 0;

    const kmRecorridos = kmFinal - kmInicial;
    const litros = costoLitro > 0 ? pagoTotal / costoLitro : 0;
    const kmPorLitro = litros > 0 ? kmRecorridos / litros : 0;
    const costoPorKm = kmRecorridos > 0 ? pagoTotal / kmRecorridos : 0;
    const kmPorGalon = kmPorLitro * 3.78541;

    return {
      kmRecorridos: kmRecorridos >= 0 ? kmRecorridos : 0,
      litros: litros.toFixed(2),
      kmPorLitro: kmPorLitro.toFixed(2),
      costoPorKm: costoPorKm.toFixed(2),
      kmPorGalon: kmPorGalon.toFixed(2)
    };
  };

  const calcularEstadisticasPorPeriodo = () => {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const añoActual = ahora.getFullYear();

    const registrosMes = registros.filter(r => {
      const fecha = new Date(r.fecha);
      return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
    });

    const registrosAño = registros.filter(r => {
      const fecha = new Date(r.fecha);
      return fecha.getFullYear() === añoActual;
    });

    return {
      mes: {
        total: registrosMes.reduce((sum, r) => sum + r.pago_total, 0),
        registros: registrosMes.length,
        litros: registrosMes.reduce((sum, r) => sum + r.litros, 0)
      },
      año: {
        total: registrosAño.reduce((sum, r) => sum + r.pago_total, 0),
        registros: registrosAño.length,
        litros: registrosAño.reduce((sum, r) => sum + r.litros, 0)
      },
      total: {
        total: registros.reduce((sum, r) => sum + r.pago_total, 0),
        registros: registros.length,
        litros: registros.reduce((sum, r) => sum + r.litros, 0)
      }
    };
  };

  if (!usuario) {
    return <LoginForm onLogin={handleLogin} error={error} loading={loading} />;
  }

  const valores = calcularValores();
  const estadisticasPeriodo = calcularEstadisticasPorPeriodo();
  const esAdmin = usuario.username === 'admin';

  return (
    <div className="app-container">
      <Header usuario={usuario} onLogout={handleLogout} />
      
      <div className="tabs">
        <button 
          className={`tab ${tabActiva === 'capturador' ? 'active' : ''}`}
          onClick={() => setTabActiva('capturador')}
        >
          Capturador
        </button>
        <button 
          className={`tab ${tabActiva === 'dashboard' ? 'active' : ''}`}
          onClick={() => setTabActiva('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`tab ${tabActiva === 'historial' ? 'active' : ''}`}
          onClick={() => setTabActiva('historial')}
        >
          Historial
        </button>
        {esAdmin && (
          <button 
            className={`tab ${tabActiva === 'administracion' ? 'active' : ''}`}
            onClick={() => setTabActiva('administracion')}
          >
            Administración
          </button>
        )}
      </div>

      {tabActiva === 'capturador' && (
        <CapturadorMejorado 
          vehiculos={vehiculos}
          vehiculoSeleccionado={vehiculoSeleccionado}
          onSeleccionarVehiculo={seleccionarVehiculo}
          formData={formData}
          onChange={handleInputChange}
          onDecimalChange={handleDecimalInputChange}
          onSubmit={handleSubmit}
          valores={valores}
          error={error}
          success={success}
          loading={loading}
        />
      )}

      {tabActiva === 'dashboard' && (
        <DashboardAvanzado vehiculos={vehiculos} />
      )}

      {tabActiva === 'historial' && (
        <Historial registros={registros} vehiculos={vehiculos} />
      )}

      {tabActiva === 'administracion' && esAdmin && (
        <Administracion 
          registros={registros} 
          vehiculos={vehiculos}
          onRecargar={() => {
            cargarRegistros();
            cargarEstadisticas();
          }}
        />
      )}
    </div>
  );
}

function LoginForm({ onLogin, error, loading }) {
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Control de Combustible</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={onLogin}>
          <div className="form-group">
            <label>Usuario</label>
            <input type="text" name="username" required autoComplete="username" />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" name="password" required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Header({ usuario, onLogout }) {
  return (
    <div className="header">
      <h1>Control de Combustible</h1>
      <div className="user-info">
        <span className="user-name">{usuario.nombre}</span>
        <button onClick={onLogout} className="btn-logout">Salir</button>
      </div>
    </div>
  );
}

function CapturadorMejorado({ vehiculos, vehiculoSeleccionado, onSeleccionarVehiculo, formData, onChange, onDecimalChange, onSubmit, valores, error, success, loading }) {
  return (
    <div className="content-card">
      <h2>Selecciona tu Vehículo</h2>
      
      <div className="vehicle-selector">
        {vehiculos.map(v => (
          <div 
            key={v.id}
            className={`vehicle-card-selector ${vehiculoSeleccionado?.id === v.id ? 'selected' : ''}`}
            onClick={() => onSeleccionarVehiculo(v)}
          >
            <div className="vehicle-image">
              <img src={VEHICLE_IMAGES[v.nombre] || 'https://via.placeholder.com/400'} alt={v.nombre} />
            </div>
            <h3>{v.nombre}</h3>
            <p>{v.modelo}</p>
          </div>
        ))}
      </div>

      {vehiculoSeleccionado && (
        <>
          <h2 style={{marginTop: '30px'}}>Registrar Carga - {vehiculoSeleccionado.nombre}</h2>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={onSubmit}>
            <div className="form-grid-mobile">
              <div className="form-group">
                <label>Fecha</label>
                <input type="date" name="fecha" value={formData.fecha} onChange={onChange} required />
              </div>

              <div className="form-group">
                <label>Kilometraje Inicial</label>
                <input type="number" name="kilometraje_inicial" value={formData.kilometraje_inicial} onChange={onChange} required min="0" />
                <small>Se carga automáticamente del último registro</small>
              </div>

              <div className="form-group">
                <label>Kilometraje Final</label>
                <input type="number" name="kilometraje_final" value={formData.kilometraje_final} onChange={onChange} required min="0" />
              </div>

              <div className="form-group">
                <label>Costo por Litro (L)</label>
                <input type="text" inputMode="decimal" name="costo_litro" value={formData.costo_litro} onChange={onDecimalChange} placeholder="0.00" required />
              </div>

              <div className="form-group">
                <label>Pago Total (L)</label>
                <input type="text" inputMode="decimal" name="pago_total" value={formData.pago_total} onChange={onDecimalChange} placeholder="0.00" required />
              </div>

              <div className="form-group">
                <label>Gasolinera</label>
                <select name="gasolinera" value={formData.gasolinera} onChange={onChange} required>
                  {GASOLINERAS.map(g => (<option key={g} value={g}>{g}</option>))}
                </select>
              </div>
            </div>

            <div className="dashboard-grid" style={{marginTop: '20px'}}>
              <div className="stat-card-small">
                <h4>Km Recorridos</h4>
                <div className="value-small">{valores.kmRecorridos}</div>
              </div>
              <div className="stat-card-small">
                <h4>Litros</h4>
                <div className="value-small">{valores.litros}</div>
              </div>
              <div className="stat-card-small">
                <h4>Km/Litro</h4>
                <div className="value-small">{valores.kmPorLitro}</div>
              </div>
              <div className="stat-card-small">
                <h4>Costo/Km</h4>
                <div className="value-small">{valores.costoPorKm}</div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Registro'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
// Agregar este componente mejorado al App.jsx

function DashboardAvanzado({ vehiculos }) {
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState('todos');
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarEstadisticasCompletas();
  }, [vehiculoSeleccionado]);

  const cargarEstadisticasCompletas = async () => {
    setLoading(true);
    try {
      // Cargar TODOS los registros sin límite
      const endpoint = vehiculoSeleccionado === 'todos' 
        ? `${API_URL}/registros?limit=1000`
        : `${API_URL}/registros?vehiculo_id=${vehiculoSeleccionado}&limit=1000`;
      
      const response = await axios.get(endpoint);
      const registros = response.data;

      // Calcular estadísticas
      const stats = calcularEstadisticasAvanzadas(registros);
      setEstadisticas(stats);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticasAvanzadas = (registros) => {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const añoActual = ahora.getFullYear();

    // Gastos por año
    const gastosPorAño = {};
    const gastosPorMes = {};
    const costoPorKmTiempo = [];

    registros.forEach(r => {
      const fecha = new Date(r.fecha);
      const año = fecha.getFullYear();
      const mes = fecha.getMonth();
      const mesAño = `${año}-${String(mes + 1).padStart(2, '0')}`;

      // Por año
      if (!gastosPorAño[año]) {
        gastosPorAño[año] = { año, total: 0, litros: 0, km: 0, registros: 0 };
      }
      gastosPorAño[año].total += r.pago_total;
      gastosPorAño[año].litros += r.litros;
      gastosPorAño[año].km += r.kilometros_recorridos;
      gastosPorAño[año].registros += 1;

      // Por mes
      if (!gastosPorMes[mesAño]) {
        gastosPorMes[mesAño] = { mesAño, total: 0, litros: 0, km: 0, registros: 0 };
      }
      gastosPorMes[mesAño].total += r.pago_total;
      gastosPorMes[mesAño].litros += r.litros;
      gastosPorMes[mesAño].km += r.kilometros_recorridos;
      gastosPorMes[mesAño].registros += 1;

      // Costo por km en el tiempo
      costoPorKmTiempo.push({
        fecha: r.fecha,
        costoPorKm: r.costo_por_km,
        kmPorLitro: r.km_por_litro
      });
    });

    // Convertir a arrays y ordenar
    const arrayGastosPorAño = Object.values(gastosPorAño).sort((a, b) => a.año - b.año);
    const arrayGastosPorMes = Object.values(gastosPorMes).sort((a, b) => a.mesAño.localeCompare(b.mesAño));

    // Estadísticas del mes actual
    const mesActualKey = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}`;
    const statsMesActual = gastosPorMes[mesActualKey] || { total: 0, litros: 0, registros: 0 };

    // Estadísticas del año actual
    const statsAñoActual = gastosPorAño[añoActual] || { total: 0, litros: 0, km: 0, registros: 0 };

    // Totales históricos
    const totales = registros.reduce((acc, r) => ({
      total: acc.total + r.pago_total,
      litros: acc.litros + r.litros,
      km: acc.km + r.kilometros_recorridos,
      registros: acc.registros + 1
    }), { total: 0, litros: 0, km: 0, registros: 0 });

    return {
      mesActual: statsMesActual,
      añoActual: statsAñoActual,
      totales,
      gastosPorAño: arrayGastosPorAño,
      gastosPorMes: arrayGastosPorMes.slice(-12), // Últimos 12 meses
      costoPorKmTiempo: costoPorKmTiempo.slice(-50), // Últimos 50 registros
      promedioKmLitro: totales.km / totales.litros,
      promedioCostoPorKm: totales.total / totales.km
    };
  };

  if (loading) {
    return <div className="content-card">Cargando estadísticas completas...</div>;
  }

  if (!estadisticas) {
    return <div className="content-card">No hay datos disponibles</div>;
  }

  const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  return (
    <div>
      {/* Selector de Vehículo */}
      <div className="content-card" style={{marginBottom: '20px'}}>
        <h2>Seleccionar Vista</h2>
        <div className="form-group">
          <select 
            value={vehiculoSeleccionado} 
            onChange={(e) => setVehiculoSeleccionado(e.target.value)}
            style={{fontSize: '16px', padding: '10px'}}
          >
            <option value="todos">Comparativa - Todos los Vehículos</option>
            {vehiculos.map(v => (
              <option key={v.id} value={v.id}>{v.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumen de Gastos */}
      <div className="content-card" style={{marginBottom: '20px'}}>
        <h2>Gastos de Combustible</h2>
        <div className="periodo-stats">
          <div className="periodo-card">
            <h3>Este Mes</h3>
            <div className="periodo-value">
              L {estadisticas.mesActual.total.toLocaleString('es-HN', {minimumFractionDigits: 2})}
            </div>
            <div className="periodo-detail">
              {estadisticas.mesActual.registros} cargas | {estadisticas.mesActual.litros.toFixed(2)} lts
            </div>
          </div>
          <div className="periodo-card">
            <h3>Este Año</h3>
            <div className="periodo-value">
              L {estadisticas.añoActual.total.toLocaleString('es-HN', {minimumFractionDigits: 2})}
            </div>
            <div className="periodo-detail">
              {estadisticas.añoActual.registros} cargas | {estadisticas.añoActual.litros.toFixed(2)} lts
            </div>
          </div>
          <div className="periodo-card destacado">
            <h3>Total Histórico</h3>
            <div className="periodo-value">
              L {estadisticas.totales.total.toLocaleString('es-HN', {minimumFractionDigits: 2})}
            </div>
            <div className="periodo-detail">
              {estadisticas.totales.registros} cargas | {estadisticas.totales.litros.toFixed(2)} lts
            </div>
          </div>
        </div>
      </div>

      {/* Gráfica de Gasto Acumulado por Año */}
      <div className="content-card" style={{marginBottom: '20px'}}>
        <h2>Gasto Acumulado por Año</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={estadisticas.gastosPorAño} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="año" />
            <Tooltip 
              formatter={(value) => [`L ${value.toLocaleString('es-HN', {minimumFractionDigits: 2})}`, 'Gasto Total']}
            />
            <Bar dataKey="total" fill="#667eea" />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Tabla de detalle por año */}
        <div style={{marginTop: '20px', overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{backgroundColor: '#f0f0f0'}}>
                <th style={{padding: '10px', textAlign: 'left'}}>Año</th>
                <th style={{padding: '10px', textAlign: 'right'}}>Gasto Total</th>
                <th style={{padding: '10px', textAlign: 'right'}}>Km Recorridos</th>
                <th style={{padding: '10px', textAlign: 'right'}}>Litros</th>
                <th style={{padding: '10px', textAlign: 'right'}}>Cargas</th>
              </tr>
            </thead>
            <tbody>
              {estadisticas.gastosPorAño.map(año => (
                <tr key={año.año} style={{borderBottom: '1px solid #e0e0e0'}}>
                  <td style={{padding: '10px'}}><strong>{año.año}</strong></td>
                  <td style={{padding: '10px', textAlign: 'right'}}>
                    L {año.total.toLocaleString('es-HN', {minimumFractionDigits: 2})}
                  </td>
                  <td style={{padding: '10px', textAlign: 'right'}}>
                    {año.km.toLocaleString()}
                  </td>
                  <td style={{padding: '10px', textAlign: 'right'}}>
                    {año.litros.toFixed(2)}
                  </td>
                  <td style={{padding: '10px', textAlign: 'right'}}>
                    {año.registros}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfica de Gastos por Mes (últimos 12 meses) */}
      <div className="content-card" style={{marginBottom: '20px'}}>
        <h2>Gastos Mensuales (Últimos 12 Meses)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={estadisticas.gastosPorMes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="mesAño" 
              tickFormatter={(value) => {
                const [año, mes] = value.split('-');
                return `${nombresMeses[parseInt(mes) - 1]} ${año.slice(2)}`;
              }}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => {
                const [año, mes] = value.split('-');
                return `${nombresMeses[parseInt(mes) - 1]} ${año}`;
              }}
              formatter={(value) => [`L ${value.toLocaleString('es-HN', {minimumFractionDigits: 2})}`, 'Gasto']}
            />
            <Bar dataKey="total" fill="#764ba2" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfica de Costo por Kilómetro en el Tiempo */}
      <div className="content-card" style={{marginBottom: '20px'}}>
        <h2>Costo por Kilómetro en el Tiempo</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={estadisticas.costoPorKmTiempo}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="fecha" 
              tickFormatter={(fecha) => new Date(fecha).toLocaleDateString('es-HN', {month: 'short', day: 'numeric'})}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(fecha) => new Date(fecha).toLocaleDateString('es-HN')}
              formatter={(value) => [value.toFixed(2), 'L/km']}
            />
            <Legend />
            <Line type="monotone" dataKey="costoPorKm" stroke="#e74c3c" name="Costo/Km" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfica de Rendimiento (Km/Litro) en el Tiempo */}
      <div className="content-card" style={{marginBottom: '20px'}}>
        <h2>Rendimiento (Km/Litro) en el Tiempo</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={estadisticas.costoPorKmTiempo}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="fecha" 
              tickFormatter={(fecha) => new Date(fecha).toLocaleDateString('es-HN', {month: 'short', day: 'numeric'})}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(fecha) => new Date(fecha).toLocaleDateString('es-HN')}
              formatter={(value) => [value.toFixed(2), 'km/lt']}
            />
            <Legend />
            <Line type="monotone" dataKey="kmPorLitro" stroke="#27ae60" name="Km/Litro" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Resumen de Promedios */}
      <div className="content-card">
        <h2>Promedios Históricos</h2>
        <div className="dashboard-grid">
          <div className="stat-card-small">
            <h4>Rendimiento Promedio</h4>
            <div className="value-small">{estadisticas.promedioKmLitro.toFixed(2)} km/lt</div>
          </div>
          <div className="stat-card-small">
            <h4>Costo Promedio/Km</h4>
            <div className="value-small">L {estadisticas.promedioCostoPorKm.toFixed(2)}</div>
          </div>
          <div className="stat-card-small">
            <h4>Total Kilómetros</h4>
            <div className="value-small">{estadisticas.totales.km.toLocaleString()}</div>
          </div>
          <div className="stat-card-small">
            <h4>Total Litros</h4>
            <div className="value-small">{estadisticas.totales.litros.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Historial({ registros, vehiculos }) {
  const [filtroVehiculo, setFiltroVehiculo] = useState('');

  const registrosFiltrados = registros.filter(r => {
    return !filtroVehiculo || r.vehiculo_id == filtroVehiculo;
  });

  return (
    <div className="content-card">
      <h2>Historial de Cargas</h2>
      
      <div className="form-group" style={{marginBottom: '20px'}}>
        <label>Filtrar por Vehículo</label>
        <select value={filtroVehiculo} onChange={(e) => setFiltroVehiculo(e.target.value)}>
          <option value="">Todos los vehículos</option>
          {vehiculos.map(v => (<option key={v.id} value={v.id}>{v.nombre}</option>))}
        </select>
      </div>

      <div className="historial-list">
        {registrosFiltrados.length === 0 ? (
          <p style={{textAlign: 'center', padding: '30px'}}>No hay registros disponibles</p>
        ) : (
          registrosFiltrados.map(registro => (
            <div key={registro.id} className="historial-item">
              <div className="historial-header">
                <strong>{registro.vehiculo_nombre}</strong>
                <span>{new Date(registro.fecha).toLocaleDateString('es-HN')}</span>
              </div>
              <div className="historial-body">
                <div className="historial-stat">
                  <span>Km</span>
                  <strong>{registro.kilometros_recorridos}</strong>
                </div>
                <div className="historial-stat">
                  <span>Litros</span>
                  <strong>{registro.litros.toFixed(2)}</strong>
                </div>
                <div className="historial-stat">
                  <span>Km/Lt</span>
                  <strong>{registro.km_por_litro.toFixed(2)}</strong>
                </div>
                <div className="historial-stat">
                  <span>Total</span>
                  <strong>L {registro.pago_total.toFixed(2)}</strong>
                </div>
              </div>
              <div className="historial-footer">
                {registro.gasolinera}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Administracion({ registros, vehiculos, onRecargar }) {
  const [registroEditando, setRegistroEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({});
  const [filtroVehiculo, setFiltroVehiculo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const registrosFiltrados = registros.filter(r => {
    const cumpleFiltroVehiculo = !filtroVehiculo || r.vehiculo_id == filtroVehiculo;
    const cumpleBusqueda = !busqueda || 
      r.vehiculo_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.gasolinera.toLowerCase().includes(busqueda.toLowerCase()) ||
      new Date(r.fecha).toLocaleDateString('es-HN').includes(busqueda);
    
    return cumpleFiltroVehiculo && cumpleBusqueda;
  });

  const iniciarEdicion = (registro) => {
    setRegistroEditando(registro.id);
    setFormEdit({
      fecha: registro.fecha.split('T')[0],
      kilometraje_inicial: registro.kilometraje_inicial,
      kilometraje_final: registro.kilometraje_final,
      costo_litro: registro.costo_litro,
      pago_total: registro.pago_total,
      gasolinera: registro.gasolinera
    });
    setError('');
    setSuccess('');
  };

  const cancelarEdicion = () => {
    setRegistroEditando(null);
    setFormEdit({});
    setError('');
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setFormEdit(prev => ({ ...prev, [name]: value }));
  };

  const handleDecimalEditChange = (e) => {
    const { name, value } = e.target;
    const regex = /^\d*\.?\d{0,2}$/;
    
    if (value === '' || regex.test(value)) {
      setFormEdit(prev => ({ ...prev, [name]: value }));
    }
  };

  const guardarEdicion = async (registroId) => {
    setError('');
    setSuccess('');

    try {
      const dataToSend = {
        fecha: formEdit.fecha,
        kilometraje_inicial: parseInt(formEdit.kilometraje_inicial),
        kilometraje_final: parseInt(formEdit.kilometraje_final),
        costo_litro: parseFloat(formEdit.costo_litro),
        pago_total: parseFloat(formEdit.pago_total),
        gasolinera: formEdit.gasolinera
      };

      await axios.put(`${API_URL}/registros/${registroId}`, dataToSend);
      setSuccess('Registro actualizado exitosamente');
      setRegistroEditando(null);
      onRecargar();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Error al actualizar el registro');
    }
  };

  const eliminarRegistro = async (registroId, vehiculoNombre) => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar este registro de ${vehiculoNombre}?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    setError('');
    setSuccess('');

    try {
      await axios.delete(`${API_URL}/registros/${registroId}`);
      setSuccess('Registro eliminado exitosamente');
      onRecargar();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Error al eliminar el registro');
    }
  };

  return (
    <div className="content-card">
      <h2>Administración de Registros</h2>
      <p style={{color: '#666', marginBottom: '20px'}}>
        Vista exclusiva para administradores. Puedes editar o eliminar cualquier registro.
      </p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Filtros */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px'}}>
        <div className="form-group">
          <label>Filtrar por Vehículo</label>
          <select value={filtroVehiculo} onChange={(e) => setFiltroVehiculo(e.target.value)}>
            <option value="">Todos los vehículos</option>
            {vehiculos.map(v => (<option key={v.id} value={v.id}>{v.nombre}</option>))}
          </select>
        </div>
        <div className="form-group">
          <label>Buscar</label>
          <input 
            type="text" 
            placeholder="Buscar por vehículo, fecha o gasolinera..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <p style={{marginBottom: '15px', color: '#666'}}>
        Total de registros: <strong>{registrosFiltrados.length}</strong>
      </p>

      {/* Tabla de registros */}
      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
          <thead>
            <tr style={{backgroundColor: '#f0f0f0', borderBottom: '2px solid #667eea'}}>
              <th style={{padding: '12px 8px', textAlign: 'left'}}>Fecha</th>
              <th style={{padding: '12px 8px', textAlign: 'left'}}>Vehículo</th>
              <th style={{padding: '12px 8px', textAlign: 'right'}}>Km Inicial</th>
              <th style={{padding: '12px 8px', textAlign: 'right'}}>Km Final</th>
              <th style={{padding: '12px 8px', textAlign: 'right'}}>Km Recorridos</th>
              <th style={{padding: '12px 8px', textAlign: 'right'}}>Costo/Lt</th>
              <th style={{padding: '12px 8px', textAlign: 'right'}}>Total</th>
              <th style={{padding: '12px 8px', textAlign: 'center'}}>Gasolinera</th>
              <th style={{padding: '12px 8px', textAlign: 'center'}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="9" style={{padding: '30px', textAlign: 'center', color: '#666'}}>
                  No hay registros que coincidan con los filtros
                </td>
              </tr>
            ) : (
              registrosFiltrados.map(registro => (
                <tr key={registro.id} style={{borderBottom: '1px solid #e0e0e0'}}>
                  {registroEditando === registro.id ? (
                    <>
                      <td style={{padding: '8px'}}>
                        <input 
                          type="date" 
                          name="fecha" 
                          value={formEdit.fecha}
                          onChange={handleEditChange}
                          style={{width: '100%', padding: '5px', fontSize: '13px'}}
                        />
                      </td>
                      <td style={{padding: '8px'}}>{registro.vehiculo_nombre}</td>
                      <td style={{padding: '8px'}}>
                        <input 
                          type="number" 
                          name="kilometraje_inicial" 
                          value={formEdit.kilometraje_inicial}
                          onChange={handleEditChange}
                          style={{width: '80px', padding: '5px', fontSize: '13px', textAlign: 'right'}}
                        />
                      </td>
                      <td style={{padding: '8px'}}>
                        <input 
                          type="number" 
                          name="kilometraje_final" 
                          value={formEdit.kilometraje_final}
                          onChange={handleEditChange}
                          style={{width: '80px', padding: '5px', fontSize: '13px', textAlign: 'right'}}
                        />
                      </td>
                      <td style={{padding: '8px', textAlign: 'right'}}>
                        {parseInt(formEdit.kilometraje_final || 0) - parseInt(formEdit.kilometraje_inicial || 0)}
                      </td>
                      <td style={{padding: '8px'}}>
                        <input 
                          type="text"
                          inputMode="decimal"
                          name="costo_litro" 
                          value={formEdit.costo_litro}
                          onChange={handleDecimalEditChange}
                          style={{width: '70px', padding: '5px', fontSize: '13px', textAlign: 'right'}}
                        />
                      </td>
                      <td style={{padding: '8px'}}>
                        <input 
                          type="text"
                          inputMode="decimal"
                          name="pago_total" 
                          value={formEdit.pago_total}
                          onChange={handleDecimalEditChange}
                          style={{width: '80px', padding: '5px', fontSize: '13px', textAlign: 'right'}}
                        />
                      </td>
                      <td style={{padding: '8px'}}>
                        <select 
                          name="gasolinera" 
                          value={formEdit.gasolinera}
                          onChange={handleEditChange}
                          style={{width: '100%', padding: '5px', fontSize: '13px'}}
                        >
                          {GASOLINERAS.map(g => (<option key={g} value={g}>{g}</option>))}
                        </select>
                      </td>
                      <td style={{padding: '8px', textAlign: 'center'}}>
                        <button 
                          onClick={() => guardarEdicion(registro.id)}
                          style={{
                            padding: '5px 10px',
                            background: '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            marginRight: '5px',
                            fontSize: '12px'
                          }}
                        >
                          Guardar
                        </button>
                        <button 
                          onClick={cancelarEdicion}
                          style={{
                            padding: '5px 10px',
                            background: '#95a5a6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{padding: '12px 8px'}}>
                        {new Date(registro.fecha).toLocaleDateString('es-HN')}
                      </td>
                      <td style={{padding: '12px 8px'}}><strong>{registro.vehiculo_nombre}</strong></td>
                      <td style={{padding: '12px 8px', textAlign: 'right'}}>{registro.kilometraje_inicial}</td>
                      <td style={{padding: '12px 8px', textAlign: 'right'}}>{registro.kilometraje_final}</td>
                      <td style={{padding: '12px 8px', textAlign: 'right'}}><strong>{registro.kilometros_recorridos}</strong></td>
                      <td style={{padding: '12px 8px', textAlign: 'right'}}>L {registro.costo_litro.toFixed(2)}</td>
                      <td style={{padding: '12px 8px', textAlign: 'right'}}><strong>L {registro.pago_total.toFixed(2)}</strong></td>
                      <td style={{padding: '12px 8px', textAlign: 'center'}}>
                        <span style={{
                          background: '#667eea',
                          color: 'white',
                          padding: '3px 8px',
                          borderRadius: '3px',
                          fontSize: '12px'
                        }}>
                          {registro.gasolinera}
                        </span>
                      </td>
                      <td style={{padding: '12px 8px', textAlign: 'center'}}>
                        <button 
                          onClick={() => iniciarEdicion(registro)}
                          style={{
                            padding: '5px 10px',
                            background: '#3498db',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            marginRight: '5px',
                            fontSize: '12px'
                          }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => eliminarRegistro(registro.id, registro.vehiculo_nombre)}
                          style={{
                            padding: '5px 10px',
                            background: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;