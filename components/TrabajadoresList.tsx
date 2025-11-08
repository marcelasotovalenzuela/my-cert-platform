'use client'

type Certificacion = { id: number; curso: string; fechaVencimiento: string }
type Trabajador = {
  id: number
  nombre: string
  apellido?: string | null
  centroTrabajo?: string | null
  certificaciones: Certificacion[]
}

type Props = {
  trabajadores: Trabajador[]
  onVerCertificaciones: (trabajadorId: number) => void
}

/** Estado por certificación (mismo criterio que usamos en el panel) */
function getCertStatus(fechaVencimiento: string): 'critico' | 'atencion' | 'vigente' {
  const hoy = new Date()
  const v = new Date(fechaVencimiento)
  const diffMeses = (v.getFullYear() - hoy.getFullYear()) * 12 + (v.getMonth() - hoy.getMonth())
  if (diffMeses < 1) return 'critico'
  if (diffMeses < 3) return 'atencion'
  return 'vigente'
}

/** Resumen de estados para mostrar iconos por trabajador */
function resumenEstados(certificaciones: Certificacion[]) {
  let critico = 0, atencion = 0, vigente = 0
  for (const c of certificaciones) {
    const s = getCertStatus(c.fechaVencimiento)
    if (s === 'critico') critico++
    else if (s === 'atencion') atencion++
    else vigente++
  }
  return { critico, atencion, vigente }
}

export default function TrabajadoresList({ trabajadores, onVerCertificaciones }: Props) {
  if (!Array.isArray(trabajadores) || trabajadores.length === 0) {
    return <p className="text-gray-500">No hay trabajadores</p>
  }

  return (
    <div className="border rounded-lg p-4 shadow">
      <h3 className="text-lg font-medium mb-2">Trabajadores</h3>
      <ul className="divide-y">
        {trabajadores.map((t: Trabajador) => {
          const { critico, atencion, vigente } = resumenEstados(t.certificaciones)
          return (
            <li key={t.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {t.nombre} {t.apellido || ''}
                </div>
                <div className="text-sm text-gray-600">
                  CT: {t.centroTrabajo || '—'} · Certificaciones: {t.certificaciones.length}
                </div>
                {/* ICONOS DE ESTADO (agregado, sin romper nada) */}
                <div className="text-sm mt-1">
                  <span className="text-red-700 mr-3">⚠️ {critico}</span>
                  <span className="text-yellow-700 mr-3">⏳ {atencion}</span>
                  <span className="text-green-700">✅ {vigente}</span>
                </div>
              </div>
              <button
                onClick={() => onVerCertificaciones(t.id)}
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Ver
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
