// app/api/trabajadores/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** GET /api/trabajadores/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const idNum = Number(id)
  try {
    const trabajador = await prisma.trabajador.findUnique({
      where: { id: idNum },
      include: { certificaciones: true },
    })
    if (!trabajador) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }
    return NextResponse.json(trabajador, { status: 200 })
  } catch (err) {
    console.error('❌ Error en GET /api/trabajadores/[id]:', err)
    return NextResponse.json({ error: 'Error al obtener trabajador' }, { status: 500 })
  }
}

/** DELETE /api/trabajadores/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const urlId = new URL(req.url).searchParams.get('id')
  const idStr = id ?? urlId
  if (!idStr) {
    return NextResponse.json({ error: 'Falta id de trabajador' }, { status: 400 })
  }

  const idNum = Number(idStr)
  try {
    await prisma.trabajador.delete({ where: { id: idNum } })
    return NextResponse.json({ message: '✅ Trabajador eliminado' })
  } catch (err) {
    console.error('❌ Error en DELETE /api/trabajadores/[id]:', err)
    return NextResponse.json({ error: 'Error al eliminar trabajador' }, { status: 500 })
  }
}
