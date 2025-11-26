// app/api/export-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import fs from 'fs/promises'
import path from 'path'

// ➕ Tipo mínimo para usar heightAtSize sin `any`
type FontWithMetrics = import('pdf-lib').PDFFont & {
  heightAtSize?: (size: number) => number
}

/** Medición y quiebre manual de texto para pdf-lib */
function wrapTextByWidth(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = String(text ?? '').split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const test = current ? current + ' ' + w : w
    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      // si una palabra sola excede el ancho, partirla por caracteres
      if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
        let buf = ''
        for (const ch of w) {
          const t = buf + ch
          if (font.widthOfTextAtSize(t, fontSize) <= maxWidth) {
            buf = t
          } else {
            if (buf) lines.push(buf)
            buf = ch
          }
        }
        current = buf
      } else {
        current = w
      }
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Dibuja un array de líneas desde un tope y */
function drawLines(
  page: PDFPage,
  lines: string[],
  x: number,
  yTop: number,
  width: number,
  font: PDFFont,
  fontSize: number,
  color: ReturnType<typeof rgb>
) {
  const f = font as FontWithMetrics
  const baseLine = f.heightAtSize ? f.heightAtSize(fontSize) : fontSize * 1.2
  const lineHeight = baseLine * 1.05 // leve espacio entre líneas
  let y = yTop - 2 // pequeño padding desde el borde superior
  for (const ln of lines) {
    page.drawText(ln, { x, y, size: fontSize, font, color, maxWidth: width })
    y -= lineHeight
  }
}

// 🔹 Días “seguros” (UTC) hasta la fecha de vencimiento
function daysUntil(dateISO: string) {
  if (!dateISO) return Infinity
  const d = new Date(dateISO)
  if (isNaN(d.getTime())) return Infinity
  const today = new Date()
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const dueUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return Math.floor((dueUTC - todayUTC) / (1000 * 60 * 60 * 24))
}

