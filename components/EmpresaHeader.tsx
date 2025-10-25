// components/EmpresaHeader.tsx
export default function EmpresaHeader({ empresa }: { empresa: any }) {
  return (
    <div className="border rounded-lg p-4 shadow mb-6">
      <h2 className="text-xl font-semibold">{empresa.nombre}</h2>
      <p className="text-gray-600">RUT: {empresa.rut}</p>
      <p className="text-gray-600">Email: {empresa.email}</p>
    </div>
  )
}
