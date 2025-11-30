import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

// GET /api/empresas?id=... ó /api/empresas?email=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get("id")
    const emailParam = searchParams.get("email")

    const id = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null
    const email = emailParam?.trim()?.toLowerCase() || null

    if (!id && !email) {
      return NextResponse.json(
        { ok: false, error: "Falta parámetro: id (número) o email" },
        { status: 400 }
      )
    }

    let empresa = null

    if (id) {
      empresa = await prisma.empresa.findUnique({
        where: { id },
        include: {
          trabajadores: {
            include: { certificaciones: true },
            orderBy: { id: "asc" },
          },
        },
      })
    } else if (email) {
      empresa = await prisma.empresa.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        include: {
          trabajadores: {
            include: { certificaciones: true },
            orderBy: { id: "asc" },
          },
        },
      })
    }

    if (!empresa) {
      return NextResponse.json(
        { ok: false, error: "Empresa no encontrada" },
        { status: 404 }
      )
    }

    const empresaOut = {
      id: empresa.id,
      nombre: empresa.nombre,
      rut: empresa.rut ?? null,
      email: empresa.email,
      trabajadores: (empresa.trabajadores ?? []).map((t) => ({
        id: t.id,
        nombre: t.nombre,
        apellido: t.apellido ?? null,
        rut: t.rut ?? null,
        centroTrabajo: t.centroTrabajo ?? null,
        certificaciones: (t.certificaciones ?? []).map((c) => ({
          id: c.id,
          curso: c.curso,
          fechaEmision:
            c.fechaEmision instanceof Date
              ? c.fechaEmision.toISOString()
              : c.fechaEmision
              ? String(c.fechaEmision)
              : null,
          fechaVencimiento:
            c.fechaVencimiento instanceof Date
              ? c.fechaVencimiento.toISOString()
              : c.fechaVencimiento
              ? String(c.fechaVencimiento)
              : null,
          informe_url: c.informe_url ?? null,
        })),
      })),
    }

    return NextResponse.json({ ok: true, empresa: empresaOut }, { status: 200 })
  } catch (e) {
    console.error("❌ Error en GET /api/empresas:", e)
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
