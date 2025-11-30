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

    const headerColor = rgb(0.13, 0.24, 0.33) // tono más neutro tipo slate
    const borderColor = rgb(0.85, 0.89, 0.94)
    const rowLineColor = rgb(0.93, 0.95, 0.98) // líneas muy suaves

    // 👉 columnas para la tabla exportada
    // El ancho total es 532 (= 612 - 80), que coincide con el contenido entre márgenes 40 y 40.
    const cols = [
      { key: "curso", label: "Curso", width: 110 },
      { key: "trabajador", label: "Trabajador", width: 135 },
      { key: "rut", label: "RUT", width: 60 },
      { key: "centro", label: "CT", width: 110 },
      { key: "vencimiento", label: "Vence", width: 60 },
      { key: "estado", label: "Estado", width: 60 },
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
      const headerHeight = 24
      const headerFontSize = 9

      // Solo una línea inferior muy suave (sin bloque relleno)
      page.drawLine({
        start: { x, y: y - headerHeight },
        end: { x: x + totalTableWidth, y: y - headerHeight },
        thickness: 0.6,
        color: borderColor,
      })

      // Encabezados en mayúscula, centrados dentro de cada columna, con posibilidad de 2 líneas
      let colX = x
      cols.forEach((col) => {
        const label = col.label.toUpperCase()
        const colLeft = colX
        const colCenter = colLeft + col.width / 2
        const maxWidth = col.width - 16 // padding horizontal dentro de la cabecera
        const lines = wrapTextByWidth(label, font, headerFontSize, maxWidth)
        const lineHeight = headerFontSize + 2
        const lineY = y - 14

        lines.slice(0, 2).forEach((ln, idx) => {
          const textWidth = font.widthOfTextAtSize(ln, headerFontSize)
          const textX = colCenter - textWidth / 2
          page.drawText(ln, {
            x: textX,
            y: lineY - idx * lineHeight,
            size: headerFontSize,
            font,
            color: rgb(0.45, 0.5, 0.55),
          })
        })

        colX += col.width
      })

      y -= headerHeight + 4
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
      y -= 22

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

      y -= 26

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

    // Filas - diseño minimal con wrap en curso, trabajador y centro
    const fontSizeRow = 9
    const bottomMargin = 80
    const fRow = font as FontWithMetrics
    const baseLineRow = fRow.heightAtSize ? fRow.heightAtSize(fontSizeRow) : fontSizeRow * 1.2
    const lineHeight = baseLineRow * 1.1
    let rowIndex = 0

    certificaciones.forEach((cert: CertItem) => {
      const status = getCertStatus(cert.fechaVencimiento)
      const trabajadorNombre = `${cert.trabajador.nombre ?? ""} ${cert.trabajador.apellido ?? ""}`.trim()
      const rutTrabajador = cert.trabajador.rut || "—"
      const centroTrabajo = cert.trabajador.centroTrabajo || "—"
      const venceStr = cert.fechaVencimiento
        ? new Date(cert.fechaVencimiento).toLocaleDateString("es-CL")
        : "—"

      const paddingX = 14

      // calcular líneas con wrap para las columnas largas
      const maxWidthCurso = cols[0].width - paddingX * 2
      const maxWidthTrabajador = cols[1].width - paddingX * 2
      const maxWidthCentro = cols[3].width - paddingX * 2

      const linesCurso = wrapTextByWidth(cert.curso || "—", font, fontSizeRow, maxWidthCurso)
      const linesTrabajador = wrapTextByWidth(trabajadorNombre || "—", font, fontSizeRow, maxWidthTrabajador)
      const linesCentro = wrapTextByWidth(centroTrabajo, font, fontSizeRow, maxWidthCentro)

      const maxLines = Math.max(linesCurso.length, linesTrabajador.length, linesCentro.length, 1)
      const rowHeight = Math.max(maxLines * lineHeight + 8, 24)

      if (y - rowHeight < bottomMargin) {
        nuevaPagina()
      }

      const yTop = y - 6

      // Curso
      let colX = x + paddingX
      drawLines(page, linesCurso, colX, yTop, maxWidthCurso, font, fontSizeRow, rgb(0.1, 0.1, 0.1))

      // Trabajador
      colX += cols[0].width
      drawLines(page, linesTrabajador, colX, yTop, maxWidthTrabajador, font, fontSizeRow, rgb(0.1, 0.1, 0.1))

        // RUT (una sola línea) centrado en su columna
        colX += cols[1].width
        {
          const colLeft = colX - paddingX // corregimos el padding
          const colCenter = colLeft + cols[2].width / 2
          const tw = font.widthOfTextAtSize(rutTrabajador, fontSizeRow)
          page.drawText(rutTrabajador, {
            x: colCenter - tw / 2,
            y: yTop - 2,
            size: fontSizeRow,
            font,
            color: rgb(0.15, 0.15, 0.15),
          })
        }

        // CT (Centro de Trabajo) con wrap y centrado por línea
        colX += cols[2].width
        {
          const colLeft = colX - paddingX // corregimos el padding
          const colWidth = cols[3].width
          const colCenter = colLeft + colWidth / 2
          const lh = lineHeight
          let yy = yTop - 2

          linesCentro.forEach((ln) => {
            const tw = font.widthOfTextAtSize(ln, fontSizeRow)
            page.drawText(ln, {
              x: colCenter - tw / 2,
              y: yy,
              size: fontSizeRow,
              font,
              color: rgb(0.15, 0.15, 0.15),
            })
            yy -= lh
          })
        }

        // Vence (una sola línea) centrado
        colX += cols[3].width
        {
          const colLeft = colX - paddingX // corregimos el padding
          const colCenter = colLeft + cols[4].width / 2
          const tw = font.widthOfTextAtSize(venceStr, fontSizeRow)
          page.drawText(venceStr, {
            x: colCenter - tw / 2,
            y: yTop - 2,
            size: fontSizeRow,
            font,
            color: rgb(0.15, 0.15, 0.15),
          })
        }

        // Estado: solo texto coloreado, centrado en su columna
        colX += cols[4].width
        {
          const estadoLabel = status.label
          const estadoColor = status.color
          const colLeft = colX - paddingX // corregimos el padding
          const colCenter = colLeft + cols[5].width / 2
          const tw = font.widthOfTextAtSize(estadoLabel, fontSizeRow)
          page.drawText(estadoLabel, {
            x: colCenter - tw / 2,
            y: yTop - 2,
            size: fontSizeRow,
            font,
            color: estadoColor,
          })
        }

      // Línea inferior muy suave por fila (sin zebra ni cajas)
      page.drawLine({
        start: { x, y: y - rowHeight },
        end: { x: x + totalTableWidth, y: y - rowHeight },
        thickness: 0.25,
        color: rgb(0.9, 0.93, 0.97),
      })

      y -= rowHeight
      rowIndex += 1
    })

    pages.push(page)

    // Pie de página (hora Chile)
    const now = new Date()
    const fechaHora = now.toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    pages.forEach((p, idx) => {
      const { width: pw } = p.getSize()

      p.drawText(`Generado: ${fechaHora} (hora Chile)`, {
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

    const ab = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength
      ) as ArrayBuffer

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
