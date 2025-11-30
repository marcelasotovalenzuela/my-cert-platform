export const runtime = 'nodejs'


import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import fs from "fs"
import path from "path"
import { prisma } from "@/lib/prisma"
import QRCode from "qrcode"



export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const cert = await prisma.certificacion.findUnique({
    where: { id: Number(id) },
    include: { trabajador: true },
  })

  if (!cert) {
    return NextResponse.json({ error: "Certificación no encontrada" }, { status: 404 })
  }

  const trabajador = cert.trabajador

    // Código ya generado por Supabase
    const codigo = cert.codigoVerificacion
    const urlVerificacion = `https://ryltraining.cl/verificar/${codigo}`

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

  // Barra superior corporativa
  page.drawRectangle({
    x: 20,
    y: 545,
    width: 802,
    height: 25,
    color: rgb(0, 0.27, 0.6),
  })
  const headerText = "Rigging & Lifting Training SpA"
  const headerWidth = fontBold.widthOfTextAtSize(headerText, 11)
  page.drawText(headerText, {
    x: page.getWidth() / 2 - headerWidth / 2,
    y: 553,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo.png")
  if (fs.existsSync(logoPath)) {
    const logoImageBytes = fs.readFileSync(logoPath)
    const logoImage = await pdfDoc.embedPng(logoImageBytes)
    const logoDims = logoImage.scale(0.10)
    page.drawImage(logoImage, {
      x: page.getWidth() / 2 - logoDims.width / 2,
      y: 430,
      width: logoDims.width,
      height: logoDims.height,
    })
  }

  // Texto
  const title = "DIPLOMA DE CERTIFICACIÓN"
  const textWidth = fontBold.widthOfTextAtSize(title, 22)
  page.drawText(title, {
    x: page.getWidth() / 2 - textWidth / 2,
    y: 380,
    size: 22,
    font: fontBold,
    color: rgb(0, 0.2, 0.6),
  })

  const t1 = "Se confiere el presente diploma a:"
  const t1Width = fontRegular.widthOfTextAtSize(t1, 16)
  page.drawText(t1, {
    x: page.getWidth() / 2 - t1Width / 2,
    y: 360,
    size: 16,
    font: fontRegular,
  })

  const t2 = `${trabajador.nombre} ${trabajador.apellido}`
  const t2Width = fontBold.widthOfTextAtSize(t2, 22)
  page.drawText(t2, {
    x: page.getWidth() / 2 - t2Width / 2,
    y: 325,
    size: 22,
    font: fontBold,
  })

  const t3 = `RUT: ${trabajador.rut}`
  const t3Width = fontRegular.widthOfTextAtSize(t3, 16)
  page.drawText(t3, {
    x: page.getWidth() / 2 - t3Width / 2,
    y: 305,
    size: 16,
    font: fontRegular,
  })

  const t4 = "Por haber aprobado satisfactoriamente el curso:"
  const t4Width = fontRegular.widthOfTextAtSize(t4, 15)
  page.drawText(t4, {
    x: page.getWidth() / 2 - t4Width / 2 + 10,
    y: 270,
    size: 15,
    font: fontRegular,
  })

  const t5 = `${cert.curso}`
  const t5Width = fontBold.widthOfTextAtSize(t5, 18)
  page.drawText(t5, {
    x: page.getWidth() / 2 - t5Width / 2,
    y: 245,
    size: 18,
    font: fontBold,
  })

    const fechaCapacitacion = new Date(cert.fechaEmision).toLocaleDateString("es-CL");
    const textFecha = `Capacitación realizada el: ${fechaCapacitacion}`;
    const textFechaWidth = fontRegular.widthOfTextAtSize(textFecha, 11);
    page.drawText(textFecha, {
      x: page.getWidth() / 2 - textFechaWidth / 2,
      y: 165,
      size: 11,
      font: fontRegular,
    });

    const textCodigo = `Código de verificación: ${codigo}`;
    const textCodigoWidth = fontBold.widthOfTextAtSize(textCodigo, 11);
    page.drawText(textCodigo, {
      x: page.getWidth() / 2 - textCodigoWidth / 2,
      y: 145,
      size: 11,
      font: fontBold,
      color: rgb(0.8, 0, 0),
    });

  // Columna derecha: QR y link de verificación
  const qrX = 120
  const qrY = 60

    const textVerif = "Verificación en línea";
    const textVerifWidth = fontRegular.widthOfTextAtSize(textVerif, 11);
    page.drawText(textVerif, {
      x: page.getWidth() / 2 - textVerifWidth / 2,
      y: 125,
      size: 11,
      font: fontRegular,
    });

    const textUrl = "ryltraining.cl/verificar/";
    const textUrlWidth = fontRegular.widthOfTextAtSize(textUrl, 10);
    page.drawText(textUrl, {
      x: page.getWidth() / 2 - textUrlWidth / 2,
      y: 112,
      size: 10,
      font: fontRegular,
      color: rgb(0, 0, 0.6),
    });

  const qrPngBytes = await QRCode.toBuffer(urlVerificacion, { width: 90, margin: 1 })
  const qrImage = await pdfDoc.embedPng(qrPngBytes)
  const qrDims = qrImage.scale(1)

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrDims.width * 0.9,
    height: qrDims.height * 0.9,
  })

  // Firma
  const firmaPath = path.join(process.cwd(), "public", "firma.png")
  if (fs.existsSync(firmaPath)) {
    const firmaImageBytes = fs.readFileSync(firmaPath)
    const firmaImage = await pdfDoc.embedPng(firmaImageBytes)
    const firmaDims = firmaImage.scale(0.19)
    page.drawImage(firmaImage, {
      x: 495,
      y: 70,
      width: firmaDims.width,
      height: firmaDims.height,
    })
  }

  page.drawText("Marcela Soto", {
    x: 630,
    y: 110,
    size: 14,
    font: fontBold,
  })
  page.drawText("CEO", {
    x: 660,
    y: 90,
    size: 12,
    font: fontRegular,
  })
  page.drawText("R&L Training", {
    x: 640,
    y: 70,
    size: 12,
    font: fontRegular,
  })

  // Pie de página corporativo
  page.drawRectangle({
    x: 20,
    y: 48,
    width: 802,
    height: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })
  const footerText = "Documento emitido electrónicamente a través de R&L Training • www.ryltraining.cl"
  const footerWidth = fontRegular.widthOfTextAtSize(footerText, 10)
  page.drawText(footerText, {
    x: page.getWidth() / 2 - footerWidth / 2,
    y: 32,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  })

    const pdfBytes = await pdfDoc.save()
    // ✅ En Node, usa Buffer para evitar el error de tipos con Blob
    const pdfBuffer = Buffer.from(pdfBytes)

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=diploma-${id}.pdf`,
      },
    })
}
