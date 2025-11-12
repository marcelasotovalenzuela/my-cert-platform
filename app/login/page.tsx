/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('empresaUser', JSON.stringify(data.user))
        localStorage.setItem('email', (data.user?.email ?? '').toString())
        window.location.href = "/empresas"
      } else {
        const err = await res.json()
        setError(err.error || 'Error en el inicio de sesión')
      }
    } catch (err) {
      console.error(err)
      setError('Error inesperado en el servidor')
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-blue-700">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-lg w-96 border-t-4 border-yellow-400"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Logo RYL Training" className="h-16" />
        </div>

        <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">
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
          className="w-full p-3 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
        >
          Ingresar
        </button>
      </form>
    </main>
  )
}
