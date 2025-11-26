// app/error.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-red-400">
          Error interno del servidor
        </h1>
        <p className="text-slate-300">
          Ocurrió un problema inesperado al cargar la página. Ya estamos
          revisando este error.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-emerald-400 transition"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-900 transition"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
