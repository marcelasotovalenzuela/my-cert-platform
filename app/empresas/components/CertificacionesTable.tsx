'use client'

import { useMemo, useState } from 'react'
import { ArrowUpDown, FileText, RefreshCcw } from 'lucide-react'

type Certificacion = {
  id: number
  curso: string
  fechaVencimiento: string
  trabajador: {
    id: number
    nombre: string
    apellido: string
    centroTrabajo: string
  }
}

type Props = {
  certificaciones: Certificacion[]
  empresaId: number
  empresaNombre: string
  empresaRut: string
  solicitarRecertificacion: (trabajadorId: number, nombre: string) => void,
  filter?: "all" | "criticas" | "atencion" | "vigentes"
}

// 🔹 Días “seguros” (UTC) hasta la fecha de vencimiento
function daysUntil(dateISO: string) {
  if (!dateISO) return Infinity;
  const d = new Date(dateISO);
  if (isNaN(d.getTime())) return Infinity;
  const todayUTC = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  );
  const dueUTC = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate()
  );
  return Math.floor((dueUTC - todayUTC) / (1000 * 60 * 60 * 24));
}

// Estado de la certificación
function getCertStatus(fechaVencimiento: string) {
  const dias = daysUntil(fechaVencimiento);
  // < 30 días (o vencidas) → Crítico
  if (dias < 30) {
    return { label: 'Crítico', color: 'text-red-700', icon: '⚠️' };
  }
  // < 90 días → Atención
  if (dias < 90) {
    return { label: 'Atención', color: 'text-yellow-700', icon: '⏳' };
  }
  // ≥ 90 días → Vigente
  return { label: 'Vigente', color: 'text-green-700', icon: '✅' };
}

function estadoKeyFromLabel(label: string): "criticas" | "atencion" | "vigentes" | "all" {
  const l = label.toLowerCase();
  if (l.startsWith("crí") || l.startsWith("cri")) return "criticas";
  if (l.startsWith("ate")) return "atencion";
  if (l.startsWith("vig")) return "vigentes";
  return "all";
}

