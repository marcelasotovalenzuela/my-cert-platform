// app/api/recertificaciones/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server"
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const {
      certificacionId,
      trabajadorId,
      nombre,
    }: {
      certificacionId?: number | string
      trabajadorId?: number | string
      nombre?: string
    } = body ?? {}

    let trabajador: any = null
    let empresa: any = null
    let curso: string | null = null
    let fechaVencStr = "N/A"
    let nombreSolicitud = nombre ?? "Recertificación solicitada desde panel empresa"

    // 🔹 MODO NUEVO: viene certificacionId desde el panel (acciones de empresas)
    if (certificacionId) {
      const certIdNum = Number(certificacionId)
      if (!certIdNum || Number.isNaN(certIdNum)) {
        return NextResponse.json(
          { error: "certificacionId inválido" },
          { status: 400 }
        )
      }

      const cert = await prisma.certificacion.findUnique({
        where: { id: certIdNum },
        include: {
          trabajador: {
            include: {
              empresa: true,
            },
          },
        },
      })

      if (!cert || !cert.trabajador) {
        return NextResponse.json(
          { error: "Certificación o trabajador no encontrado" },
          { status: 404 }
        )
      }

      trabajador = cert.trabajador
      empresa = cert.trabajador.empresa
      curso = cert.curso

      const fv = cert.fechaVencimiento
      if (fv instanceof Date) {
        fechaVencStr = fv.toISOString().slice(0, 10)
      } else if (fv) {
        fechaVencStr = String(fv).slice(0, 10)
      }

      // Si no viene nombre en el body, usamos este texto por defecto
      if (!nombre) {
        nombreSolicitud = "Recertificación solicitada desde el panel de empresas"
      }
    } else {
      // 🔹 MODO LEGACY: se usa trabajadorId + nombre (por si lo llamas desde otro lado)
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

      trabajador = await prisma.trabajador.findUnique({
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

      empresa = trabajador.empresa
      const ultimaCert = trabajador.certificaciones[0] ?? null

      curso = ultimaCert?.curso ?? nombre

      const fv = ultimaCert?.fechaVencimiento
      if (fv instanceof Date) {
        fechaVencStr = fv.toISOString().slice(0, 10)
      } else if (fv) {
        fechaVencStr = String(fv).slice(0, 10)
      }

      nombreSolicitud = nombre
    }

    const empresaNombre = empresa?.nombre ?? "Empresa no registrada"
    const empresaEmail = empresa?.email ?? "N/A"
    const empresaRut = empresa?.rut ?? "N/A"

    const trabajadorNombre = `${trabajador?.nombre ?? ""} ${trabajador?.apellido ?? ""}`.trim()
    const trabajadorRut = trabajador?.rut ?? "N/A"
    const centroTrabajo = trabajador?.centroTrabajo ?? "N/A"

    const cursoFinal = curso ?? "Curso no definido"
    const fechaVencimiento = fechaVencStr

    // 🔹 Si no hay SMTP bien configurado → modo simulado (no rompe al cliente)
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("⚠️ /api/recertificaciones en modo SIMULADO (sin SMTP completo)")
      console.log({
        certificacionId: certificacionId ?? null,
        trabajadorId,
        trabajadorNombre,
        trabajadorRut,
        empresaNombre,
        empresaEmail,
        empresaRut,
        curso: cursoFinal,
        fechaVencimiento,
        nombreSolicitud,
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
      `Curso (última certificación registrada): ${cursoFinal}`,
      `Vence: ${fechaVencimiento}`,
      `Solicitud: ${nombreSolicitud}`,
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
        <li><strong>Curso (última certificación):</strong> ${cursoFinal}</li>
        <li><strong>Fecha de vencimiento:</strong> ${fechaVencimiento}</li>
        <li><strong>Solicitud:</strong> ${nombreSolicitud}</li>
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
  } catch (err: any) {
    console.error("❌ Error en POST /api/recertificaciones:", err)
    const message =
      err && typeof err === "object" && "message" in err
        ? (err as any).message
        : String(err)

    return NextResponse.json(
      {
        error: "Error al procesar la solicitud de recertificación",
        detail: message,
      },
      { status: 500 }
    )
  }
}
