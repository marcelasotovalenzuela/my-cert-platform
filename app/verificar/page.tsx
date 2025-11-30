"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

type ResultadoVerificacion = {
  curso: string
  trabajador: string
  rut: string
  fechaVencimiento: string
  centroTrabajo?: string | null
}

// Tipo mínimo de la respuesta esperada del API
type ApiVerificacion =
  | (ResultadoVerificacion & { error?: undefined })
  | { error: string }

export default function VerificarPage() {
  const [codigo, setCodigo] = useState("")
  const [resultado, setResultado] = useState<ResultadoVerificacion | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Prefill from URL (?codigo=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const codigoURL = params.get("codigo");
    if (codigoURL) {
      setCodigo(codigoURL);
    }
  }, []);

  const handleVerificar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResultado(null)
    setLoading(true)

    try {
      const codigoTrimmed = codigo.trim().toUpperCase()
      const res = await fetch(`/api/verificar/${encodeURIComponent(codigoTrimmed)}`)

      // Evita `any` y maneja respuestas no-JSON
      const contentType = res.headers.get("content-type") || ""
      const data: ApiVerificacion = contentType.includes("application/json")
        ? ((await res.json()) as ApiVerificacion)
        : { error: await res.text() }

      if (!res.ok) {
        if (res.status === 404) {
          setError(`❌ Documento inválido: el código "${codigoTrimmed}" no existe o expiró.`)
        } else {
          setError(("error" in data && data.error) || "Error en la verificación")
        }
        return
      }

      setResultado({
        curso: (data as ResultadoVerificacion).curso,
        trabajador: (data as ResultadoVerificacion).trabajador,
        rut: (data as ResultadoVerificacion).rut,
        fechaVencimiento: (data as ResultadoVerificacion).fechaVencimiento,
        centroTrabajo: (data as ResultadoVerificacion).centroTrabajo ?? null,
      })
    } catch {
      setError("⚠️ Error al verificar el documento. Inténtalo nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6">
      <div className="mb-8">
        <Image
          src="/logo.png"
          alt="R&L Training Logo"
          width={160}
          height={80}
          className="mx-auto h-20 w-auto"
          priority
        />
      </div>

      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-lg w-full border border-slate-200">
        <h1 className="text-2xl font-semibold text-center text-blue-900 mb-2">
          Verificar documento
        </h1>
        <p className="text-sm text-center text-slate-500 mb-6">
          Ingresa el código único del diploma o credencial para validar su vigencia.
        </p>

        <form onSubmit={handleVerificar} className="space-y-4">
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ingresa el código de verificación (ej: VERIF-AB12CD34)"
            className="w-full p-3 rounded-lg border border-blue-300 bg-white placeholder-slate-500 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            {loading ? "Verificando..." : "Verificar"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-center font-semibold text-red-600">
            {error}
          </p>
        )}

        {resultado && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
            <h2 className="text-lg font-semibold text-emerald-800 flex items-center gap-2 mb-3">
              <span>Documento válido</span>
              <span className="text-emerald-500">✔</span>
            </h2>
            <div className="text-gray-800 space-y-2 text-sm">
              <p><span className="font-semibold">A nombre de:</span> {resultado.trabajador}</p>
              <p><span className="font-semibold">RUT:</span> {resultado.rut}</p>
              {resultado.centroTrabajo && (
                <p><span className="font-semibold">Centro de Trabajo:</span> {resultado.centroTrabajo}</p>
              )}
              <p><span className="font-semibold">Curso:</span> {resultado.curso}</p>
              <p>
                <span className="font-semibold">Vigente hasta:</span>{" "}
                {new Date(resultado.fechaVencimiento).toLocaleDateString("es-CL")}
              </p>
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-center text-slate-400">
          ¿Tienes dudas sobre este documento?{" "}
          <a
            href="mailto:contacto@ryltraining.cl"
            className="text-blue-600 hover:underline"
          >
            contacto@ryltraining.cl
          </a>
        </p>
      </div>
    </main>
  )
}
