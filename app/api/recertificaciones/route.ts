// app/api/recertificaciones/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { trabajadorId, nombre }: { trabajadorId?: number | string; nombre?: string } = body ?? {}

    const trabajadorIdNum = Number(trabajadorId)
    if (!trabajadorIdNum || Number.isNaN(trabajadorIdNum)) {
      return NextResponse.json({ error: "Falta trabajadorId válido" }, { status: 400 })
    }
    if (!nombre) {
      return NextResponse.json({ error: "Falta nombre del curso" }, { status: 400 })
    }

    const trabajador = await prisma.trabajador.findUnique({
      where: { id: trabajadorIdNum },
      include: { empresa: true },
    })

    if (!trabajador) {
      return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 })
    }

    // -------------------------------
    // 📧 Enviar correo de notificación (sin crear certificación)
    // -------------------------------
    const transporter = nodemailer.createTransport({
      host: "mail.ryltraining.cl",
      port: 465,
      secure: true,
      auth: {
        user: "certificaciones@ryltraining.cl",
        pass: "Miguelcruz096",
      },
    })

    const html = `
      <h2>Solicitud de Recertificación</h2>
      <p><strong>Trabajador:</strong> ${trabajador.nombre} ${trabajador.apellido ?? ""}</p>
      <p><strong>RUT:</strong> ${trabajador.rut ?? "—"}</p>
      <p><strong>Empresa:</strong> ${trabajador.empresa?.nombre ?? "—"}</p>
      <p><strong>Centro de trabajo:</strong> ${trabajador.centroTrabajo ?? "—"}</p>
      <p><strong>Curso solicitado:</strong> ${nombre}</p>
      <p><strong>Fecha de solicitud:</strong> ${new Date().toLocaleString("es-CL")}</p>
    `

    await transporter.sendMail({
      from: `R&L Training <certificaciones@ryltraining.cl>`,
      to: "marcelasotovalenzuela@gmail.com",
      subject: `Nueva solicitud de recertificación: ${nombre}`,
      html,
    })

    console.log("📧 Correo de solicitud enviado correctamente.")
    return NextResponse.json({ ok: true, message: "Recertificación solicitada" })
  } catch (err) {
    console.error("❌ Error en POST /api/recertificaciones:", err)
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 })
  }
}
