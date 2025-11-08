// app/api/trabajadores/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 🔹 Actualizar un trabajador por ID
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const trabajadorId = Number(id)

  try {
    const body = await req.json()
    const { centroTrabajo } = body

    if (!centroTrabajo) {
      return NextResponse.json(
        { error: 'El campo centroTrabajo es obligatorio' },
        { status: 400 }
      )
    }

    const trabajador = await prisma.trabajador.update({
      where: { id: trabajadorId },
      data: { centroTrabajo },
    })

    return NextResponse.json(trabajador)
  } catch (err) {
    console.error('❌ Error en PUT /api/trabajadores/[id]:', err)
    return NextResponse.json(
      { error: 'Error al actualizar trabajador' },
      { status: 500 }
    )
  }
}

// 🔹 Obtener un trabajador por ID
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const trabajadorId = Number(id)

  try {
    const trabajador = await prisma.trabajador.findUnique({
      where: { id: trabajadorId },
      include: { certificaciones: true },
    })

    if (!trabajador) {
      return NextResponse.json(
        { error: 'Trabajador no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(trabajador)
  } catch (err) {
    console.error('❌ Error en GET /api/trabajadores/[id]:', err)
    return NextResponse.json(
      { error: 'Error al obtener trabajador' },
      { status: 500 }
    )
  }
}