export default function CertificacionesTable({
  certificaciones,
  empresaId,
  empresaNombre,
  empresaRut,
  solicitarRecertificacion,
  filter = "all",
}: Props) {
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroCurso, setFiltroCurso] = useState('')
  const [filtroCT, setFiltroCT] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [ordenCampo, setOrdenCampo] = useState<string | null>(null)
  const [ordenAsc, setOrdenAsc] = useState(true)
  const [exportando, setExportando] = useState(false)

  // Filtrado + ordenamiento
  const certsFiltradas = useMemo(() => {
    let lista = certificaciones.filter((c) => {
      const trabajador = `${c.trabajador.nombre} ${c.trabajador.apellido}`.toLowerCase()
      const status = getCertStatus(c.fechaVencimiento)

      const pasaFiltrosLocales =
        (!filtroNombre || trabajador.includes(filtroNombre.toLowerCase())) &&
        (!filtroCurso || c.curso.toLowerCase().includes(filtroCurso.toLowerCase())) &&
        (!filtroCT || (c.trabajador.centroTrabajo || '').toLowerCase().includes(filtroCT.toLowerCase())) &&
        (!filtroEstado || status.label.toLowerCase() === filtroEstado.toLowerCase())

      const pasaFiltroPadre = filter === "all" ? true : estadoKeyFromLabel(status.label) === filter;

      return pasaFiltrosLocales && pasaFiltroPadre
    })

    if (ordenCampo) {
      lista = [...lista].sort((a, b) => {
        let valA: string | number | undefined, valB: string | number | undefined
        if (ordenCampo === 'curso') {
          valA = a.curso
          valB = b.curso
        } else if (ordenCampo === 'vence') {
          valA = new Date(a.fechaVencimiento).getTime()
          valB = new Date(b.fechaVencimiento).getTime()
        } else if (ordenCampo === 'estado') {
          valA = getCertStatus(a.fechaVencimiento).label
          valB = getCertStatus(b.fechaVencimiento).label
        } else if (ordenCampo === 'trabajador') {
          valA = `${a.trabajador.nombre} ${a.trabajador.apellido}`
          valB = `${b.trabajador.nombre} ${b.trabajador.apellido}`
        } else if (ordenCampo === 'ct') {
          valA = a.trabajador.centroTrabajo || ''
          valB = b.trabajador.centroTrabajo || ''
        }
        const comp =
          ordenCampo === 'vence'
            ? (valA as number) - (valB as number)
            : String(valA).localeCompare(String(valB), 'es', { sensitivity: 'base' })
        return ordenAsc ? comp : -comp
      })
    }

    return lista
  }, [certificaciones, filtroNombre, filtroCurso, filtroCT, filtroEstado, ordenCampo, ordenAsc, filter])

  // Exportar PDF
  async function exportarPDF() {
    try {
      setExportando(true)
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          empresaNombre: empresaNombre || "N/A",
          empresaRut: empresaRut || "N/A",
          certificaciones: certsFiltradas.map(c => ({
            id: c.id,
            curso: c.curso,
            fechaVencimiento: new Date(c.fechaVencimiento).toISOString(),
            trabajador: {
              id: c.trabajador.id,
              nombre: c.trabajador.nombre,
              apellido: c.trabajador.apellido,
              centroTrabajo: c.trabajador.centroTrabajo,
            },
          })),
        }),
      })

      if (!res.ok) throw new Error('Error al generar PDF')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificaciones_${empresaNombre || 'empresa'}_${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('❌ No se pudo exportar el PDF')
    } finally {
      setExportando(false)
    }
  }

  function renderSortButton(campo: string) {
    return (
      <button
        onClick={() => {
          if (ordenCampo === campo) setOrdenAsc(!ordenAsc)
          else {
            setOrdenCampo(campo)
            setOrdenAsc(true)
          }
        }}
        className="inline-flex items-center ml-1 text-gray-500 hover:text-black"
        title="Ordenar"
        type="button"
      >
        <ArrowUpDown size={14} />
      </button>
    )
  }

  return (
    <div className="border rounded-lg p-4 shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        <h3 className="text-lg font-medium">📜 Certificaciones</h3>
        <button
          onClick={exportarPDF}
          disabled={exportando}
          className={`px-4 py-2 text-white rounded ${
            exportando ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {exportando ? 'Generando...' : '📄 Exportar PDF'}
        </button>
      </div>

      {/* Filtros locales */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <input
          type="text"
          placeholder="Filtrar por nombre"
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
          className="px-2 py-1 border rounded"
        />
        <input
          type="text"
          placeholder="Filtrar por curso"
          value={filtroCurso}
          onChange={(e) => setFiltroCurso(e.target.value)}
          className="px-2 py-1 border rounded"
        />
        <input
          type="text"
          placeholder="Filtrar por CT"
          value={filtroCT}
          onChange={(e) => setFiltroCT(e.target.value)}
          className="px-2 py-1 border rounded"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          <option value="">Filtrar por estado</option>
          <option value="Crítico">Crítico</option>
          <option value="Atención">Atención</option>
          <option value="Vigente">Vigente</option>
        </select>
      </div>

      {/* Tabla */}
      {certsFiltradas.length === 0 ? (
        <p className="text-gray-500">No hay certificaciones que coincidan</p>
      ) : (
        <table className="w-full border border-gray-300 text-sm">
          <thead className="bg-blue-100">
            <tr>
              <th className="px-3 py-2 border text-left">
                Curso {renderSortButton('curso')}
              </th>
              <th className="px-3 py-2 border text-left">
                Vence {renderSortButton('vence')}
              </th>
              <th className="px-3 py-2 border text-left">
                Estado {renderSortButton('estado')}
              </th>
              <th className="px-3 py-2 border text-left">
                Trabajador {renderSortButton('trabajador')}
              </th>
              <th className="px-3 py-2 border text-center">
                CT {renderSortButton('ct')}
              </th>
              <th className="px-3 py-2 border text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {certsFiltradas.map((cert) => {
              const status = getCertStatus(cert.fechaVencimiento)
              return (
                <tr key={cert.id}>
                  <td className="px-3 py-2 border">{cert.curso}</td>
                  <td className="px-3 py-2 border">
                    {new Date(cert.fechaVencimiento).toLocaleDateString()}
                  </td>
                  <td className={`px-3 py-2 border ${status.color}`}>
                    {status.icon} {status.label}
                  </td>
                  <td className="px-3 py-2 border">
                    {cert.trabajador.nombre} {cert.trabajador.apellido}
                  </td>
                  <td className="px-3 py-2 border text-center">
                    {cert.trabajador.centroTrabajo || '—'}
                  </td>
                  <td className="px-3 py-2 border text-center">
                    <div className="flex gap-6 justify-center">
                      {/* 🎫 Ver credencial */}
                      <div className="relative group">
                        <button
                          onClick={() => window.open(`/api/credencial/${cert.trabajador.id}`, '_blank')}
                          className="p-1"
                        >
                          <FileText className="w-5 h-5 text-purple-600" /> {/* Icono morado para diferenciar */}
                        </button>
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 
                          bg-black text-white text-xs px-2 py-1 rounded
                          opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                          Ver credencial
                        </span>
                      </div>

                      {/* 📄 Ver diploma */}
                      <div className="relative group">
                        <button
                          onClick={() => window.open(`/api/diploma/${cert.id}`, '_blank')}
                          className="p-1"
                        >
                          <FileText className="w-5 h-5 text-green-600" />
                        </button>
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 
                          bg-black text-white text-xs px-2 py-1 rounded
                          opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                          Ver diploma
                        </span>
                      </div>

                      {/* 🔄 Pedir recertificación */}
                      <div className="relative group">
                        <button
                          onClick={() => solicitarRecertificacion(cert.trabajador.id, cert.curso)}
                          className="p-1"
                        >
                          <RefreshCcw className="w-5 h-5 text-orange-600" />
                        </button>
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 
                          bg-black text-white text-xs px-2 py-1 rounded
                          opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                          Pedir recertificación
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
