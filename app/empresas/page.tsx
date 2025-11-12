"use client"

import { useState, useEffect, useMemo, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import CertificacionesTable from "./components/CertificacionesTable"

// Tipos derivados del prop real del componente para evitar colisiones
type TableCertArray = Parameters<typeof CertificacionesTable>[0]["certificaciones"];
type TableCert = TableCertArray extends (infer U)[] ? U : never;

// ===== Tipos mínimos para eliminar `any` sin cambiar lógica =====
type CertificacionBase = {
  id?: number
  curso: string
  fechaEmision?: string
  fechaVencimiento: string
}

type Certificacion = CertificacionBase & {
  trabajador: {
    id: number
    nombre: string
    apellido?: string | null
    centroTrabajo?: string | null
  }
}

type Trabajador = {
  id: number
  nombre: string
  apellido?: string | null
  centroTrabajo?: string | null
  certificaciones?: CertificacionBase[]
}

type Empresa = {
  id: number
  nombre: string
  rut?: string | null
  email?: string
  trabajadores?: Trabajador[]
}

// 🔹 Normaliza fechas a ISO string
function toISO(v: unknown): string {
  if (typeof v === "string") return v
  if (v instanceof Date) return v.toISOString()
  return ""
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
  const dueUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((dueUTC - todayUTC) / (1000 * 60 * 60 * 24));
}

// 🔹 Estado por regla: < 1 mes => crítica, < 3 meses => atención, resto vigente
function getCertStatus(fechaVencimiento: string) {
  const dias = daysUntil(fechaVencimiento);
  if (dias < 30) {
    return { label: "criticas", color: "text-red-700", icon: "⚠️" };
  }
  if (dias < 90) {
    return { label: "atencion", color: "text-yellow-700", icon: "⏳" };
  }
  return { label: "vigentes", color: "text-green-700", icon: "✅" };
}

// 🔹 Stats globales
function getDashboardStats(certificaciones: Certificacion[]) {
  let critico = 0,
    atencion = 0,
    vigente = 0
  certificaciones.forEach((cert) => {
    const fv = cert.fechaVencimiento
    if (!fv) {
      vigente++
      return
    }
    const status = getCertStatus(fv)
    if (status.label === "criticas") critico++
    else if (status.label === "atencion") atencion++
    else vigente++
  })
  return { critico, atencion, vigente, total: certificaciones.length }
}

function EmpresasPageInner() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [certificaciones, setCertificaciones] = useState<Certificacion[]>([])
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<"criticas" | "atencion" | "vigentes" | "all">("all")

  const isActive = (k: "all" | "criticas" | "atencion" | "vigentes") =>
    filter === k ? "ring-2 ring-offset-2 ring-blue-400" : "";

  const searchParams = useSearchParams()
  const empresaId = searchParams.get("empresaId")

  const [empresaIdNum, setEmpresaIdNum] = useState<number | null>(null)
  const [empresaEmail, setEmpresaEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const idNum = empresaId && /^\d+$/.test(empresaId) ? Number(empresaId) : null
    setEmpresaIdNum(idNum)

    if (!idNum) {
      try {
        const raw = localStorage.getItem("empresaUser")
        if (raw) {
          const u = JSON.parse(raw)
          if (u?.email) setEmpresaEmail(String(u.email).trim().toLowerCase())
        }
      } catch {
        // ignore JSON/localStorage errors
      }
    } else {
      setEmpresaEmail(null)
    }
  }, [empresaId])

  // 🔹 Fetch empresa y certificaciones
  useEffect(() => {
    const controller = new AbortController();
    async function fetchEmpresa() {
      setLoading(true)
      setError("")
      setEmpresa(null)
      setCertificaciones([])

      if (!empresaIdNum && !empresaEmail) {
        // Sin identificador aún: no llamamos a la API
        setLoading(false)
        return
      }

      const qs = empresaIdNum
        ? `id=${empresaIdNum}`
        : `email=${encodeURIComponent(empresaEmail as string)}`

      try {
        const res = await fetch(`/api/empresas?${qs}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        })
        const ct = res.headers.get("content-type") || ""
        const data = ct.includes("application/json") ? await res.json() : { ok: false, error: await res.text() }

        if (!res.ok || !data.ok) {
          setError(data.error || `Error al obtener la empresa`)
          return
        }

        const emp: Empresa = data.empresa
        setEmpresa(emp)

        // Aplanamos certificaciones con guardas
        const listaCerts: Certificacion[] = (emp?.trabajadores ?? []).flatMap((t: Trabajador) =>
          (t?.certificaciones ?? []).map((c: CertificacionBase) => ({
            ...c,
            trabajador: {
              id: t.id,
              nombre: t.nombre,
              apellido: t.apellido ?? null,
              centroTrabajo: t.centroTrabajo ?? null,
            },
          }))
        )
        setCertificaciones(listaCerts)
      } catch (err) {
        console.error(err)
        setError("Error de conexión con el servidor")
      } finally {
        setLoading(false)
      }
    }
    fetchEmpresa()
    return () => controller.abort()
  }, [empresaIdNum, empresaEmail])

  const solicitarRecertificacion = useCallback(async (trabajadorId: number, nombre: string) => {
    try {
      const res = await fetch("/api/recertificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trabajadorId,
          nombre: `Recertificación de ${nombre}`,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      alert("✅ Recertificación solicitada con éxito")
    } catch (e) {
      console.error(e)
      alert("❌ Error al solicitar la recertificación")
    }
  }, [])

  const certificacionesForTable: TableCertArray = useMemo(() => {
    return (certificaciones ?? []).map((c): TableCert => {
      const fechaEmisionISO = toISO((c as { fechaEmision?: unknown }).fechaEmision)
      const fechaVencimientoISO = toISO((c as { fechaVencimiento?: unknown }).fechaVencimiento)

      return {
        id: Number((c as { id?: unknown }).id ?? 0),
        curso: String((c as { curso?: unknown }).curso ?? ""),
        fechaEmision: fechaEmisionISO,
        fechaVencimiento: fechaVencimientoISO,
        trabajador: {
          id: Number((c as { trabajador: { id: number } }).trabajador.id),
          nombre: String((c as { trabajador: { nombre: string } }).trabajador.nombre ?? ""),
          apellido: ((c as { trabajador: { apellido?: string | null } }).trabajador.apellido) ?? "",
          centroTrabajo: ((c as { trabajador: { centroTrabajo?: string | null } }).trabajador.centroTrabajo) ?? null,
        },
      } as TableCert
    })
  }, [certificaciones])

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6">Panel de Empresa</h1>

      {error && <p className="text-red-600">{error}</p>}
      <div className="sr-only" aria-live="polite">{loading ? "Cargando" : "Listo"}</div>

      {loading && !empresa ? (
        <p className="text-gray-500" aria-live="polite">Cargando datos de la empresa...</p>
      ) : !empresa ? (
        <p className="text-gray-500">Selecciona una empresa para ver sus datos.</p>
      ) : (
        <>
          {/* Datos de la empresa */}
          <div className="border rounded-lg p-4 shadow mb-6">
            <h2 className="text-xl font-semibold">{empresa.nombre}</h2>
            <p className="text-gray-600">RUT: {empresa.rut}</p>
            <p className="text-gray-600">Email: {empresa.email}</p>
          </div>

          {/* Dashboard */}
          {(() => {
            const stats = getDashboardStats(certificaciones)
            return (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`p-4 rounded-lg shadow bg-blue-100 text-blue-700 font-bold text-center hover:bg-blue-200 transition ${isActive("all")}`}
                  aria-pressed={filter === "all"}
                >
                  📜 Certificaciones <br /> {stats.total}
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("criticas")}
                  className={`p-4 rounded-lg shadow bg-red-100 text-red-700 font-bold text-center hover:bg-red-200 transition ${isActive("criticas")}`}
                  aria-pressed={filter === "criticas"}
                >
                  ⚠️ Críticas <br /> {stats.critico}
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("atencion")}
                  className={`p-4 rounded-lg shadow bg-yellow-100 text-yellow-700 font-bold text-center hover:bg-yellow-200 transition ${isActive("atencion")}`}
                  aria-pressed={filter === "atencion"}
                >
                  ⏳ Atención <br /> {stats.atencion}
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("vigentes")}
                  className={`p-4 rounded-lg shadow bg-green-100 text-green-700 font-bold text-center hover:bg-green-200 transition ${isActive("vigentes")}`}
                  aria-pressed={filter === "vigentes"}
                >
                  ✅ Vigentes <br /> {stats.vigente}
                </button>
              </div>
            )
          })()}

          <div className="mb-2 text-sm text-gray-600">
            Filtro activo: <strong>{filter === "all" ? "todas" : filter}</strong>
          </div>

          {/* Tabla de certificaciones */}
          <CertificacionesTable
            certificaciones={certificacionesForTable}
            empresaId={empresa?.id ?? empresaIdNum ?? 0}
            empresaNombre={empresa?.nombre ?? ""}
            empresaRut={empresa?.rut ?? ""}
            solicitarRecertificacion={solicitarRecertificacion}
            filter={filter}
          />
        </>
      )}
    </main>
  )
}

export default function EmpresasPage() {
  return (
    <Suspense fallback={<main className="p-6"><p className="text-gray-500">Cargando panel...</p></main>}>
      <EmpresasPageInner />
    </Suspense>
  );
}
