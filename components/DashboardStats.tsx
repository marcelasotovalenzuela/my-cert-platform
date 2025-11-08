// components/DashboardStats.tsx
'use client'

// Tipos mínimos para eliminar `any` sin alterar la lógica
type Certificacion = {
  fechaVencimiento: string
}

type Trabajador = {
  certificaciones: Certificacion[]
}

type Empresa = {
  trabajadores: Trabajador[]
}

function getCertStatus(
  fechaVencimiento: string
): { label: 'Crítico' | 'Atención' | 'Vigente' } {
  const hoy = new Date()
  const vencimiento = new Date(fechaVencimiento)
  const diffMeses =
    (vencimiento.getFullYear() - hoy.getFullYear()) * 12 +
    (vencimiento.getMonth() - hoy.getMonth())

  if (diffMeses < 1) return { label: 'Crítico' }
  if (diffMeses < 3) return { label: 'Atención' }
  return { label: 'Vigente' }
}

function getDashboardStats(empresa: Empresa | null | undefined) {
  if (!empresa) return { critico: 0, atencion: 0, vigente: 0, trabajadores: 0 }

  let critico = 0,
    atencion = 0,
    vigente = 0

  empresa.trabajadores.forEach((trab: Trabajador) => {
    trab.certificaciones.forEach((cert: Certificacion) => {
      const status = getCertStatus(cert.fechaVencimiento)
      if (status.label === 'Crítico') critico++
      else if (status.label === 'Atención') atencion++
      else vigente++
    })
  })

  return {
    critico,
    atencion,
    vigente,
    trabajadores: empresa.trabajadores.length,
  }
}

export default function DashboardStats({
  empresa,
}: {
  empresa: Empresa | null | undefined
}) {
  const stats = getDashboardStats(empresa)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
      <div className="p-4 rounded-lg shadow bg-blue-100 text-blue-700 font-bold text-center">
        👥 Trabajadores <br /> {stats.trabajadores}
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
  )
}
