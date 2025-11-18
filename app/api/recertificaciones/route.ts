// app/api/recertificaciones/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"

// Leemos configuración SMTP desde variables de entorno
const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT || 587)
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const notifyTo = process.env.RECERT_NOTIFY_TO || "marcelasotovalenzuela@gmail.com"

if (!smtpHost || !smtpUser || !smtpPass) {
  console.warn("⚠️ SMTP incompleto en /api/recertificaciones. Se usará modo simulado si se llama al endpoint.")
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    const {
      trabajadorId,
      nombre,
    }: { trabajadorId?: number | string; nombre?: string } = body ?? {}

    const trabajadorIdNum = Number(trabajadorId)

    if (!trabajadorIdNum || Number.isNaN(trabajadorIdNum)) {
      return NextResponse.json(
        { error: "Falta trabajadorId válido" },
        { status: 400 }
      )
    }

    if (!nombre) {
      return NextResponse.json(
        { error: "Falta nombre del curso / recertificación" },
        { status: 400 }
      )
    }

    // 🔹 Buscamos trabajador + empresa + certificación más reciente
    const trabajador = await prisma.trabajador.findUnique({
      where: { id: trabajadorIdNum },
      include: {
        empresa: true,
        certificaciones: {
          orderBy: { fechaVencimiento: "desc" },
          take: 1,
        },
      },
    })

    if (!trabajador) {
      return NextResponse.json(
        { error: "Trabajador no encontrado" },
        { status: 404 }
      )
    }

    const empresa = trabajador.empresa
    const ultimaCert = trabajador.certificaciones[0] ?? null

    const empresaNombre = empresa?.nombre ?? "Empresa no registrada"
    const empresaEmail = empresa?.email ?? "N/A"
    const empresaRut = empresa?.rut ?? "N/A"

    const trabajadorNombre = `${trabajador.nombre} ${trabajador.apellido ?? ""}`.trim()
    const trabajadorRut = trabajador.rut
    const centroTrabajo = trabajador.centroTrabajo ?? "N/A"

    const curso = ultimaCert?.curso ?? nombre
    const fechaVencimiento =
      ultimaCert?.fechaVencimiento instanceof Date
        ? ultimaCert.fechaVencimiento.toISOString().slice(0, 10)
        : ultimaCert?.fechaVencimiento
        ? String(ultimaCert.fechaVencimiento).slice(0, 10)
        : "N/A"

    // 🔹 Si no hay SMTP bien configurado → modo simulado (no rompe al cliente)
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("⚠️ /api/recertificaciones en modo SIMULADO (sin SMTP completo)")
      console.log({
        trabajadorId: trabajadorIdNum,
        trabajadorNombre,
        trabajadorRut,
        empresaNombre,
        empresaEmail,
        empresaRut,
        curso,
        fechaVencimiento,
        nombreSolicitud: nombre,
      })

      return NextResponse.json({
        ok: true,
        mocked: true,
        message:
          "Recertificación registrada en modo simulado (SMTP incompleto en el servidor).",
      })
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    const subject = `RYL RECERTIFICACION – ${empresaNombre}`
    const text = [
      `Se ha solicitado una recertificación desde la plataforma R&L Training.`,
      ``,
      `=== DATOS DE LA EMPRESA ===`,
      `Nombre: ${empresaNombre}`,
      `RUT: ${empresaRut}`,
      `Correo empresa: ${empresaEmail}`,
      ``,
      `=== DATOS DEL TRABAJADOR ===`,
      `Nombre: ${trabajadorNombre}`,
      `RUT: ${trabajadorRut}`,
      `Centro de trabajo: ${centroTrabajo}`,
      ``,
      `=== DETALLE DE LA RECERTIFICACION ===`,
      `Curso (última certificación registrada): ${curso}`,
      `Vence: ${fechaVencimiento}`,
      `Solicitud: ${nombre}`,
      ``,
      `Fecha de solicitud: ${new Date().toLocaleString("es-CL")}`,
    ].join("\n")

    const html = `
      <p><strong>Se ha solicitado una recertificación desde la plataforma R&L Training.</strong></p>
      <h3>Datos de la empresa</h3>
      <ul>
        <li><strong>Nombre:</strong> ${empresaNombre}</li>
        <li><strong>RUT:</strong> ${empresaRut}</li>
        <li><strong>Correo empresa:</strong> ${empresaEmail}</li>
      </ul>

      <h3>Datos del trabajador</h3>
      <ul>
        <li><strong>Nombre:</strong> ${trabajadorNombre}</li>
        <li><strong>RUT:</strong> ${trabajadorRut}</li>
        <li><strong>Centro de trabajo:</strong> ${centroTrabajo}</li>
      </ul>

      <h3>Detalle de la recertificación</h3>
      <ul>
        <li><strong>Curso (última certificación):</strong> ${curso}</li>
        <li><strong>Fecha de vencimiento:</strong> ${fechaVencimiento}</li>
        <li><strong>Solicitud:</strong> ${nombre}</li>
      </ul>

      <p>Fecha de solicitud: ${new Date().toLocaleString("es-CL")}</p>
    `

    await transporter.sendMail({
      from: `"Recertificaciones R&L" <${smtpUser}>`,
      to: notifyTo,
      subject,
      text,
      html,
    })

    console.log("📧 Recertificación enviada correctamente desde /api/recertificaciones")
    return NextResponse.json({ ok: true, message: "Recertificación solicitada" })
  } catch (err) {
    console.error("❌ Error en POST /api/recertificaciones:", err)
    return NextResponse.json(
      { error: "Error al procesar la solicitud de recertificación" },
      { status: 500 }
    )
  }
}
