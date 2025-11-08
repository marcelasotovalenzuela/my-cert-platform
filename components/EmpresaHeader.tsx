'use client'

type EmpresaHeaderProps = {
  nombre: string
  rut?: string | null
  email?: string | null
  onExportPdf?: () => void
}

export default function EmpresaHeader({ nombre, rut, email, onExportPdf }: EmpresaHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold">{nombre}</h2>
        <p className="text-gray-600">RUT: {rut || '—'} · {email || 'sin correo'}</p>
      </div>
      <button
        onClick={onExportPdf}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        📄 Exportar PDF
      </button>
    </div>
  )
}
