/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/empresas?id=... ó /api/empresas?email=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const emailParam = searchParams.get("email");

    const id = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null;
    const email = emailParam?.trim()?.toLowerCase() || null;

    if (!id && !email) {
      return NextResponse.json(
        { ok: false, error: "Falta parámetro: id (número) o email" },
        { status: 400 }
      );
    }

    let empresa = null;

    if (id) {
      empresa = await prisma.empresa.findUnique({
        where: { id },
        include: {
          trabajadores: {
            include: { certificaciones: true },
            orderBy: { id: "asc" },
          },
        },
      });
    } else if (email) {
      empresa = await prisma.empresa.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        include: {
          trabajadores: {
            include: { certificaciones: true },
            orderBy: { id: "asc" },
          },
        },
      });
    }

    if (!empresa) {
      return NextResponse.json(
        { ok: false, error: "Empresa no encontrada" },
        { status: 404 }
      );
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
        centroTrabajo: t.centroTrabajo ?? null,
        certificaciones: (t.certificaciones ?? []).map((c) => ({
          id: c.id,
          curso: c.curso,
          fechaEmision:
            c.fechaEmision instanceof Date
              ? c.fechaEmision.toISOString()
              : String(c.fechaEmision),
          fechaVencimiento:
            c.fechaVencimiento instanceof Date
              ? c.fechaVencimiento.toISOString()
              : String(c.fechaVencimiento),
        })),
      })),
    };

    // 👇 IMPORTANTE:
    // Antes aquí se enviaba un correo automático en cada GET
    // con las certificaciones CRÍTICAS / ATENCIÓN.
    // Lo eliminamos para que:
    //  - /empresas solo LEA información
    //  - El envío de alertas se haga SOLO cuando cambie el estado
    //    de una certificación (eso lo implementaremos en otro flujo).

    return NextResponse.json(
      { ok: true, empresa: empresaOut },
      { status: 200 }
    );
  } catch (e) {
    console.error("❌ Error en GET /api/empresas:", e);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST /api/empresas?action=recertificar
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action !== "recertificar") {
      return NextResponse.json(
        { ok: false, error: "Acción no soportada" },
        { status: 400 }
      );
    }

    type RecertBody = {
      empresaId?: number;
      empresaNombre?: string;
      empresaEmail?: string;
      trabajadorId: number;
      trabajadorNombre: string;
      curso: string;
    };

    const body = (await req.json().catch(() => ({}))) as Partial<RecertBody>;
    const {
      empresaId,
      empresaNombre,
      empresaEmail,
      trabajadorId,
      trabajadorNombre,
      curso,
    } = body;

    if (!trabajadorId || !trabajadorNombre || !curso) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const to =
      process.env.RECERT_NOTIFY_TO || "marcelasotovalenzuela@gmail.com";

    if (!host || !user || !pass) {
      console.warn("⚠️ SMTP incompleto. Enviando en modo simulado.");
      console.log({
        empresaId,
        empresaNombre,
        empresaEmail,
        trabajadorId,
        trabajadorNombre,
        curso,
      });
      return NextResponse.json({
        ok: true,
        mocked: true,
        message: "SMTP incompleto, correo NO enviado (modo simulado)",
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const link = `https://ryltraining.cl/empresas?id=${empresaId ?? ""}&autoFocus=criticos`;

    const subject = `Solicitud de recertificación – ${empresaNombre || "Empresa"}`;

    const text = [
      `Solicitud de recertificación`,
      ``,
      `Empresa: ${empresaNombre} (ID: ${empresaId ?? "N/A"})`,
      `Correo empresa: ${empresaEmail || "N/A"}`,
      `Trabajador: ${trabajadorNombre} (ID: ${trabajadorId})`,
      `Curso: ${curso}`,
      `Fecha solicitud: ${new Date().toLocaleString("es-CL")}`,
      ``,
      `👉 Solicitar recertificación ahora:`,
      link,
    ].join("\n");

    const html = `
      <p><strong>Solicitud de recertificación</strong></p>
      <ul>
        <li><strong>Empresa:</strong> ${empresaNombre} (ID: ${
      empresaId ?? "N/A"
    })</li>
        <li><strong>Correo empresa:</strong> ${empresaEmail || "N/A"}</li>
        <li><strong>Trabajador:</strong> ${trabajadorNombre} (ID: ${trabajadorId})</li>
        <li><strong>Curso:</strong> ${curso}</li>
        <li><strong>Fecha solicitud:</strong> ${new Date().toLocaleString(
          "es-CL"
        )}</li>
      </ul>

      <p>Para gestionar la recertificación de inmediato, haz clic aquí:</p>

      <p>
        <a href="${link}"
          style="
            display:inline-block;
            padding:10px 16px;
            background:#1a73e8;
            color:white;
            text-decoration:none;
            border-radius:6px;
            font-weight:600;
          ">
          👉 Solicitar recertificación ahora
        </a>
      </p>
    `;

    await transporter.sendMail({
      from: `"Recertificaciones" <${user}>`,
      to,
      bcc: to,
      subject,
      text,
      html,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("❌ Error POST /api/empresas?action=recertificar", err);
    return NextResponse.json(
      { ok: false, error: "Error al enviar correo" },
      { status: 500 }
    );
  }
}
