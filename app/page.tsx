"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col">
      {/* 🔹 Franja superior */}
      <header className="w-full bg-white shadow-md flex items-center justify-between px-6 py-3 z-20">
        {/* Logo aumentado en 20% */}
        <img src="/logo.png" alt="R&L Training Logo" className="h-16" loading="lazy" decoding="async" />

        {/* Botones a la derecha */}
        <div className="flex gap-4">
          <Link
            href="/login"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition"
          >
            Entrar al Sistema de Acreditación
          </Link>
          <Link
            href="/verificar"
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow transition"
          >
            Verificar Documentos
          </Link>
        </div>
      </header>

      {/* 🔹 Hero con imagen de fondo */}
      <section
        className="relative h-[50vh] bg-cover bg-center"
        style={{ backgroundImage: "url('/crane-bg.jpg')" }}
      >
        {/* Overlay oscuro */}
        <div className="absolute inset-0 bg-black/40"></div>

        {/* Texto fijo */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
          <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg">
            Rigging & Lifting Training
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white drop-shadow-md">
            Formación y acreditación de competencias en Izaje
          </p>
        </div>
      </section>

      {/* 🔹 Sección de servicios */}
      <section className="bg-white py-16 px-6">
        <h2 className="text-3xl font-bold text-center mb-12">Nuestros Servicios</h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Inspecciones */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <img
              src="/servicio-inspecciones.jpg"
              alt="Inspecciones"
              className="w-full h-72 object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">Inspecciones</h3>
              <p className="text-gray-600">
                Inspección de elementos y accesorios de izaje según normas internacionales.
              </p>
            </div>
          </div>

          {/* Capacitación */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <img
              src="/servicio-capacitacion.jpg"
              alt="Capacitación"
              className="w-full h-72 object-cover"
            />
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">
                Capacitación, Formación y Acreditación
              </h3>
              <p className="text-gray-600">
                Capacitación y Acreditación de competencias para rigger y operador de grúas torre,
                grúas RT, grúas móviles de superficie, grúas portales, puentes grúa, grúa horquilla,
                huinche y grúas articuladas montadas en barco.
              </p>
            </div>
          </div>

          {/* Asesoría Técnica */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <img
              src="/servicio-asesoria.jpg"
              alt="Asesoría Técnica"
              className="w-full h-72 object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">Asesoría Técnica</h3>
              <p className="text-gray-600">
                Asesorías técnicas para empresas y profesionales respecto a maniobras de izaje,
                normativa, seguridad y competencias. Incluye revisión de documentos y análisis de
                accidentes.
              </p>
            </div>
          </div>
        </div>
      </section>

          {/* 🔹 Sección de contacto */}
          <section className="bg-gray-50 py-16 px-6">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 text-center">
              {/* Email */}
              <div className="p-6 bg-white rounded-lg shadow">
                <a href="mailto:contacto@ryltraining.cl" aria-label="Enviar correo a contacto@ryltraining.cl" className="block text-blue-600 text-5xl mb-4 hover:scale-110 transition">
                  ✉️
                </a>
                <h3 className="text-xl font-bold mb-2">Email</h3>
                <p className="text-gray-700">contacto@ryltraining.cl</p>
              </div>

              {/* Teléfono */}
              <div className="p-6 bg-white rounded-lg shadow">
                <a href="tel:+56941423741" aria-label="Llamar al teléfono +56 9 4142 3741" className="block text-green-600 text-5xl mb-4 hover:scale-110 transition">
                  📞
                </a>
                <h3 className="text-xl font-bold mb-2">Teléfono</h3>
                <p className="text-gray-700">Lunes a Sábado de 08:00 a 20:00 horas</p>
                <p className="text-blue-600">+56 9 4142 3741</p>
              </div>
            </div>
          </section>
    </main>
  );
}
