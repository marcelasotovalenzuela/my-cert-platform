'use client'

type Certificacion = { id: number; curso: string; fechaVencimiento: string }
type Trabajador = {
  id: number
  nombre: string
  apellido?: string | null
  centroTrabajo?: string | null
  certificaciones: Certificacion[]
}
type Empresa = {
  id: number
  nombre: string
  rut?: string | null
  email?: string | null
  trabajadores: Trabajador[]
}

export default function EmpresaInfo({ empresa }: { empresa: Empresa | null }) {
  if (!empresa) return <p className="text-gray-500">No hay datos de la empresa</p>

  return (
    <div className="border rounded-lg p-4 shadow">
      <h3 className="text-lg font-semibold mb-2">Información de la empresa</h3>
      <p><strong>Nombre:</strong> {empresa.nombre}</p>
      <p><strong>RUT:</strong> {empresa.rut || '—'}</p>
      <p><strong>Correo:</strong> {empresa.email || '—'}</p>
      <p><strong>Trabajadores:</strong> {empresa.trabajadores.length}</p>
    </div>
  )
}
