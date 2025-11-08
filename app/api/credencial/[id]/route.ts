import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PDFDocument, rgb } from "pdf-lib"
import QRCode from "qrcode"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 })
  }

  try {
    // Buscar trabajador y su certificación más reciente
    const trabajador = await prisma.trabajador.findUnique({
      where: { id: Number(id) },
      include: {
        certificaciones: { orderBy: { fechaEmision: "desc" }, take: 1 },
      },
    })

    if (!trabajador || trabajador.certificaciones.length === 0) {
      return NextResponse.json({ error: "Trabajador o certificación no encontrada" }, { status: 404 })
    }

    const cert = trabajador.certificaciones[0]

    const pdfDoc = await PDFDocument.create()
    const pageFront = pdfDoc.addPage([340, 540])
    const pageBack = pdfDoc.addPage([340, 540])

    const W = pageFront.getWidth()
    const H = pageFront.getHeight()

    // ================================
    // ANVERSO
    // ================================

    // Fondo blanco
    pageFront.drawRectangle({
      x: 0,
      y: 0,
      width: W,
      height: H,
      color: rgb(1, 1, 1),
    })

    // Borde redondeado
    const borderColor = rgb(0.7, 0.7, 0.7)
    pageFront.drawRectangle({
      x: 5,
      y: 5,
      width: W - 10,
      height: H - 10,
      borderColor,
      borderWidth: 2,
      color: rgb(1, 1, 1),
      borderRadius: 24,
    })

    // Logo
    const logoPath = path.join(process.cwd(), "public", "logo.png")
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath)
      const logoImg = await pdfDoc.embedPng(logoBytes)
      const dims = logoImg.scale(0.09)
      pageFront.drawImage(logoImg, {
        x: W / 2 - dims.width / 2,
        y: H - dims.height - 40,
        width: dims.width,
        height: dims.height,
      })
    }

    // Foto del trabajador (buscar por RUT en /public/fotos)
    const fotoBasePath = path.join(process.cwd(), "public", "fotos")
    const fotoJpg = path.join(fotoBasePath, `${trabajador.rut}.jpg`)
    const fotoPng = path.join(fotoBasePath, `${trabajador.rut}.png`)
    const fotoDefault = path.join(fotoBasePath, "default.jpg")

    let fotoPath = null
    if (fs.existsSync(fotoJpg)) fotoPath = fotoJpg
    else if (fs.existsSync(fotoPng)) fotoPath = fotoPng
    else if (fs.existsSync(fotoDefault)) fotoPath = fotoDefault

    if (fotoPath) {
      const fotoBytes = fs.readFileSync(fotoPath)
      const fotoImg = fotoPath.endsWith(".png")
        ? await pdfDoc.embedPng(fotoBytes)
        : await pdfDoc.embedJpg(fotoBytes)
      const dims = fotoImg.scale(0.45)
      pageFront.drawImage(fotoImg, {
        x: W / 2 - dims.width / 2,
        y: H - dims.height - 120,
        width: dims.width,
        height: dims.height,
      })
    }

    // Tipografía Helvetica (limpia, moderna)
    const font = await pdfDoc.embedFont("Helvetica-Bold")
    const fontRegular = await pdfDoc.embedFont("Helvetica")

    // Nombre
    const nombre = `${trabajador.nombre} ${trabajador.apellido}`.toUpperCase()
    pageFront.drawText(nombre, {
      x: W / 2 - font.widthOfTextAtSize(nombre, 18) / 2,
      y: 160,
      size: 18,
      font,
      color: rgb(0, 0, 0),
    })

    // RUT
    const rut = `RUT: ${trabajador.rut}`
    pageFront.drawText(rut, {
      x: W / 2 - fontRegular.widthOfTextAtSize(rut, 13) / 2,
      y: 140,
      size: 13,
      font: fontRegular,
      color: rgb(0, 0, 0),
    })

    // Curso
    const curso = `Curso: ${cert.curso}`
    pageFront.drawText(curso, {
      x: W / 2 - fontRegular.widthOfTextAtSize(curso, 13) / 2,
      y: 120,
      size: 13,
      font: fontRegular,
      color: rgb(0, 0, 0),
    })

    // Vigencia
    const vence = `Vigente hasta: ${new Date(cert.fechaVencimiento).toLocaleDateString("es-CL")}`
    pageFront.drawText(vence, {
      x: W / 2 - fontRegular.widthOfTextAtSize(vence, 13) / 2,
      y: 100,
      size: 13,
      font: fontRegular,
      color: rgb(0, 0, 0),
    })

    // Franja azul inferior
    pageFront.drawRectangle({
      x: 0,
      y: 0,
      width: W,
      height: 40,
      color: rgb(0, 0.168, 0.376),
    })

    // Texto dentro de franja
    const web = "www.ryltraining.cl"
    pageFront.drawText(web, {
      x: W / 2 - font.widthOfTextAtSize(web, 12) / 2,
      y: 14,
      size: 12,
      font,
      color: rgb(1, 1, 1),
    })

    // ================================
    // REVERSO
    // ================================
    pageBack.drawRectangle({
      x: 0,
      y: 0,
      width: W,
      height: H,
      color: rgb(1, 1, 1),
    })

    // QR centrado
    const qrData = await QRCode.toDataURL(`https://www.ryltraining.cl/verificar/${cert.codigoVerificacion}`)
    const qrBytes = Buffer.from(qrData.split(",")[1], "base64")
    const qrImg = await pdfDoc.embedPng(qrBytes)
    const qrDims = qrImg.scale(1.5)
    pageBack.drawImage(qrImg, {
      x: W / 2 - qrDims.width / 2,
      y: H / 2 - qrDims.height / 2 + 100,
      width: qrDims.width,
      height: qrDims.height,
    })

    // Código de verificación
    const codigo = `Código de verificación: ${cert.codigoVerificacion}`
    pageBack.drawText(codigo, {
      x: W / 2 - font.widthOfTextAtSize(codigo, 12) / 2,
      y: 230,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    })

    // Texto institucional
    const lines = [
      "Esta credencial es personal e intransferible.",
      "R&L Training certifica la vigencia del documento.",
      "Verifique en www.ryltraining.cl/verificar",
    ]

    let textY = 140
    for (const line of lines) {
      const textWidth = fontRegular.widthOfTextAtSize(line, 11)
      pageBack.drawText(line, {
        x: W / 2 - textWidth / 2,
        y: textY,
        size: 11,
        font: fontRegular,
        color: rgb(0, 0, 0),
      })
      textY -= 18
    }

    // ================================
    // EXPORTAR
    // ================================
    const pdfBytes = await pdfDoc.save()
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=credencial-${id}.pdf`,
      },
    })
  } catch (error) {
    console.error("Error generando credencial:", error)
    return NextResponse.json({ error: "Error generando credencial" }, { status: 500 })
  }
}
