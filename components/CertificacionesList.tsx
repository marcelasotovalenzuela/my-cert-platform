'use client'

import { useState } from 'react'

// Tipos mínimos para eliminar `any` sin alterar la lógica
type Trabajador = {
  id: number
  nombre: string
  apellido?: string
  centroTrabajo?: string | null
}

type Certificacion = {
  id: number
  curso: string
  fechaVencimiento: string
  trabajador: Trabajador
}

// 🔹 Función para calcular estado de certificación
function getCertStatus(fechaVencimiento: string) {
  const hoy = new Date()
  const vencimiento = new Date(fechaVencimiento)
  const diffMeses =
    (vencimiento.getFullYear() - hoy.getFullYear()) * 12 +
    (vencimiento.getMonth() - hoy.getMonth())

  if (diffMeses < 1) return { label: 'Crítico', color: 'text-red-700', icon: '⚠️' }
  else if (diffMeses < 3) return { label: 'Atención', color: 'text-yellow-700', icon: '⏳' }
  else return { label: 'Vigente', color: 'text-green-700', icon: '✅' }
}

// 🔹 Función para obtener stats
function getDashboardStats(certificaciones: Certificacion[]) {
  let critico = 0, atencion = 0, vigente = 0
  certificaciones.forEach((cert: Certificacion) => {
    const status = getCertStatus(cert.fechaVencimiento)
    if (status.label === 'Crítico') critico++
    else if (status.label === 'Atención') atencion++
    else vigente++
  })
  return { critico, atencion, vigente, total: certificaciones.length }
}

export default function CertificacionesList({
  certificaciones,
  onRecertificar,
}: {
  certificaciones: Certificacion[]
  onRecertificar: (trabajadorId: number, nombre: string) => void
}) {
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroCurso, setFiltroCurso] = useState('')
  const [orden, setOrden] = useState('')

  function getCertificacionesFiltradas() {
    let lista: Certificacion[] = [...certificaciones]

    if (filtroNombre) {
      lista = lista.filter((c) =>
        `${c.trabajador.nombre} ${c.trabajador.apellido ?? ''}`
          .toLowerCase()
          .includes(filtroNombre.toLowerCase())
      )
    }
    if (filtroCurso) {
      lista = lista.filter((c) =>
        c.curso.toLowerCase().includes(filtroCurso.toLowerCase())
      )
    }
    if (orden === 'vence_antes') {
      lista.sort(
        (a, b) =>
          new Date(a.fechaVencimiento).getTime() -
          new Date(b.fechaVencimiento).getTime()
      )
    }
    if (orden === 'vence_despues') {
      lista.sort(
        (a, b) =>
          new Date(b.fechaVencimiento).getTime() -
          new Date(a.fechaVencimiento).getTime()
      )
    }
    return lista
  }

  const stats = getDashboardStats(certificaciones)

  return (
    <>
      {/* Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <div className="p-4 rounded-lg shadow bg-blue-100 text-blue-700 font-bold text-center">
          📜 Certificaciones <br /> {stats.total}
        </div>
        <div className="p-4 rounded-lg shadow bg-red-100 text-red-700 font-bold text-center">
          ⚠️ Críticas <br /> {stats.critico}
        </div>
        <div className="p-4 rounded-lg shadow bg-yellow-100 text-yellow-700 font-bold text-center">
          ⏳ Atención <br /> {stats.atencion}
        </div>
        <div className="p-4 rounded-lg shadow bg-green-100 text-green-700 font-bold text-center">
          ✅ Vigentes <br /> {stats.vigente}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Filtrar por nombre"
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
          className="px-4 py-2 border rounded"
        />
        <input
          type="text"
          placeholder="Filtrar por curso"
          value={filtroCurso}
          onChange={(e) => setFiltroCurso(e.target.value)}
          className="px-4 py-2 border rounded"
        />
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="">Ordenar por...</option>
          <option value="vence_antes">Vence más pronto</option>
          <option value="vence_despues">Vence más tarde</option>
        </select>
        <button
          onClick={() => {
            setFiltroNombre('')
            setFiltroCurso('')
            setOrden('')
          }}
          className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
        >
          Limpiar filtros
        </button>
      </div>

      {/* Lista de certificaciones */}
      <div className="border rounded-lg p-4 shadow">
        <h3 className="mt-2 text-lg font-medium">Certificaciones</h3>
        {getCertificacionesFiltradas().length === 0 ? (
          <p className="text-gray-500">No hay certificaciones que coincidan</p>
        ) : (
          <ul className="list-disc list-inside">
            {getCertificacionesFiltradas().map((cert: Certificacion) => {
              const status = getCertStatus(cert.fechaVencimiento)
              return (
                <li key={cert.id} className="mb-4">
                  <span className={`${status.color} font-medium`}>
                    {status.icon} {cert.curso} — vence el{' '}
                    {new Date(cert.fechaVencimiento).toLocaleDateString()} ({status.label})
                  </span>
                  <br />
                  <span className="text-gray-600">
                    👤 {cert.trabajador.nombre} {cert.trabajador.apellido ?? ''} — 🏢{' '}
                    {cert.trabajador.centroTrabajo || 'Sin centro asignado'}
                  </span>
                  <br />
                  <button
                    onClick={() =>
                      onRecertificar(cert.trabajador.id, cert.trabajador.nombre)
                    }
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Solicitar recertificación
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
