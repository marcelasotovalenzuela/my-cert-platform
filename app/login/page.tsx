/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ✅ Al cargar, leer email guardado en localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('email')
    if (savedEmail) {
      setEmail(savedEmail)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      // Intentar parsear JSON de forma segura
      let data: any = null
      try {
        data = await res.json()
      } catch (parseErr) {
        console.error('Error parseando respuesta de /api/login:', parseErr)
      }

      if (res.ok && data?.user) {
        localStorage.setItem('empresaUser', JSON.stringify(data.user))
        localStorage.setItem('email', (data.user?.email ?? '').toString())
        window.location.href = '/empresas'
      } else {
        const message = data?.error || 'Error en el inicio de sesión'
        setError(message)
      }
    } catch (err) {
      console.error(err)
      setError('Error inesperado en el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border border-slate-200"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Logo RYL Training" className="h-16" />
        </div>

        <h1 className="text-xl font-semibold text-slate-800 text-center mb-6">
          Ingreso Empresas
        </h1>

        {error && (
          <p className="text-red-600 text-center mb-4 font-medium">{error}</p>
        )}

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 mb-4 text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 mb-6 text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="text-center text-sm text-slate-500 mt-4">
          ¿Olvidaste tu contraseña? <a href="mailto:contacto@ryltraining.cl" className="text-blue-600 hover:underline">contacto@ryltraining.cl</a>
        </p>
      </form>
    </main>
  )
}
