export const runtime = 'nodejs'


import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import fs from "fs"
import path from "path"
import { prisma } from "@/lib/prisma"

function generarCodigo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let result = ""
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `VERIF-${result}`
}


export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params

  const cert = await prisma.certificacion.findUnique({
    where: { id: Number(id) },
    include: { trabajador: true },
  })

  if (!cert) {
    return NextResponse.json({ error: "Certificación no encontrada" }, { status: 404 })
  }

  const trabajador = cert.trabajador

  // Usa código existente o genera y guarda uno nuevo
    let codigo = cert.codigoVerificacion
    if (!codigo) {
      codigo = generarCodigo()
      await prisma.certificacion.update({
        where: { id: cert.id },
        data: { codigoVerificacion: codigo }, // 👈 siempre camelCase en código
      })
    }

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([842, 595])
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Borde
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 802,
    height: 555,
    borderWidth: 2,
    borderColor: rgb(0.2, 0.2, 0.2),
  })

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo.png")
  if (fs.existsSync(logoPath)) {
    const logoImageBytes = fs.readFileSync(logoPath)
    const logoImage = await pdfDoc.embedPng(logoImageBytes)
    const logoDims = logoImage.scale(0.142)
    page.drawImage(logoImage, {
      x: page.getWidth() / 2 - logoDims.width / 2,
      y: 440,
      width: logoDims.width,
      height: logoDims.height,
    })
  }

  // Texto
  const title = "DIPLOMA DE CERTIFICACIÓN"
  const textWidth = fontBold.widthOfTextAtSize(title, 28)
  page.drawText(title, {
    x: page.getWidth() / 2 - textWidth / 2,
    y: 380,
    size: 28,
    font: fontBold,
    color: rgb(0, 0.2, 0.6),
  })

  page.drawText(`Se confiere el presente diploma a:`, {
    x: 100,
    y: 330,
    size: 16,
    font: fontRegular,
  })

  page.drawText(`${trabajador.nombre} ${trabajador.apellido}`, {
    x: 100,
    y: 300,
    size: 22,
    font: fontBold,
  })

  page.drawText(`RUT: ${trabajador.rut}`, {
    x: 100,
    y: 275,
    size: 16,
    font: fontRegular,
  })

  if (trabajador.centroTrabajo) {
    page.drawText(`Centro de Trabajo: ${trabajador.centroTrabajo}`, {
      x: 100,
      y: 255,
      size: 14,
      font: fontRegular,
    })
  }

  page.drawText(`Por haber aprobado satisfactoriamente el curso:`, {
    x: 100,
    y: 225,
    size: 16,
    font: fontRegular,
  })

  page.drawText(`${cert.curso}`, {
    x: 100,
    y: 200,
    size: 18,
    font: fontBold,
  })

  const hoy = new Date().toLocaleDateString("es-CL")
  page.drawText(`Fecha de emisión: ${hoy}`, {
    x: 100,
    y: 160,
    size: 14,
    font: fontRegular,
  })
  page.drawText(`Código de verificación: ${codigo}`, {
    x: 100,
    y: 140,
    size: 14,
    font: fontBold,
    color: rgb(0.8, 0, 0),
  })
  page.drawText(`Verifique en: https://www.ryltraining.cl/verificar`, {
    x: 100,
    y: 120,
    size: 12,
    font: fontRegular,
    color: rgb(0, 0, 0.6),
  })

  // Firma
  const firmaPath = path.join(process.cwd(), "public", "firma.png")
  if (fs.existsSync(firmaPath)) {
    const firmaImageBytes = fs.readFileSync(firmaPath)
    const firmaImage = await pdfDoc.embedPng(firmaImageBytes)
    const firmaDims = firmaImage.scale(0.19)
    page.drawImage(firmaImage, {
      x: 435,
      y: 80,
      width: firmaDims.width,
      height: firmaDims.height,
    })
  }

  page.drawText("Juan Aguayo", {
    x: 560,
    y: 100,
    size: 14,
    font: fontBold,
  })
  page.drawText("Gerente Operaciones", {
    x: 560,
    y: 85,
    size: 12,
    font: fontRegular,
  })
  page.drawText("R&L Training", {
    x: 560,
    y: 70,
    size: 12,
    font: fontRegular,
  })

  const pdfBytes = await pdfDoc.save()
  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=diploma-${id}.pdf`,
    },
  })
}
