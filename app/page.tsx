import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Barra superior */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="Rigging & Lifting Training"
                width={40}
                height={40}
                className="h-9 w-auto"
                priority
              />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">
                Rigging &amp; Lifting Training
              </p>
              <p className="text-xs text-slate-400">
                Gestión y verificación de certificaciones
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#como-funciona" className="hover:text-emerald-300">
              Cómo funciona
            </a>
            <a href="#beneficios" className="hover:text-emerald-300">
              Beneficios
            </a>
            <a href="#servicios" className="hover:text-emerald-300">
              Servicios
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/verificar"
              className="hidden text-xs font-medium text-slate-300 hover:text-emerald-300 sm:inline"
            >
              Verificar certificado
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300"
            >
              Entrar al panel
            </Link>
            <Link
              href="mailto:contacto@ryltraining.cl"
              className="rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 shadow-lg shadow-black/30 transition hover:bg-slate-700"
            >
              Contáctanos
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.18),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.15),_transparent_60%)]" />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 py-14 md:flex-row md:items-center md:py-20">
          {/* Texto principal */}
          <div className="max-w-xl space-y-6">
            <p className="inline-flex items-center rounded-full border border-emerald-400/40 bg-slate-900/60 px-3 py-1 text-[11px] font-medium text-emerald-200">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Plataforma para empresas y prevencionistas de riesgo
            </p>

            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Controla las certificaciones de{" "}
              <span className="text-emerald-300">Rigging &amp; Lifting</span>{" "}
              en un solo lugar.
            </h1>

            <p className="text-sm text-slate-300 sm:text-base">
              R&L Training centraliza los trabajadores, cursos y fechas de
              vencimiento para que tu empresa siempre esté al día en seguridad,
              auditorías y requisitos de tus mandantes.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-emerald-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300"
              >
                Entrar al panel de empresas
              </Link>
              <Link
                href="/verificar"
                className="rounded-full border border-slate-600 px-5 py-2.5 text-xs font-semibold text-slate-100 hover:border-emerald-300 hover:text-emerald-200"
              >
                Verificar un certificado
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 pt-2 text-xs text-slate-400">
              <div>
                <p className="font-semibold text-slate-200">
                  Credencial con QR único
                </p>
                <p>Diplomas y certificados listos para compartir y descargar.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-200">
                  Alertas por recertificación
                </p>
                <p>Detecta cursos críticos y próximos a vencer en segundos.</p>
              </div>
            </div>
          </div>

          {/* Tarjeta de “snapshot” */}
          <div className="flex flex-1 justify-center md:justify-end">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/60 backdrop-blur">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  Resumen de certificaciones
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  Demo
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-[11px]">
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <p className="text-[10px] text-slate-400">Críticas</p>
                  <p className="mt-1 text-2xl font-semibold text-rose-300">
                    4
                  </p>
                  <p className="mt-1 text-[10px] text-rose-300/80">
                    Vencen &lt; 30 días
                  </p>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <p className="text-[10px] text-slate-400">Atención</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-300">
                    7
                  </p>
                  <p className="mt-1 text-[10px] text-amber-300/80">
                    Vencen &lt; 90 días
                  </p>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <p className="text-[10px] text-slate-400">Vigentes</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-300">
                    42
                  </p>
                  <p className="mt-1 text-[10px] text-emerald-300/80">
                    Al día
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-900/90 text-[11px]">
                <div className="flex items-center justify-between border-b border-slate-700/70 px-3 py-2">
                  <span className="font-medium text-slate-200">
                    Trabajadores
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Ordenados por riesgo
                  </span>
                </div>
                <div className="divide-y divide-slate-800/80">
                  {[
                    {
                      nombre: "Juan Pérez",
                      curso: "Rigger & Señalero",
                      estado: "Crítica",
                      color: "text-rose-300",
                    },
                    {
                      nombre: "María González",
                      curso: "Operador de Grúa",
                      estado: "Atención",
                      color: "text-amber-300",
                    },
                    {
                      nombre: "Carlos Soto",
                      curso: "Supervisor de Maniobras",
                      estado: "Vigente",
                      color: "text-emerald-300",
                    },
                  ].map((t) => (
                    <div
                      key={t.nombre}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-slate-100">
                          {t.nombre}
                        </p>
                        <p className="text-[10px] text-slate-400">{t.curso}</p>
                      </div>
                      <span className={`text-[11px] font-semibold ${t.color}`}>
                        {t.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-3 text-[10px] text-slate-500">
                Esta es una vista de ejemplo. Al iniciar sesión verás los datos
                reales de tu empresa, listos para descargar diplomas, credenciales
                y solicitar recertificaciones.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección: Cómo funciona */}
      <section
        id="como-funciona"
        className="border-t border-white/5 bg-slate-950/95"
      >
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <h2 className="text-lg font-semibold text-slate-50">
            ¿Cómo funciona R&amp;L Training?
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Centralizamos toda la información de certificaciones para que tu
            empresa pueda demostrar cumplimiento en segundos.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold text-emerald-300">
                1. Cargamos tus datos
              </p>
              <p className="mt-2 text-xs text-slate-300">
                Importamos a tus trabajadores y certificaciones desde tus
                planillas o sistemas actuales.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold text-emerald-300">
                2. Panel por empresa
              </p>
              <p className="mt-2 text-xs text-slate-300">
                Cada mandante/contratista cuenta con su acceso para revisar
                vigencias, descargar diplomas y certificados.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold text-emerald-300">
                3. Verificación con QR
              </p>
              <p className="mt-2 text-xs text-slate-300">
                Cada credencial tiene un código único y un QR que se puede
                verificar desde esta misma página.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección: Beneficios / Para quién es */}
      <section
        id="beneficios"
        className="border-t border-white/5 bg-slate-950/98"
      >
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="space-y-10">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">
                Beneficios para tu empresa
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>• Menos planillas dispersas, todo centralizado.</li>
                <li>• Visibilidad inmediata de certificaciones críticas.</li>
                <li>• Documentos listos para auditorías y visitas en faena.</li>
                <li>• Menos tiempo persiguiendo información a proveedores.</li>
              </ul>

              <h3 className="mt-6 text-sm font-semibold text-slate-50">
                Diseñado para
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>• Encargados de prevención de riesgos.</li>
                <li>• Jefes de RRHH y contratistas.</li>
                <li>• Empresas que trabajan con grúas y maniobras de izaje.</li>
              </ul>
            </div>

            <div id="servicios" className="space-y-8">
              <h3 className="text-lg font-semibold text-slate-50 mb-2">
                Servicios
              </h3>

              {/* Gestión de certificaciones */}
              <div className="flex items-start gap-4">
                <div className="h-24 w-24 flex-none overflow-hidden rounded-xl ring-1 ring-white/10 bg-slate-900">
                  <Image
                    src="/servicio-gestion.jpg"
                    alt="Gestión y verificación de certificaciones"
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-50">
                    Gestión y verificación de certificaciones
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Administración centralizada de trabajadores, cursos y
                    vigencias, con documentos listos para auditorías y mandantes.
                  </p>
                </div>
              </div>

              {/* Inspecciones */}
              <div className="flex items-start gap-4">
                <div className="h-24 w-24 flex-none overflow-hidden rounded-xl ring-1 ring-white/10 bg-slate-900">
                  <Image
                    src="/servicio-inspecciones.jpg"
                    alt="Inspecciones de equipos y elementos de izaje"
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-50">
                    Inspecciones de equipos y elementos de izaje
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Evaluaciones técnicas en terreno y reportes claros para tus
                    registros internos y autoridades.
                  </p>
                </div>
              </div>

              {/* Capacitaciones y certificaciones */}
              <div className="flex items-start gap-4">
                <div className="h-24 w-24 flex-none overflow-hidden rounded-xl ring-1 ring-white/10 bg-slate-900">
                  <Image
                    src="/servicio-capacitacion.jpg"
                    alt="Capacitaciones y certificaciones"
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-50">
                    Capacitaciones y certificaciones
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Formación en obra o en sala, con
                    diplomas y certificados integrados a la plataforma.
                  </p>
                </div>
              </div>

              {/* Asesoría especializada */}
              <div className="flex items-start gap-4">
                <div className="h-24 w-24 flex-none overflow-hidden rounded-xl ring-1 ring-white/10 bg-slate-900">
                  <Image
                    src="/servicio-asesoria.jpg"
                    alt="Asesoría especializada en izaje y maniobras delicadas"
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-50">
                    Asesoría en izaje y maniobras delicadas
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Acompañamiento en maniobras críticas, análisis de riesgos e
                    investigaciones de incidentes relacionados con izaje.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-slate-950 py-6 text-center text-slate-500">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-300 font-medium">
          <a href="tel:+56941423741" className="hover:text-emerald-300">
            Llamar: +56 9 4142 3741
          </a>
          <a
            href="https://wa.me/56941423741"
            target="_blank"
            rel="noreferrer"
            className="hover:text-emerald-300"
          >
            WhatsApp: +56 9 4142 3741
          </a>
          <a
            href="mailto:contacto@ryltraining.cl"
            className="hover:text-emerald-300"
          >
            contacto@ryltraining.cl
          </a>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          R&amp;L Training · Plataforma de gestión y verificación de
          certificaciones · {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
