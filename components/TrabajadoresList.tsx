'use client'

import { useState } from 'react'

function getCertStatus(fechaVencimiento: string) {
  const hoy = new Date()
  const vencimiento = new Date(fechaVencimiento)
  const diffMeses =
    (vencimiento.getFullYear() - hoy.getFullYear()) * 12 +
    (vencimiento.getMonth() - hoy.getMonth())

  if (diffMeses < 1) {
    return { label: 'Crítico', color: 'text-red-700', icon: '⚠️' }
  } else if (diffMeses < 3) {
    return { label: 'Atención', color: 'text-yellow-700', icon: '⏳' }
  } else {
    return { label: 'Vigente', color: 'text-green-700', icon: '✅' }
  }
}

export default function TrabajadoresList({
  trabajadores,
  onActualizar,
}: {
  trabajadores: any[]
  onActualizar: (id: number, campo: string, valor: any) => void
}) {
  const [editando, setEditando] = useState<number | null>(null)
  const [nuevoCentro, setNuevoCentro] = useState('')

  async function actualizarCentroTrabajo(id: number) {
    try {
      const res = await fetch('/api/trabajadores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, centroTrabajo: nuevoCentro }),
      })

      if (res.ok) {
        onActualizar(id, 'centroTrabajo', nuevoCentro) // 👉 actualiza estado en React
        setEditando(null)
      } else {
        alert('❌ Error al actualizar centro de trabajo')
      }
    } catch (err) {
      console.error(err)
      alert('❌ Error de conexión')
    }
  }

  return (
    <div>
      <h3 className="mt-2 text-lg font-medium">Trabajadores</h3>
      {trabajadores.length === 0 ? (
        <p className="text-gray-500">No hay trabajadores registrados</p>
      ) : (
        <ul className="list-disc list-inside">
          {trabajadores.map((trabajador) => (
            <li key={trabajador.id} className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong>
                    {trabajador.nombre} {trabajador.apellido}
                  </strong>
                  <div className="text-sm text-gray-600">
                    Centro de trabajo:{' '}
                    {editando === trabajador.id ? (
                      <span>
                        <input
                          type="text"
                          value={nuevoCentro}
                          onChange={(e) => setNuevoCentro(e.target.value)}
                          className="border px-2 py-1 rounded mr-2"
                        />
                        <button
                          onClick={() => actualizarCentroTrabajo(trabajador.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded mr-2"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditando(null)}
                          className="px-3 py-1 bg-gray-400 text-white rounded"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <span>
                        {trabajador.centroTrabajo || 'No definido'}{' '}
                        <button
                          onClick={() => {
                            setEditando(trabajador.id)
                            setNuevoCentro(trabajador.centroTrabajo || '')
                          }}
                          className="ml-2 text-blue-600 underline"
                        >
                          Editar
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Certificaciones */}
              <ul className="ml-6 list-square mt-2">
                {trabajador.certificaciones.map((cert: any) => {
                  const status = getCertStatus(cert.fechaVencimiento)
                  return (
                    <li key={cert.id} className={`${status.color} font-medium`}>
                      {status.icon} {cert.curso} — vence el{' '}
                      {new Date(cert.fechaVencimiento).toLocaleDateString()} (
                      {status.label})
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
