import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import ModalConfirmacion from '../../components/common/ModalConfirmacion'

export default function GestionDocentes() {
  const [docentes, setDocentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartamento, setFilterDepartamento] = useState('')
  const [filterMunicipio, setFilterMunicipio] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingDocente, setEditingDocente] = useState(null)
  const [formData, setFormData] = useState({
    codigo_centro: '',
    codigo_docente: '',
    nombre_completo: '',
    dni: '',
    departamento: '',
    municipio: '',
    nombre_centro: '',
    email: '',
    celular: '',
    estado: 'activo'
  })

  // Estado para modal de confirmación
  const [modalConfirm, setModalConfirm] = useState({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false
  })

  useEffect(() => {
    cargarDocentes()
  }, [])

  const cargarDocentes = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('docentes')
        .select('*')
        .order('nombre_completo', { ascending: true })
      
      if (error) throw error
      
      setDocentes(data || [])
    } catch (error) {
      console.error('Error cargando docentes:', error)
      toast.error('Error al cargar docentes')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (docente) => {
    setEditingDocente(docente)
    setFormData({
      codigo_centro: docente.codigo_centro || '',
      codigo_docente: docente.codigo_docente || '',
      nombre_completo: docente.nombre_completo || '',
      dni: docente.dni || '',
      departamento: docente.departamento || '',
      municipio: docente.municipio || '',
      nombre_centro: docente.nombre_centro || '',
      email: docente.email || '',
      celular: docente.celular || '',
      estado: docente.estado || 'activo'
    })
    setShowModal(true)
  }

  const handleDelete = (docente) => {
    setModalConfirm({
      isOpen: true,
      type: 'danger',
      title: '¿Eliminar Docente?',
      message: `Se eliminará permanentemente a "${docente.nombre_completo}" y todas sus evaluaciones. Esta acción no se puede deshacer.`,
      onConfirm: () => confirmarEliminacion(docente.id),
      isLoading: false
    })
  }

  const confirmarEliminacion = async (id) => {
    try {
      setModalConfirm(prev => ({ ...prev, isLoading: true }))

      const { error } = await supabase
        .from('docentes')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Docente eliminado correctamente')
      setModalConfirm(prev => ({ ...prev, isOpen: false }))
      cargarDocentes()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar docente')
      setModalConfirm(prev => ({ ...prev, isLoading: false }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const toastId = toast.loading('Guardando cambios...')

    try {
      if (editingDocente) {
        const { error } = await supabase
          .from('docentes')
          .update(formData)
          .eq('id', editingDocente.id)

        if (error) throw error
        toast.success('Docente actualizado correctamente', { id: toastId })
      }

      setShowModal(false)
      setEditingDocente(null)
      cargarDocentes()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar docente', { id: toastId })
    }
  }

  const handleCambiarEstado = (docente) => {
    const nuevoEstado = docente.estado === 'activo' ? 'inactivo' : 'activo'
    
    setModalConfirm({
      isOpen: true,
      type: 'warning',
      title: `¿Cambiar estado a ${nuevoEstado}?`,
      message: `El docente "${docente.nombre_completo}" será marcado como ${nuevoEstado}.`,
      onConfirm: () => confirmarCambioEstado(docente.id, nuevoEstado),
      isLoading: false
    })
  }

  const confirmarCambioEstado = async (id, nuevoEstado) => {
    try {
      setModalConfirm(prev => ({ ...prev, isLoading: true }))

      const { error } = await supabase
        .from('docentes')
        .update({ estado: nuevoEstado })
        .eq('id', id)

      if (error) throw error

      toast.success(`Docente marcado como ${nuevoEstado}`)
      setModalConfirm(prev => ({ ...prev, isOpen: false }))
      cargarDocentes()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cambiar estado')
      setModalConfirm(prev => ({ ...prev, isLoading: false }))
    }
  }

  // Filtrar docentes
  const docentesFiltrados = docentes.filter(doc => {
    const matchSearch = 
      doc.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.dni?.includes(searchTerm) ||
      doc.codigo_docente?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchDepartamento = !filterDepartamento || doc.departamento === filterDepartamento
    const matchMunicipio = !filterMunicipio || doc.municipio === filterMunicipio

    return matchSearch && matchDepartamento && matchMunicipio
  })

  // Obtener departamentos únicos
  const departamentos = [...new Set(docentes.map(d => d.departamento).filter(Boolean))]
  const municipios = [...new Set(docentes
    .filter(d => !filterDepartamento || d.departamento === filterDepartamento)
    .map(d => d.municipio)
    .filter(Boolean)
  )]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Cargando docentes...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Gestión de Docentes</h2>
        <p className="text-gray-600">Total: {docentesFiltrados.length} docentes</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Buscar
            </label>
            <input
              type="text"
              placeholder="Nombre, DNI o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📍 Departamento
            </label>
            <select
              value={filterDepartamento}
              onChange={(e) => {
                setFilterDepartamento(e.target.value)
                setFilterMunicipio('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              {departamentos.map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏘️ Municipio
            </label>
            <select
              value={filterMunicipio}
              onChange={(e) => setFilterMunicipio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!filterDepartamento}
            >
              <option value="">Todos</option>
              {municipios.map(mun => (
                <option key={mun} value={mun}>{mun}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Docentes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Docente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DNI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Centro Educativo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {docentesFiltrados.map((docente) => (
                <tr key={docente.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {docente.codigo_docente}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{docente.nombre_completo}</div>
                    <div className="text-sm text-gray-500">{docente.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {docente.dni}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{docente.nombre_centro}</div>
                    <div className="text-sm text-gray-500">{docente.codigo_centro}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{docente.departamento}</div>
                    <div className="text-xs text-gray-400">{docente.municipio}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      docente.estado === 'activo' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {docente.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(docente)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleCambiarEstado(docente)}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      {docente.estado === 'activo' ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleDelete(docente)}
                      className="text-red-600 hover:text-red-900"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edición */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Editar Docente</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre_completo}
                    onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DNI *
                  </label>
                  <input
                    type="text"
                    value={formData.dni}
                    onChange={(e) => setFormData({...formData, dni: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código Docente
                  </label>
                  <input
                    type="text"
                    value={formData.codigo_docente}
                    onChange={(e) => setFormData({...formData, codigo_docente: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Celular
                  </label>
                  <input
                    type="text"
                    value={formData.celular}
                    onChange={(e) => setFormData({...formData, celular: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={formData.departamento}
                    onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Municipio
                  </label>
                  <input
                    type="text"
                    value={formData.municipio}
                    onChange={(e) => setFormData({...formData, municipio: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Centro
                  </label>
                  <input
                    type="text"
                    value={formData.nombre_centro}
                    onChange={(e) => setFormData({...formData, nombre_centro: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código Centro
                  </label>
                  <input
                    type="text"
                    value={formData.codigo_centro}
                    onChange={(e) => setFormData({...formData, codigo_centro: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingDocente(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      <ModalConfirmacion
        isOpen={modalConfirm.isOpen}
        onClose={() => setModalConfirm(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfirm.onConfirm}
        title={modalConfirm.title}
        message={modalConfirm.message}
        type={modalConfirm.type}
        isLoading={modalConfirm.isLoading}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />
    </div>
  )
}