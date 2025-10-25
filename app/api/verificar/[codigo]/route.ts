import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  context: { params: Promise<{ codigo: string }> } // 👈 Next 15/Turbopack: params es Promise
) {
  const { codigo } = await context.params // 👈 hay que await

  if (!codigo) {
    return NextResponse.json({ error: "Código requerido" }, { status: 400 })
  }

  try {
    const cert = await prisma.certificacion.findFirst({
      where: { codigoVerificacion: codigo }, // 👈 camelCase (mapeado a codigo_verificacion)
      include: { trabajador: true },         // 👈 relación en minúscula
    })

    if (!cert) {
      return NextResponse.json(
        { valido: false, mensaje: `Código "${codigo}" no encontrado` },
        { status: 404 }
      )
    }

    const trabajadorNombreCompleto = `${cert.trabajador.nombre} ${cert.trabajador.apellido}`

    return NextResponse.json({
      valido: true,
      mensaje: "✅ Diploma válido",
      trabajador: trabajadorNombreCompleto,
      rut: cert.trabajador.rut,
      curso: cert.curso,
      fechaVencimiento: cert.fechaVencimiento,
      centroTrabajo: cert.trabajador.centroTrabajo ?? null,
    })
  } catch (error) {
    console.error("❌ Error en verificación:", error)
    return NextResponse.json({ error: "Error al verificar el documento" }, { status: 500 })
  }
}
