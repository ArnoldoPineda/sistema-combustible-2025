import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext'; // ✅ IMPORTAR useAuth
import GestionCentros from './GestionCentros';
import GestionDocentes from './GestionDocentes';
import GestionAsignaciones from './GestionAsignaciones';
import GestionEvaluaciones from './GestionEvaluaciones';
import DashboardAdminEstadisticas from '../../components/DashboardAdminEstadisticas';
import GeneradorEspecialistas from '../../components/GeneradorEspecialistas';
import ImportadorDocentes from '../../components/ImportadorDocentes';
import GestionAsignacionesDocentes from './GestionAsignacionesDocentes';
import DashboardAsignaciones from '../../components/DashboardAsignaciones';

export default function DashboardAdmin() {
  const { profile, isAdminEspecialista } = useAuth(); // ✅ OBTENER PERFIL Y ROL
  
  // ✅ Tab inicial según rol
  const [activeTab, setActiveTab] = useState(
    isAdminEspecialista ? 'dashboard-asignaciones' : 'dashboard'
  );

  // ✅ Actualizar tab si cambia el rol
  useEffect(() => {
    if (isAdminEspecialista && activeTab === 'dashboard') {
      setActiveTab('dashboard-asignaciones');
    }
  }, [isAdminEspecialista]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sistema TEACH Honduras</h1>
              <p className="text-gray-600 mt-1">
                Bienvenido, {profile?.nombre_completo || 'Usuario'}
                {isAdminEspecialista && (
                  <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                    Coordinador
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            
            {/* ✅ Tab "Panel de control" - SOLO para admin regular */}
            {!isAdminEspecialista && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏠 Panel de control
              </button>
            )}

            {/* ✅ Tab "Dashboard Asignaciones" - PARA TODOS */}
            <button
              onClick={() => setActiveTab('dashboard-asignaciones')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'dashboard-asignaciones'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Dashboard Asignaciones
            </button>

            {/* ✅ Tab "Estadísticas Globales" - PARA TODOS */}
            <button
              onClick={() => setActiveTab('estadisticas')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'estadisticas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📈 Estadísticas Globales
            </button>

            {/* ✅ Tab "Generador Especialistas" - SOLO admin regular */}
            {!isAdminEspecialista && (
              <button
                onClick={() => setActiveTab('generador')}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'generador'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⚙️ Generador Especialistas
              </button>
            )}

            {/* ✅ Tab "Centros Educativos" - PARA TODOS */}
            <button
              onClick={() => setActiveTab('centros')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'centros'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏫 Centros Educativos
            </button>

            {/* ✅ Tab "Docentes" - PARA TODOS */}
            <button
              onClick={() => setActiveTab('docentes')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'docentes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👨‍🏫 Docentes
            </button>

            {/* ✅ Tab "Importar Docentes" - SOLO admin regular */}
            {!isAdminEspecialista && (
              <button
                onClick={() => setActiveTab('importador')}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'importador'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📤 Importar Docentes
              </button>
            )}

            {/* ✅ Tab "Asignar Docentes" - PARA TODOS */}
            <button
              onClick={() => setActiveTab('asignar-docentes')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'asignar-docentes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Asignar Docentes
            </button>

            {/* ✅ Tab "Asignaciones" (viejo) - SOLO admin regular */}
            {!isAdminEspecialista && (
              <button
                onClick={() => setActiveTab('asignaciones')}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'asignaciones'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👥 Asignaciones
              </button>
            )}

            {/* ✅ Tab "Evaluaciones" - PARA TODOS */}
            <button
              onClick={() => setActiveTab('evaluaciones')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'evaluaciones'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Evaluaciones
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardContent setActiveTab={setActiveTab} />}
        {activeTab === 'dashboard-asignaciones' && <DashboardAsignaciones />}
        {activeTab === 'estadisticas' && <DashboardAdminEstadisticas />}
        {activeTab === 'generador' && <GeneradorEspecialistas />}
        {activeTab === 'centros' && <GestionCentros />}
        {activeTab === 'docentes' && <GestionDocentes />}
        {activeTab === 'importador' && <ImportadorDocentes />}
        {activeTab === 'asignar-docentes' && <GestionAsignacionesDocentes />}
        {activeTab === 'asignaciones' && <GestionAsignaciones />}
        {activeTab === 'evaluaciones' && <GestionEvaluaciones />}
      </div>
    </div>
  );
}

// Componente Dashboard Principal
function DashboardContent({ setActiveTab }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Panel de Control</h2>
      
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Centros Educativos</p>
              <p className="text-3xl font-bold text-blue-600">0</p>
            </div>
            <span className="text-4xl">🏫</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Docentes Registrados</p>
              <p className="text-3xl font-bold text-green-600">3</p>
            </div>
            <span className="text-4xl">👨‍🏫</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Asignaciones Activas</p>
              <p className="text-3xl font-bold text-purple-600">3</p>
            </div>
            <span className="text-4xl">👥</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Evaluaciones TEACH</p>
              <p className="text-3xl font-bold text-orange-600">0</p>
            </div>
            <span className="text-4xl">📊</span>
          </div>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Sistema</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-gray-600">Especialistas Activos</span>
            <span className="font-semibold">1</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-gray-600">Departamentos Cubiertos</span>
            <span className="font-semibold">1 (Comayagua)</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600">Estado del Sistema</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Operativo
            </span>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Accesos Rápidos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => setActiveTab('docentes')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-3xl block mb-2">➕</span>
            <span className="text-sm font-medium">Nuevo Docente</span>
          </button>
          <button 
            onClick={() => setActiveTab('centros')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-3xl block mb-2">🏫</span>
            <span className="text-sm font-medium">Nuevo Centro</span>
          </button>
          <button 
            onClick={() => setActiveTab('asignar-docentes')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-3xl block mb-2">👥</span>
            <span className="text-sm font-medium">Asignar Docentes</span>
          </button>
          <button 
            onClick={() => setActiveTab('evaluaciones')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-3xl block mb-2">📊</span>
            <span className="text-sm font-medium">Ver Evaluaciones</span>
          </button>
        </div>
      </div>
    </div>
  );
}