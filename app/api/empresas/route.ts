import { NextRequest, NextResponse } from "next/server"

/**
 * Endpoint legacy:
 * Antes este endpoint manejaba informes por empresa.
 * Ahora solo responde que fue reemplazado para evitar romper el build.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Este endpoint fue reemplazado. Utiliza /api/empresas o los nuevos endpoints de informes.",
    },
    { status: 410 }
  )
}
