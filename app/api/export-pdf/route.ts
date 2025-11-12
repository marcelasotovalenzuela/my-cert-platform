// app/api/export-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'

// ➕ Tipo mínimo para usar heightAtSize sin `any`
type FontWithMetrics = import('pdf-lib').PDFFont & {
  heightAtSize?: (size: number) => number
}

/** Medición y quiebre manual de texto para pdf-lib */
function wrapTextByWidth(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = String(text ?? "").split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? current + " " + w : w;
    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      // si una palabra sola excede el ancho, partirla por caracteres
      if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
        let buf = "";
        for (const ch of w) {
          const t = buf + ch;
          if (font.widthOfTextAtSize(t, fontSize) <= maxWidth) {
            buf = t;
          } else {
            if (buf) lines.push(buf);
            buf = ch;
          }
        }
        current = buf;
      } else {
        current = w;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
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
  // 🔧 sin `any`
  const f = font as FontWithMetrics
  const baseLine = f.heightAtSize ? f.heightAtSize(fontSize) : fontSize * 1.2
  const lineHeight = baseLine * 1.05; // leve espacio entre líneas
  let y = yTop - 2; // pequeño padding desde el borde superior
  for (const ln of lines) {
    page.drawText(ln, { x, y, size: fontSize, font, color, maxWidth: width });
    y -= lineHeight;
  }
}

// 🔹 Días “seguros” (UTC) hasta la fecha de vencimiento
function daysUntil(dateISO: string) {
  if (!dateISO) return Infinity;
  const d = new Date(dateISO);
  if (isNaN(d.getTime())) return Infinity;
  const todayUTC = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  const dueUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((dueUTC - todayUTC) / (1000 * 60 * 60 * 24));
}

export async function POST(req: NextRequest) {
  try {
    type CertItem = {
      curso: string
      fechaVencimiento: string
      trabajador: {
        nombre?: string | null
        apellido?: string | null
        centroTrabajo?: string | null
      }
    }

    type ExportBody = {
      empresaNombre: string
      empresaRut: string
      certificaciones: CertItem[]
    }

    const { empresaNombre, empresaRut, certificaciones } = (await req.json()) as ExportBody

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pages: PDFPage[] = []

    let page = pdfDoc.addPage([595, 842]) // A4
    let { height, width } = page.getSize()
    let y = height - 80

    const headerColor = rgb(0, 0.4, 0.8)
    const borderColor = rgb(0.6, 0.6, 0.6)

    const cols = [
      { label: 'Curso', width: 90 },
      { label: 'Vence', width: 70 },
      { label: 'Estado', width: 70 },
      { label: 'Trabajador', width: 180 },
      { label: 'Centro de Trabajo', width: 125 },
    ];

    const x = 40;

    const drawHeader = () => {
      const headerHeight = 20;
      const totalWidth = cols.reduce((a, c) => a + c.width, 0);
      page.drawRectangle({
        x,
        y: y - headerHeight,
        width: totalWidth,
        height: headerHeight,
        color: headerColor,
        borderColor,
        borderWidth: 1,
      });

      let colX = x + 5;
      cols.forEach((col) => {
        page.drawText(col.label, {
          x: colX,
          y: y - 15,
          size: 10,
          font,
          color: rgb(1, 1, 1),
        });
        colX += col.width;
      });
      y -= headerHeight + 5;
    };

    const nuevaPagina = () => {
      pages.push(page);
      page = pdfDoc.addPage([595, 842]);
      const sz = page.getSize();
      height = sz.height;
      width = sz.width;
      y = height - 80;
      drawHeader();
    };

    // Empresa y RUT
    page.drawText(`Empresa: ${empresaNombre}`, { x: 40, y, size: 12, font })
    y -= 16
    page.drawText(`RUT: ${empresaRut}`, { x: 40, y, size: 12, font })
    y -= 26

    // Línea divisoria
    page.drawLine({
      start: { x: 40, y: y + 8 },
      end: { x: width - 40, y: y + 8 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Encabezado de columnas
    drawHeader();

    // Filas
    const fontSizeRow = 9;
    // 🔧 sin `any`
    const fRow = font as FontWithMetrics
    const baseLineRow = fRow.heightAtSize ? fRow.heightAtSize(fontSizeRow) : fontSizeRow * 1.2
    const lineHeight = baseLineRow * 1.05;
    const bottomMargin = 80;

    certificaciones.forEach((cert: CertItem) => {
      const status = getCertStatus(cert.fechaVencimiento);
      const trabajadorNombre = `${cert.trabajador.nombre ?? ''} ${cert.trabajador.apellido ?? ''}`.trim();
      const centroTrabajo = cert.trabajador.centroTrabajo || '—';
      const venceStr = new Date(cert.fechaVencimiento).toLocaleDateString();

      const linesCurso      = wrapTextByWidth(String(cert.curso ?? ''), font, fontSizeRow, cols[0].width - 10);
      const linesVence      = wrapTextByWidth(venceStr,                 font, fontSizeRow, cols[1].width - 10);
      const linesEstado     = wrapTextByWidth(String(status.label),     font, fontSizeRow, cols[2].width - 10);
      const linesTrabajador = wrapTextByWidth(trabajadorNombre,         font, fontSizeRow, cols[3].width - 10);
      const linesCentro     = wrapTextByWidth(String(centroTrabajo),    font, fontSizeRow, cols[4].width - 10);

      const rowHeight = (linesTrabajador.length * lineHeight) + 10;

      if (y - rowHeight < bottomMargin) {
        nuevaPagina();
      }

      let colX = x;
      const textTop = y - 6;

      for (let i = 0; i < cols.length; i++) {
        page.drawRectangle({
          x: colX,
          y: y - rowHeight,
          width: cols[i].width,
          height: rowHeight,
          borderColor,
          borderWidth: 0.5,
        });

        const lines = [linesCurso, linesVence, linesEstado, linesTrabajador, linesCentro][i];
        drawLines(page, lines, colX + 5, textTop, cols[i].width - 10, font, fontSizeRow, rgb(0, 0, 0));

        colX += cols[i].width;
      }

      y -= rowHeight;
    });

    pages.push(page)

    // Pie de página
    const now = new Date()
    const fechaHora = now.toLocaleString()
    pages.forEach((p, idx) => {
      p.drawText(`Generado: ${fechaHora}`, {
        x: 40,
        y: 30,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      p.drawText(`Página ${idx + 1} / ${pages.length}`, {
        x: width - 100,
        y: 30,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
    })

    const pdfBytes = await pdfDoc.save();
    const fechaNombre = new Date().toISOString().slice(0,10);
    const safeEmpresa = String(empresaNombre || 'empresa').replace(/[^a-zA-Z0-9-_]+/g, '-');
    const filename = `certificaciones_${safeEmpresa}_${fechaNombre}.pdf`;

    // Convert Uint8Array -> ArrayBuffer to satisfy BodyInit in Next Response
    const ab = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    ) as ArrayBuffer;

    return new Response(ab, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('❌ Error en export-pdf:', msg)
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 })
  }
}

function getCertStatus(fecha: string) {
  const dias = daysUntil(fecha);
  if (dias < 30) return { label: 'Crítico' };   // incluye vencidas
  if (dias < 90) return { label: 'Atención' };
  return { label: 'Vigente' };
}
