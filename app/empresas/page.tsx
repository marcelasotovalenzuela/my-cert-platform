"use client";

import React, { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import { getDashboardStats, DashboardStats } from "@/lib/utils/dashboard";
import { getStatusInfo, StatusInfo } from "@/lib/utils/status";

type ApiCertificacion = {
  id: number;
  curso: string;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  informe_url?: string | null;
};

type ApiTrabajador = {
  id: number;
  nombre: string;
  apellido: string;
  rut?: string | null;              // 🔹 añadimos RUT del trabajador
  centroTrabajo: string | null;
  certificaciones: ApiCertificacion[];
};

type ApiEmpresa = {
  id: number;
  nombre: string;
  rut: string;
  email: string;
  trabajadores: ApiTrabajador[];
};

type ApiResponse = {
  ok: boolean;
  empresa?: ApiEmpresa;
  error?: string;
};

type Empresa = {
  id: number;
  nombre: string;
  rut: string;
  email: string;
};

type Certificacion = {
  id: number;
  curso: string;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  trabajadorId: number;
  trabajadorNombre: string;
  trabajadorApellido: string;
  trabajadorRut: string | null;     // 🔹 lo usamos para el PDF
  centroTrabajo: string | null;
  informe_url: string | null;
};

type FilterKey = "all" | "critico" | "atencion" | "vigente";

function formatFecha(value: string | null): string {
  if (!value) return "Sin fecha";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Fecha inválida";
  return d.toLocaleDateString("es-CL");
}

function buildStatusTooltip(fechaVencimiento: string | null): string {
  if (!fechaVencimiento) {
    return "Sin fecha de vencimiento registrada.";
  }

  const hoy = new Date();
  const fechaV = new Date(fechaVencimiento);

  // Normalizamos ambas fechas a medianoche para contar días completos
  hoy.setHours(0, 0, 0, 0);
  fechaV.setHours(0, 0, 0, 0);

  const diffMs = fechaV.getTime() - hoy.getTime();
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias > 0) {
    // Aún no vence
    if (diffDias === 1) {
      return "Vence en 1 día";
    }
    return `Vence en ${diffDias} días`;
  } else if (diffDias === 0) {
    return "Vence hoy";
  } else {
    // Ya venció
    const diasPasados = Math.abs(diffDias);
    if (diasPasados === 1) {
      return "Venció hace 1 día";
    }
    return `Venció hace ${diasPasados} días`;
  }
}

type SortKey = "curso" | "trabajador" | "centro" | "emision" | "vencimiento" | "estado";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 10;

// 🔹 Texto humano para el filtro que verá el PDF
function getFiltroLabel(filter: FilterKey): string {
  switch (filter) {
    case "critico":
      return "Críticas";
    case "atencion":
      return "En atención";
    case "vigente":
      return "Vigentes";
    default:
      return "Todas las certificaciones";
  }
}

