import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { DEPARTAMENTOS_HONDURAS } from '../../utils/constants'

export default function GestionCentros() {
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCentro, setEditingCentro] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartamento, setSelectedDepartamento] = useState('')
  
  const [formData, setFormData] = useState({
    nombre_centro: '',
    departamento: '',
    municipio: '',
    direccion: '',
    numero_alumnos: ''
  })

  useEffect(() => {
    cargarCentros()
  }, [])

  const cargarCentros = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('centros_educativos')
        .select('*')
        .order('nombre_centro', { ascending: true })

      if (error) throw error
      setCentros(data || [])
    } catch (error) {
      console.error('Error:', error)
      setCentros([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (centro = null) => {
    if (centro) {
      setEditingCentro(centro)
      setFormData({
        nombre_centro: centro.nombre_centro,
        departamento: centro.departamento,
        municipio: centro.municipio,
        direccion: centro.direccion || '',
        numero_alumnos: centro.numero_alumnos || ''
      })
    } else {
      setEditingCentro(null)
      setFormData({
        nombre_centro: '',
        departamento: '',
        municipio: '',
        direccion: '',
        numero_alumnos: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCentro(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const dataToSave = {
        ...formData,
        numero_alumnos: formData.numero_alumnos ? parseInt(formData.numero_alumnos) : null,
        updated_at: new Date().toISOString()
      }

      if (editingCentro) {
        const { error } = await supabase
          .from('centros_educativos')
          .update(dataToSave)
          .eq('id', editingCentro.id)

        if (error) throw error
        alert('Centro actualizado correctamente')
      } else {
        const { error } = await supabase
          .from('centros_educativos')
          .insert([dataToSave])

        if (error) throw error
        alert('Centro creado correctamente')
      }

      handleCloseModal()
      cargarCentros()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar el centro educativo')
    }
  }

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el centro "${nombre}"?`)) return

    try {
      const { error } = await supabase
        .from('centros_educativos')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('Centro eliminado correctamente')
      cargarCentros()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar el centro educativo')
    }
  }

  const centrosFiltrados = centros.filter(centro => {
    const matchSearch = centro.nombre_centro.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        centro.municipio.toLowerCase().includes(searchTerm.toLowerCase())
    const matchDepartamento = !selectedDepartamento || centro.departamento === selectedDepartamento
    return matchSearch && matchDepartamento
  })

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Centros Educativos</h2>
          <p className="text-gray-600 mt-1">Gestiona las escuelas donde laboran los docentes</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Agregar Centro
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Buscar por nombre o municipio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedDepartamento}
            onChange={(e) => setSelectedDepartamento(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los departamentos</option>
            {DEPARTAMENTOS_HONDURAS.map(dep => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Mostrando {centrosFiltrados.length} de {centros.length} centros
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando centros...</p>
          </div>
        ) : centrosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No hay centros educativos registrados</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Agregar el primer centro
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Municipio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alumnos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {centrosFiltrados.map((centro) => (
                <tr key={centro.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{centro.nombre_centro}</div></td>
                  <td className="px-6 py-4"><div className="text-sm text-gray-500">{centro.departamento}</div></td>
                  <td className="px-6 py-4"><div className="text-sm text-gray-500">{centro.municipio}</div></td>
                  <td className="px-6 py-4"><div className="text-sm text-gray-500">{centro.numero_alumnos || '-'}</div></td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button onClick={() => handleOpenModal(centro)} className="text-blue-600 hover:text-blue-900 mr-4">Editar</button>
                    <button onClick={() => handleDelete(centro.id, centro.nombre_centro)} className="text-red-600 hover:text-red-900">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {editingCentro ? 'Editar Centro' : 'Nuevo Centro'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Centro *</label>
                <input type="text" value={formData.nombre_centro} onChange={(e) => setFormData({ ...formData, nombre_centro: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Departamento *</label>
                <select value={formData.departamento} onChange={(e) => setFormData({ ...formData, departamento: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccione</option>
                  {DEPARTAMENTOS_HONDURAS.map(dep => (<option key={dep} value={dep}>{dep}</option>))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Municipio *</label>
                <input type="text" value={formData.municipio} onChange={(e) => setFormData({ ...formData, municipio: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Alumnos</label>
                <input type="number" value={formData.numero_alumnos} onChange={(e) => setFormData({ ...formData, numero_alumnos: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingCentro ? 'Actualizar' : 'Crear'}</button>
                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}