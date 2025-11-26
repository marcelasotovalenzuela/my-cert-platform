// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight">
          Página no encontrada
        </h1>
        <p className="text-slate-300">
          No pudimos encontrar la página que estás buscando. Es posible que el
          enlace esté roto o que la ruta haya cambiado.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-emerald-400 transition"
          >
            Volver al inicio
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-900 transition"
          >
            Ir al ingreso de empresas
          </Link>
        </div>
      </div>
    </div>
  );
}
