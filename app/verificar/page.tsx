"use client"

import { useState } from "react"

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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      <div className="mb-8">
        <img src="/logo.png" alt="R&L Training Logo" className="h-20 mx-auto" />
      </div>

      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">
          Verificar Documento
        </h1>

        <form onSubmit={handleVerificar} className="space-y-4">
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ingresa el código de verificación (ej: VERIF-AB12CD34)"
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
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
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-center text-green-700 mb-4">
              ✅ Documento válido
            </h2>
            <div className="text-gray-800 space-y-2 text-left">
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
      </div>
    </main>
  )
}