export async function POST(req: NextRequest) {
  try {
    type CertItem = {
      curso: string
      fechaVencimiento: string
      fechaEmision?: string
      trabajador: {
        nombre?: string | null
        apellido?: string | null
        rut?: string | null
        centroTrabajo?: string | null
      }
    }

    type ExportBody = {
      empresaNombre: string
      empresaRut: string
      certificaciones: CertItem[]
      filtroLabel?: string
    }

    const {
      empresaNombre,
      empresaRut,
      certificaciones,
      filtroLabel,
    } = (await req.json()) as ExportBody

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pages: PDFPage[] = []

    // 📄 Tamaño carta (Letter): 612 x 792
    const LETTER_SIZE: [number, number] = [612, 792]

    // 📎 Logo desde /public/logo.png
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const logoBytes = await fs.readFile(logoPath)
    const logoImage = await pdfDoc.embedPng(logoBytes)
    const logoDims = logoImage.scale(1)

    const headerColor = rgb(0.05, 0.25, 0.5)
    const borderColor = rgb(0.8, 0.85, 0.9)
    const rowLineColor = rgb(0.9, 0.92, 0.95) // líneas muy suaves

    // 👉 columnas (sin Emisión)
    const cols = [
      { label: 'Curso', width: 80 },
      { label: 'Trabajador', width: 140 },
      { label: 'RUT', width: 80 },
      { label: 'Centro de Trabajo', width: 120 },
      { label: 'Vencimiento', width: 70 },
      { label: 'Estado', width: 50 },
    ]

    const totalTableWidth = cols.reduce((a, c) => a + c.width, 0)

    const x = 40
    const headerBandHeight = 60

    let page = pdfDoc.addPage(LETTER_SIZE)
    let { height, width } = page.getSize()
    let y = height - headerBandHeight - 40 // se ajusta en preparePage

    // 🔹 Encabezado superior con logo + datos de la empresa de capacitación
    const drawPageHeader = (p: PDFPage) => {
      const { width: pw, height: ph } = p.getSize()

      // banda de color muy suave
      p.drawRectangle({
        x: 0,
        y: ph - headerBandHeight,
        width: pw,
        height: headerBandHeight,
        color: rgb(0.95, 0.97, 1),
      })

      // logo
      const logoTargetHeight = headerBandHeight * 0.6
      const logoScale = logoTargetHeight / logoDims.height
      const logoTargetWidth = logoDims.width * logoScale
      const logoX = 40
      const logoY = ph - headerBandHeight + (headerBandHeight - logoTargetHeight) / 2

      p.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoTargetWidth,
        height: logoTargetHeight,
      })

      // texto
      const textX = logoX + logoTargetWidth + 16
      const titleY = ph - headerBandHeight + headerBandHeight - 22

      // Nombre empresa
      p.drawText('Rigging and Lifting Training SpA', {
        x: textX,
        y: titleY,
        size: 14,
        font,
        color: headerColor,
      })

      // Mail y teléfono (más chico)
      p.drawText('Email: contacto@ryltraining.cl', {
        x: textX,
        y: titleY - 14,
        size: 9,
        font,
        color: rgb(0.2, 0.2, 0.2),
      })

      p.drawText('Teléfono: +56941423741', {
        x: textX,
        y: titleY - 26,
        size: 9,
        font,
        color: rgb(0.2, 0.2, 0.2),
      })
    }

    const drawHeader = () => {
      const headerHeight = 22
      // header sólido con línea inferior
      page.drawRectangle({
        x,
        y: y - headerHeight,
        width: totalTableWidth,
        height: headerHeight,
        color: headerColor,
      })

      page.drawLine({
        start: { x, y: y - headerHeight },
        end: { x: x + totalTableWidth, y: y - headerHeight },
        thickness: 0.4,
        color: rgb(0.02, 0.17, 0.35),
      })

      let colX = x + 10
      cols.forEach((col) => {
        page.drawText(col.label, {
          x: colX,
          y: y - 15,
          size: 10,
          font,
          color: rgb(1, 1, 1),
        })
        colX += col.width
      })
      y -= headerHeight + 6
    }

    // 🔹 Prepara cada página nueva: header + datos de empresa + título + filtro + línea + encabezado de tabla
    const preparePage = () => {
      drawPageHeader(page)

      // margen bajo el header
      y = height - headerBandHeight - 30

      // Etiqueta pequeña para separar
      page.drawText('Datos de la empresa', {
        x: 40,
        y,
        size: 9,
        font,
        color: rgb(0.45, 0.45, 0.45),
      })
      y -= 14

      // Empresa y RUT
      page.drawText(`Empresa: ${empresaNombre}`, { x: 40, y, size: 12, font })
      y -= 16
      page.drawText(`RUT: ${empresaRut}`, { x: 40, y, size: 12, font })
      y -= 16

      // línea suave para separar bloque de empresa vs listado
      page.drawLine({
        start: { x: 40, y: y + 6 },
        end: { x: width - 40, y: y + 6 },
        thickness: 0.7,
        color: borderColor,
      })
      y -= 14

      // Título de la sección + filtro
      const title = 'Listado de certificaciones por empresa'
      const filtroTexto = `Filtro: ${filtroLabel ?? 'Todas las certificaciones'}`

      page.drawText(title, {
        x: 40,
        y,
        size: 11,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })

      const filtroWidth = font.widthOfTextAtSize(filtroTexto, 9)
      const filtroX = width - 40 - filtroWidth

      page.drawText(filtroTexto, {
        x: filtroX,
        y: y + 1,
        size: 9,
        font,
        color: rgb(0.25, 0.35, 0.55),
      })

      y -= 18

      // Línea divisoria antes de tabla
      page.drawLine({
        start: { x: 40, y: y + 8 },
        end: { x: width - 40, y: y + 8 },
        thickness: 0.5,
        color: borderColor,
      })

      // Encabezado de columnas
      drawHeader()
    }

    const nuevaPagina = () => {
      pages.push(page)
      page = pdfDoc.addPage(LETTER_SIZE)
      const sz = page.getSize()
      height = sz.height
      width = sz.width
      preparePage()
    }

    // 👉 Primera página
    preparePage()

    // Filas
    const fontSizeRow = 8
    const fRow = font as FontWithMetrics
    const baseLineRow = fRow.heightAtSize ? fRow.heightAtSize(fontSizeRow) : fontSizeRow * 1.2
    const lineHeight = baseLineRow * 1.05
    const bottomMargin = 80

    let rowIndex = 0

    certificaciones.forEach((cert: CertItem) => {
      const status = getCertStatus(cert.fechaVencimiento)
      const trabajadorNombre = `${cert.trabajador.nombre ?? ''} ${cert.trabajador.apellido ?? ''}`.trim()
      const rutTrabajador = cert.trabajador.rut || '—'
      const centroTrabajo = cert.trabajador.centroTrabajo || '—'

      const venceStr = cert.fechaVencimiento
        ? new Date(cert.fechaVencimiento).toLocaleDateString('es-CL')
        : ''

      const linesCurso = wrapTextByWidth(String(cert.curso ?? ''), font, fontSizeRow, cols[0].width - 14)
      const linesTrabajador = wrapTextByWidth(trabajadorNombre, font, fontSizeRow, cols[1].width - 14)
      const linesRut = wrapTextByWidth(String(rutTrabajador), font, fontSizeRow, cols[2].width - 14)
      const linesCentro = wrapTextByWidth(String(centroTrabajo), font, fontSizeRow, cols[3].width - 14)
      const linesVence = wrapTextByWidth(venceStr, font, fontSizeRow, cols[4].width - 14)
      const linesEstado = wrapTextByWidth(String(status.label), font, fontSizeRow, cols[5].width - 14)

      const maxLines = Math.max(
        linesCurso.length,
        linesTrabajador.length,
        linesRut.length,
        linesCentro.length,
        linesVence.length,
        linesEstado.length
      )

      const rowHeight = maxLines * lineHeight + 10

      if (y - rowHeight < bottomMargin) {
        nuevaPagina()
      }

      let colX = x
      const textTop = y - 6

      const allLines = [
        linesCurso,
        linesTrabajador,
        linesRut,
        linesCentro,
        linesVence,
        linesEstado,
      ]

      for (let i = 0; i < cols.length; i++) {
        const col = cols[i]

        if (i === cols.length - 1) {
          // 👉 Badge para ESTADO
          const label = status.label
          const paddingX = 4
          const paddingY = 2
          const textWidth = font.widthOfTextAtSize(label, fontSizeRow)
          const badgeWidth = textWidth + paddingX * 2
          const badgeHeight = fontSizeRow + paddingY * 2

          const badgeX = colX + (col.width - badgeWidth) / 2
          const badgeY = y - rowHeight / 2 - badgeHeight / 2 + 2

          page.drawRectangle({
            x: badgeX,
            y: badgeY,
            width: badgeWidth,
            height: badgeHeight,
            color: status.color,
          })

          page.drawText(label, {
            x: badgeX + paddingX,
            y: badgeY + paddingY,
            size: fontSizeRow,
            font,
            color: rgb(1, 1, 1),
          })
        } else {
          // resto de columnas: texto normal con más padding
          const lines = allLines[i]
          drawLines(page, lines, colX + 10, textTop, col.width - 20, font, fontSizeRow, rgb(0, 0, 0))
        }

        colX += col.width
      }

      // línea horizontal suave al final de la fila (sin cebra)
      page.drawLine({
        start: { x, y: y - rowHeight },
        end: { x: x + totalTableWidth, y: y - rowHeight },
        thickness: 0.25,
        color: rowLineColor,
      })

      y -= rowHeight
      rowIndex += 1
    })

    pages.push(page)

    // Pie de página
    const now = new Date()
    const fechaHora = now.toLocaleString('es-CL')

    pages.forEach((p, idx) => {
      const { width: pw } = p.getSize()

      p.drawText(`Generado: ${fechaHora}`, {
        x: 40,
        y: 30,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      p.drawText(`Página ${idx + 1} / ${pages.length}`, {
        x: pw - 100,
        y: 30,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
    })

    const pdfBytes = await pdfDoc.save()
    const fechaNombre = new Date().toISOString().slice(0, 10)
    const safeEmpresa = String(empresaNombre || 'empresa').replace(/[^a-zA-Z0-9-_]+/g, '-')
    const filename = `certificaciones_${safeEmpresa}_${fechaNombre}.pdf`

    const ab = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer

    return new Response(ab, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('❌ Error en export-pdf:', msg)
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 })
  }
}

// ahora status incluye color
function getCertStatus(fecha: string) {
  const dias = daysUntil(fecha)

  if (!Number.isFinite(dias)) {
    return { label: '—', color: rgb(0.2, 0.2, 0.2) }
  }

  if (dias <= 0) {
    return { label: 'CRÍTICO', color: rgb(0.8, 0.1, 0.1) }
  }

  if (dias <= 30) {
    return { label: 'ATENCIÓN', color: rgb(0.9, 0.5, 0.1) }
  }

  return { label: 'VIGENTE', color: rgb(0.1, 0.6, 0.2) }
}
