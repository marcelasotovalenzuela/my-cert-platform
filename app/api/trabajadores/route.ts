// app/api/trabajadores/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  try {
    if (id) {
      const trabajador = await prisma.trabajador.findUnique({
        where: { id: Number(id) },
        include: { certificaciones: true },
      })
      return NextResponse.json(trabajador)
    }
    const trabajadores = await prisma.trabajador.findMany({
      include: { certificaciones: true },
    })
    return NextResponse.json(trabajadores)
  } catch (err) {
    console.error('❌ Error en GET /api/trabajadores:', err)
    return NextResponse.json({ error: 'Error al obtener trabajadores' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nombre, apellido, empresaId, centroTrabajo } = await req.json()
    const nuevo = await prisma.trabajador.create({
      data: { nombre, apellido, empresaId: Number(empresaId), centroTrabajo },
    })
    return NextResponse.json(nuevo)
  } catch (err) {
    console.error('❌ Error en POST /api/trabajadores:', err)
    return NextResponse.json({ error: 'Error al crear trabajador' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...data } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Falta id del trabajador' }, { status: 400 })
    }
    const actualizado = await prisma.trabajador.update({
      where: { id: Number(id) },
      data,
    })
    return NextResponse.json(actualizado)
  } catch (err) {
    console.error('❌ Error en PATCH /api/trabajadores:', err)
    return NextResponse.json({ error: 'Error al actualizar trabajador' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  try {
    if (!id) {
      return NextResponse.json({ error: 'Falta id de trabajador' }, { status: 400 })
    }
    await prisma.trabajador.delete({ where: { id: Number(id) } })
    return NextResponse.json({ message: '✅ Trabajador eliminado' })
  } catch (err) {
    console.error('❌ Error en DELETE /api/trabajadores:', err)
    return NextResponse.json({ error: 'Error al eliminar trabajador' }, { status: 500 })
  }
}