function EmpresasPageInner() {
  const searchParams = useSearchParams();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [certificaciones, setCertificaciones] = useState<Certificacion[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [recertLoadingId, setRecertLoadingId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("curso");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const handleViewDiploma = (certId: number) => {
    window.open(`/api/diploma/${certId}`, "_blank", "noopener,noreferrer");
  };

  const handleViewCertificado = (informeUrl: string | null) => {
    if (!informeUrl) {
      alert("Esta certificación no tiene informe de certificación cargado aún.");
      return;
    }
    window.open(informeUrl, "_blank", "noopener,noreferrer");
  };

  const handleRecertificacion = async (certId: number) => {
    try {
      setRecertLoadingId(certId);
      const res = await fetch("/api/recertificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificacionId: certId }),
      });

      if (!res.ok) {
        console.error("Error al solicitar recertificación", await res.text());
        alert("No se pudo solicitar la recertificación.");
        return;
      }

      alert("Solicitud enviada correctamente.");
    } catch (e) {
      console.error("Error al solicitar recertificación", e);
      alert("Error solicitando recertificación.");
    } finally {
      setRecertLoadingId(null);
    }
  };

  // 🧾 Descargar PDF con filtro + RUT + etiqueta de filtro
  const handleDownloadPdf = async () => {
    if (!empresa) {
      alert("Primero debes cargar la empresa para exportar el PDF.");
      return;
    }

    try {
      const filtroLabel = getFiltroLabel(filter);

      const payload = {
        empresaNombre: empresa.nombre,
        empresaRut: empresa.rut,
        filtroLabel,
        certificaciones: certificacionesFiltradas.map((c) => ({
          curso: c.curso,
          fechaEmision: c.fechaEmision ?? "",
          fechaVencimiento: c.fechaVencimiento ?? "",
          trabajador: {
            nombre: c.trabajadorNombre ?? "",
            apellido: c.trabajadorApellido ?? "",
            rut: c.trabajadorRut ?? "",
            centroTrabajo: c.centroTrabajo ?? "",
          },
        })),
      };

      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Error al generar PDF:", await res.text());
        alert("No se pudo generar el PDF.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      const hoy = new Date().toISOString().slice(0, 10);
      const safeEmpresa = (empresa.nombre || "empresa").replace(/[^a-zA-Z0-9-_]+/g, "-");

      link.href = url;
      link.download = `certificaciones_${safeEmpresa}_${hoy}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error descargando PDF:", err);
      alert("Ocurrió un error al descargar el PDF.");
    }
  };

  const handleSort = (key: SortKey) => {
    // Si hacemos click en la misma columna, alternamos asc/desc.
    // Si cambiamos de columna, siempre partimos en asc.
    setSortDir((prevDir) => {
      if (sortKey === key) {
        return prevDir === "asc" ? "desc" : "asc";
      }
      return "asc";
    });
    setSortKey(key);
  };

  useEffect(() => {
    const auto = searchParams.get("autoFocus");
    if (!auto) return;
    const key = auto.toLowerCase();
    if (key === "criticos" || key === "critico") setFilter("critico");
    else if (key === "atencion") setFilter("atencion");
    else if (key === "vigentes" || key === "vigente") setFilter("vigente");
  }, [searchParams]);

  const loadEmpresa = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let email: string | null = null;

      // Siempre tomamos el correo desde localStorage (flujo estándar de login)
      if (typeof window !== "undefined") {
        email = window.localStorage.getItem("empresaEmail");
      }

      if (!email) {
        setError("No se encontró información de empresa para esta sesión.");
        setLoading(false);
        return;
      }

      const res = await fetch(
        `/api/empresas?email=${encodeURIComponent(email)}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        setError(`No se pudo cargar la empresa (${res.status}).`);
        setLoading(false);
        return;
      }

      const data: ApiResponse = await res.json();

      if (!data.ok || !data.empresa) {
        setError("No se encontró la empresa asociada a este usuario.");
        setLoading(false);
        return;
      }

      const apiEmpresa = data.empresa;

      const normalizada: Empresa = {
        id: apiEmpresa.id,
        nombre: apiEmpresa.nombre,
        rut: apiEmpresa.rut,
        email: apiEmpresa.email,
      };

      const todasCerts: Certificacion[] = [];

      apiEmpresa.trabajadores.forEach((t) => {
        t.certificaciones.forEach((c) => {
          todasCerts.push({
            id: c.id,
            curso: c.curso,
            fechaEmision: c.fechaEmision,
            fechaVencimiento: c.fechaVencimiento,
            trabajadorId: t.id,
            trabajadorNombre: t.nombre,
            trabajadorApellido: t.apellido,
            trabajadorRut: t.rut ?? null,     // 🔹 guardamos rut del backend
            centroTrabajo: t.centroTrabajo,
            informe_url: c.informe_url ?? null,
          });
        });
      });

      setEmpresa(normalizada);
      setCertificaciones(todasCerts);
    } catch (err) {
      console.error("Error cargando empresa", err);
      setError("Hubo un problema al cargar los datos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmpresa();
  }, [loadEmpresa]);

  useEffect(() => {
    setPage(1);
  }, [filter, searchTerm, sortKey, sortDir]);

  const stats: DashboardStats = useMemo(
    () => getDashboardStats(certificaciones),
    [certificaciones]
  );

  const certificacionesFiltradas = useMemo(() => {
    let base =
      filter === "all"
        ? certificaciones
        : certificaciones.filter((c) => getStatusInfo(c.fechaVencimiento).status === filter);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      base = base.filter((c) => {
        const nombreTrabajador = `${c.trabajadorNombre} ${c.trabajadorApellido}`.toLowerCase();
        const curso = (c.curso || "").toLowerCase();
        const centro = (c.centroTrabajo || "").toLowerCase();
        const rut = (c.trabajadorRut || "").toLowerCase();
        return (
          nombreTrabajador.includes(term) ||
          curso.includes(term) ||
          centro.includes(term) ||
          rut.includes(term)
        );
      });
    }

    const sorted = [...base].sort((a, b) => {
      let cmp = 0;

      if (sortKey === "curso") {
        cmp = (a.curso || "").localeCompare(b.curso || "", "es");
      } else if (sortKey === "trabajador") {
        const nameA = `${a.trabajadorNombre} ${a.trabajadorApellido}`.trim();
        const nameB = `${b.trabajadorNombre} ${b.trabajadorApellido}`.trim();
        cmp = nameA.localeCompare(nameB, "es");
      } else if (sortKey === "centro") {
        cmp = (a.centroTrabajo || "").localeCompare(b.centroTrabajo || "", "es");
      } else if (sortKey === "emision") {
        const da = a.fechaEmision ? new Date(a.fechaEmision).getTime() : 0;
        const db = b.fechaEmision ? new Date(b.fechaEmision).getTime() : 0;
        cmp = da - db;
      } else if (sortKey === "vencimiento") {
        const da = a.fechaVencimiento ? new Date(a.fechaVencimiento).getTime() : 0;
        const db = b.fechaVencimiento ? new Date(b.fechaVencimiento).getTime() : 0;
        cmp = da - db;
      } else if (sortKey === "estado") {
        const order: Record<StatusInfo["status"], number> = {
          critico: 0,
          atencion: 1,
          vigente: 2,
        };
        const sa = order[getStatusInfo(a.fechaVencimiento).status];
        const sb = order[getStatusInfo(b.fechaVencimiento).status];
        cmp = sa - sb;
      }

      if (cmp === 0) return 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [certificaciones, filter, sortKey, sortDir, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(certificacionesFiltradas.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const visibleCerts = certificacionesFiltradas.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 print:min-h-0 print:bg-white print:text-black">
      <header className="border-b border-sky-500 bg-white/95 backdrop-blur sticky top-0 z-10 print:static print:shadow-none print:border-slate-300 print:bg-white print:backdrop-blur-none">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="R&L Training" width={120} height={40} className="h-10 w-auto" priority />
            <div className="flex flex-col">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-sky-700">
                PANEL EMPRESA
              </span>
              <span className="text-sm font-semibold text-slate-900">Gestión y verificación de certificaciones</span>
            </div>
          </div>

          {empresa && (
            <div className="text-right text-xs text-slate-700">
              <div className="font-semibold">{empresa.nombre}</div>
              <div className="text-slate-500">RUT {empresa.rut}</div>
              <div className="text-slate-400">{empresa.email}</div>
            </div>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        {loading && (
          <div className="mb-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm">
            Cargando información de tu empresa…
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-red-500/60 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {empresa && certificaciones.length > 0 && (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`relative overflow-hidden rounded-xl border p-4 text-left shadow-sm transition print:p-2 print:shadow-none print:border-slate-300 ${
                  filter === "all"
                    ? [
                        "border-[2.5px] border-sky-700 bg-sky-50",
                        "shadow-lg ring-2 ring-sky-200/80",
                        "scale-[1.01]"
                      ].join(" ")
                    : "border-sky-300 bg-sky-50 hover:border-sky-400 hover:bg-sky-100/60"
                }`}
              >
                {filter === "all" && (
                  <span className="pointer-events-none absolute inset-y-2 left-0 w-1 rounded-r-full bg-sky-600 print:hidden" />
                )}
                <div className="text-xs uppercase tracking-wide text-slate-500">Total certificaciones</div>
                {filter === "all" && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 print:hidden">
                    Filtro activo
                  </span>
                )}
                <div className="mt-1 text-3xl font-semibold text-slate-900 print:text-lg">{stats.total}</div>
                <p className="mt-1 text-xs text-slate-400">Incluye vigentes, en atención y críticas.</p>
              </button>

              <button
                type="button"
                onClick={() => setFilter("critico")}
                className={`relative overflow-hidden rounded-xl border p-4 text-left shadow-sm transition print:p-2 print:shadow-none print:border-slate-300 ${
                  filter === "critico"
                    ? [
                        "border-[2.5px] border-red-700 bg-red-50",
                        "shadow-lg ring-2 ring-red-200/80",
                        "scale-[1.01]"
                      ].join(" ")
                    : "border-red-300 bg-red-50 hover:border-red-400 hover:bg-red-100/60"
                }`}
              >
                {filter === "critico" && (
                  <span className="pointer-events-none absolute inset-y-2 left-0 w-1 rounded-r-full bg-red-600 print:hidden" />
                )}
                <div className="text-xs uppercase tracking-wide text-red-600">Críticas</div>
                {filter === "critico" && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 print:hidden">
                    Filtro activo
                  </span>
                )}
                <div className="mt-1 text-3xl font-semibold text-red-700 print:text-lg">{stats.critico}</div>
                <p className="mt-1 text-xs text-red-700/80">Vencidas o con riesgo inmediato.</p>
              </button>

              <button
                type="button"
                onClick={() => setFilter("atencion")}
                className={`relative overflow-hidden rounded-xl border p-4 text-left shadow-sm transition print:p-2 print:shadow-none print:border-slate-300 ${
                  filter === "atencion"
                    ? [
                        "border-[2.5px] border-amber-700 bg-amber-50",
                        "shadow-lg ring-2 ring-amber-200/80",
                        "scale-[1.01]"
                      ].join(" ")
                    : "border-amber-300 bg-amber-50 hover:border-amber-400 hover:bg-amber-100/60"
                }`}
              >
                {filter === "atencion" && (
                  <span className="pointer-events-none absolute inset-y-2 left-0 w-1 rounded-r-full bg-amber-600 print:hidden" />
                )}
                <div className="text-xs uppercase tracking-wide text-amber-700">En atención</div>
                {filter === "atencion" && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 print:hidden">
                    Filtro activo
                  </span>
                )}
                <div className="mt-1 text-3xl font-semibold text-amber-800 print:text-lg">{stats.atencion}</div>
                <p className="mt-1 text-xs text-amber-700/80">Próximas a vencer (≤ 30 días).</p>
              </button>

              <button
                type="button"
                onClick={() => setFilter("vigente")}
                className={`relative overflow-hidden rounded-xl border p-4 text-left shadow-sm transition print:p-2 print:shadow-none print:border-slate-300 ${
                  filter === "vigente"
                    ? [
                        "border-[2.5px] border-emerald-700 bg-emerald-50",
                        "shadow-lg ring-2 ring-emerald-200/80",
                        "scale-[1.01]"
                      ].join(" ")
                    : "border-emerald-300 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100/60"
                }`}
              >
                {filter === "vigente" && (
                  <span className="pointer-events-none absolute inset-y-2 left-0 w-1 rounded-r-full bg-emerald-600 print:hidden" />
                )}
                <div className="text-xs uppercase tracking-wide text-emerald-700">Vigentes</div>
                {filter === "vigente" && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 print:hidden">
                    Filtro activo
                  </span>
                )}
                <div className="mt-1 text-3xl font-semibold text-emerald-800 print:text-lg">{stats.vigente}</div>
                <p className="mt-1 text-xs text-emerald-700/80">Certificaciones válidas y vigentes.</p>
              </button>
            </div>

            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              Certificaciones de tus trabajadores
            </h2>

            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full max-w-xs">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por curso, trabajador, RUT o centro de trabajo"
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] text-slate-800 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-medium text-slate-800 shadow-sm transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-800"
              >
                <span>Descargar vista en PDF</span>
              </button>
            </div>

            <div className="mt-2 overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/80 shadow-[0_1px_4px_rgba(0,0,0,0.06)] backdrop-blur-sm">
              <table className="w-full min-w-[900px] table-auto border-separate border-spacing-0 text-[13px]">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md text-slate-600 border-b border-slate-200 shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
                  <tr>
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-700 first:rounded-tl-3xl last:rounded-tr-3xl">
                      <button
                        type="button"
                        onClick={() => handleSort("curso")}
                        className={`flex items-center justify-start gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${sortKey === "curso" ? "bg-sky-50 text-sky-700 ring-1 ring-sky-300" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        <span>Curso</span>
                        <span className="text-[10px] leading-none text-slate-400">
                          {sortKey === "curso" && sortDir === "asc" ? (
                            <span className="text-sky-500">▲▼</span>
                          ) : sortKey === "curso" && sortDir === "desc" ? (
                            <span className="text-sky-500">▼▲</span>
                          ) : (
                            "▲▼"
                          )}
                        </span>
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-700 first:rounded-tl-3xl last:rounded-tr-3xl">
                      <button
                        type="button"
                        onClick={() => handleSort("trabajador")}
                        className={`flex items-center justify-start gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${sortKey === "trabajador" ? "bg-sky-50 text-sky-700 ring-1 ring-sky-300" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        <span>Trabajador</span>
                        <span className="text-[10px] leading-none text-slate-400">
                          {sortKey === "trabajador" && sortDir === "asc" ? (
                            <span className="text-sky-500">▲▼</span>
                          ) : sortKey === "trabajador" && sortDir === "desc" ? (
                            <span className="text-sky-500">▼▲</span>
                          ) : (
                            "▲▼"
                          )}
                        </span>
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-700">
                      RUT
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-700 first:rounded-tl-3xl last:rounded-tr-3xl">
                      <button
                        type="button"
                        onClick={() => handleSort("centro")}
                        className={`flex items-center justify-start gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${sortKey === "centro" ? "bg-sky-50 text-sky-700 ring-1 ring-sky-300" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        <span>Centro de trabajo</span>
                        <span className="text-[10px] leading-none text-slate-400">
                          {sortKey === "centro" && sortDir === "asc" ? (
                            <span className="text-sky-500">▲▼</span>
                          ) : sortKey === "centro" && sortDir === "desc" ? (
                            <span className="text-sky-500">▼▲</span>
                          ) : (
                            "▲▼"
                          )}
                        </span>
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-center font-semibold text-slate-700 first:rounded-tl-3xl last:rounded-tr-3xl">
                      <button
                        type="button"
                        onClick={() => handleSort("emision")}
                        className={`flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${sortKey === "emision" ? "bg-sky-50 text-sky-700 ring-1 ring-sky-300" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        <span>Emisión</span>
                        <span className="text-[10px] leading-none text-slate-400">
                          {sortKey === "emision" && sortDir === "asc" ? (
                            <span className="text-sky-500">▲▼</span>
                          ) : sortKey === "emision" && sortDir === "desc" ? (
                            <span className="text-sky-500">▼▲</span>
                          ) : (
                            "▲▼"
                          )}
                        </span>
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-center font-semibold text-slate-700 first:rounded-tl-3xl last:rounded-tr-3xl">
                      <button
                        type="button"
                        onClick={() => handleSort("vencimiento")}
                        className={`flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${sortKey === "vencimiento" ? "bg-sky-50 text-sky-700 ring-1 ring-sky-300" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        <span>Vencimiento</span>
                        <span className="text-[10px] leading-none text-slate-400">
                          {sortKey === "vencimiento" && sortDir === "asc" ? (
                            <span className="text-sky-500">▲▼</span>
                          ) : sortKey === "vencimiento" && sortDir === "desc" ? (
                            <span className="text-sky-500">▼▲</span>
                          ) : (
                            "▲▼"
                          )}
                        </span>
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-center font-semibold text-slate-700 first:rounded-tl-3xl last:rounded-tr-3xl">
                      <button
                        type="button"
                        onClick={() => handleSort("estado")}
                        className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${sortKey === "estado" ? "bg-sky-50 text-sky-700 ring-1 ring-sky-300" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        <span>Estado</span>
                        <span className="text-[10px] leading-none text-slate-400">
                          {sortKey === "estado" && sortDir === "asc" ? (
                            <span className="text-sky-500">▲▼</span>
                          ) : sortKey === "estado" && sortDir === "desc" ? (
                            <span className="text-sky-500">▼▲</span>
                          ) : (
                            "▲▼"
                          )}
                        </span>
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-center font-semibold text-slate-700 first:rounded-tl-3xl last:rounded-tr-3xl text-[11px] uppercase tracking-wide">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCerts.map((cert) => {
                    const statusInfo: StatusInfo = getStatusInfo(cert.fechaVencimiento);
                    const isLoading = recertLoadingId === cert.id;
                    return (
                      <tr
                        key={cert.id}
                        className="hover:bg-slate-100/60 transition-colors border-b border-slate-100/50 odd:bg-white even:bg-slate-50/60"
                      >
                        <td className="px-4 py-3 text-slate-900">{cert.curso}</td>
                        <td className="px-4 py-3 text-slate-900">{`${cert.trabajadorNombre} ${cert.trabajadorApellido}`}</td>
                        <td className="px-4 py-3 text-slate-900">{cert.trabajadorRut || "-"}</td>
                        <td className="px-4 py-3 text-slate-900">{cert.centroTrabajo || "-"}</td>
                        <td className="px-4 py-3 text-slate-900 text-center">{formatFecha(cert.fechaEmision)}</td>
                        <td className="px-4 py-3 text-slate-900 text-center">{formatFecha(cert.fechaVencimiento)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="relative inline-block group">
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm whitespace-nowrap ${
                                statusInfo.status === "critico"
                                  ? "bg-red-100 text-red-700"
                                  : statusInfo.status === "atencion"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {statusInfo.status.charAt(0).toUpperCase() + statusInfo.status.slice(1)}
                            </span>

                            {/* Tooltip PRO estilo Apple */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-xs -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-normal text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.18)] ring-1 ring-black/5 opacity-0 transition group-hover:block group-hover:opacity-100">
                              <span className="block text-left">
                                {buildStatusTooltip(cert.fechaVencimiento)}
                              </span>
                              <span
                                className="pointer-events-none absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white"
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId((current) => (current === cert.id ? null : cert.id))
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
                              aria-haspopup="menu"
                              aria-expanded={openMenuId === cert.id}
                              title="Ver acciones"
                            >
                              <span className="sr-only">Ver acciones</span>
                              <span className="text-lg leading-none">⋯</span>
                            </button>

                            {openMenuId === cert.id && (
                              <div className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md border border-slate-200 bg-white py-1 text-left text-xs shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleViewDiploma(cert.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                                >
                                  Ver diploma
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleViewCertificado(cert.informe_url);
                                    setOpenMenuId(null);
                                  }}
                                  className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                                >
                                  Ver certificado
                                </button>
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={async () => {
                                    await handleRecertificacion(cert.id);
                                    setOpenMenuId(null);
                                  }}
                                  className={`block w-full px-3 py-2 text-left ${
                                    isLoading
                                      ? "cursor-not-allowed text-slate-400"
                                      : "text-emerald-700 hover:bg-emerald-50"
                                  }`}
                                >
                                  {isLoading ? "Enviando…" : "Solicitar recertificación"}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {certificacionesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">
                        No hay certificaciones para mostrar con el filtro seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-slate-600">
                <span>
                  Mostrando {visibleCerts.length} de {certificacionesFiltradas.length} certificaciones
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-40 hover:border-sky-400 hover:text-sky-700"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNumber = idx + 1;
                    const isActive = pageNumber === safePage;
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={`h-7 w-7 rounded-full text-xs font-medium transition flex items-center justify-center ${
                          isActive
                            ? "bg-sky-600 text-white shadow-sm"
                            : "bg-white text-slate-700 border border-slate-200 hover:border-sky-400 hover:text-sky-700"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-40 hover:border-sky-400 hover:text-sky-700"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {empresa && certificaciones.length === 0 && !loading && (
          <p className="text-center text-sm text-slate-600">No se encontraron certificaciones para esta empresa.</p>
        )}
      </section>
    </main>
  );
}

export default function EmpresasPage() {
  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <EmpresasPageInner />
    </Suspense>
  );
}
