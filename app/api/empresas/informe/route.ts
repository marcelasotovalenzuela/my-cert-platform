import { NextRequest, NextResponse } from "next/server"

/**
 * Endpoint legacy de informes por empresa.
 * Hoy solo responde 410 para no romper el build.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Este endpoint ya no está disponible. Utiliza /api/empresas o los nuevos endpoints de informes.",
    },
    { status: 410 }
  )
}
