// app/api/recertificaciones/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { trabajadorId, nombre, mesesValidez } = await req.json()

    // Fecha de emisión = ahora
    const fechaEmision = new Date()
    // Fecha de vencimiento = ahora + mesesValidez
    const fechaVencimiento = new Date()
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + mesesValidez)

    const nuevaCertificacion = await prisma.certificacion.create({
      data: {
        nombre,
        fechaEmision,
        fechaVencimiento,
        trabajadorId,
      },
    })

    return NextResponse.json(nuevaCertificacion, { status: 201 })
  } catch (err) {
    console.error('❌ Error en recertificación:', err)
    return NextResponse.json(
      { error: 'Error al crear la recertificación' },
      { status: 500 }
    )
  }
}
