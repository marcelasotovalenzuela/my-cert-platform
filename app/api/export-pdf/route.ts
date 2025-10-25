// app/api/export-pdf/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

/** Medición y quiebre manual de texto para pdf-lib */
function wrapTextByWidth(text: string, font: any, fontSize: number, maxWidth: number): string[] {
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
function drawLines(page: any, lines: string[], x: number, yTop: number, width: number, font: any, fontSize: number, color: any) {
  const baseLine = font.heightAtSize ? font.heightAtSize(fontSize) : fontSize * 1.2;
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

export async function POST(req: Request) {
  try {
    const { empresaNombre, empresaRut, certificaciones } = await req.json()

    const empresaNombreFinal = empresaNombre
    const empresaRutFinal = empresaRut
    const listaCerts = certificaciones

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pages: any[] = []

    let page = pdfDoc.addPage([595, 842]) // A4
    let { height, width } = page.getSize()
    let y = height - 80
    let pageNumber = 1

    const drawHeader = () => {
      // Encabezado
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
      pageNumber++;
      drawHeader();
    };

    // Colores de tabla
    const headerColor = rgb(0, 0.4, 0.8)
    const borderColor = rgb(0.6, 0.6, 0.6)

    // Columnas ajustadas (más ancho para Trabajador)
    const cols = [
      { label: 'Curso', width: 90 },
      { label: 'Vence', width: 70 },
      { label: 'Estado', width: 70 },
      { label: 'Trabajador', width: 180 },         // ⟵ más ancho para nombres largos
      { label: 'Centro de Trabajo', width: 125 },
    ];

    let x = 40;

    // Empresa y RUT (primero, para que el encabezado de columnas quede debajo)
    page.drawText(`Empresa: ${empresaNombreFinal}`, { x: 40, y, size: 12, font })
    y -= 16
    page.drawText(`RUT: ${empresaRutFinal}`, { x: 40, y, size: 12, font })
    y -= 26 // más espacio antes del header

    // Línea divisoria opcional para separar el bloque superior
    page.drawLine({
      start: { x: 40, y: y + 8 },
      end: { x: width - 40, y: y + 8 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Dibuja encabezado de columnas bajo el bloque de empresa
    drawHeader();

    // Filas con ajuste de alto dinámico y wrap en columnas
    const fontSizeRow = 9;
    const baseLineRow = font.heightAtSize ? font.heightAtSize(fontSizeRow) : fontSizeRow * 1.2;
    const lineHeight = baseLineRow * 1.05;
    const bottomMargin = 80;

    listaCerts.forEach((cert: any) => {
      const status = getCertStatus(cert.fechaVencimiento);
      const trabajadorNombre = `${cert.trabajador.nombre ?? ''} ${cert.trabajador.apellido ?? ''}`.trim();
      const centroTrabajo = cert.trabajador.centroTrabajo || '—';
      const venceStr = new Date(cert.fechaVencimiento).toLocaleDateString();

      // Preparar líneas por columna
      const linesCurso      = wrapTextByWidth(String(cert.curso ?? ''), font, fontSizeRow, cols[0].width - 10);
      const linesVence      = wrapTextByWidth(venceStr,                 font, fontSizeRow, cols[1].width - 10);
      const linesEstado     = wrapTextByWidth(String(status.label),     font, fontSizeRow, cols[2].width - 10);
      const linesTrabajador = wrapTextByWidth(trabajadorNombre,         font, fontSizeRow, cols[3].width - 10); // ⟵ clave
      const linesCentro     = wrapTextByWidth(String(centroTrabajo),    font, fontSizeRow, cols[4].width - 10);

      // Ajusta la altura de la fila SOLO al contenido de la columna Trabajador (requerimiento)
      const rowHeight = (linesTrabajador.length * lineHeight) + 10; // padding superior/inferior

      // Salto de página si no cabe
      if (y - rowHeight < bottomMargin) {
        nuevaPagina();
      }

      // Dibuja celdas y texto multilínea
      let colX = x;
      const textTop = y - 6; // padding top dentro de la celda (alineado con baseline)

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
    const safeEmpresa = String(empresaNombreFinal || 'empresa').replace(/[^a-zA-Z0-9-_]+/g, '-');
    const filename = `certificaciones_${safeEmpresa}_${fechaNombre}.pdf`;
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('❌ Error en export-pdf:', err)
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 })
  }
}

function getCertStatus(fecha: string) {
  const dias = daysUntil(fecha);
  if (dias < 30) return { label: 'Crítico' };   // incluye vencidas
  if (dias < 90) return { label: 'Atención' };
  return { label: 'Vigente' };
}
