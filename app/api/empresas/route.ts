import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ajusta si tu import es distinto

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const emailParam = searchParams.get("email");

    // Normaliza
    const id = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null;
    const email = emailParam?.trim().toLowerCase() || null;

    if (!id && !email) {
      return NextResponse.json(
        { ok: false, error: "Falta parámetro: id (número) o email" },
        { status: 400 }
      );
    }

    let empresa;

    if (id) {
      empresa = await prisma.empresa.findUnique({
        where: { id },
        include: {
          trabajadores: {
            include: {
              certificaciones: true,
            },
            orderBy: { id: 'asc' },
          },
        },
      });
    } else if (email) {
      // Búsqueda por email case-insensitive
      empresa = await prisma.empresa.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        include: {
          trabajadores: {
            include: {
              certificaciones: true,
            },
            orderBy: { id: 'asc' },
          },
        },
      });
    }

    // Normaliza arreglos anidados para evitar undefined en el cliente
    if (empresa && Array.isArray((empresa as any).trabajadores)) {
      (empresa as any).trabajadores = (empresa as any).trabajadores.map((t: any) => ({
        ...t,
        certificaciones: Array.isArray(t.certificaciones) ? t.certificaciones : [],
      }))
    }

    if (!empresa) {
      return NextResponse.json(
        { ok: false, error: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, empresa }, { status: 200 });
  } catch (e: any) {
    console.error("❌ Error en GET /api/empresas:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    if (action !== "recertificar") {
      return NextResponse.json({ ok: false, error: "Acción no soportada" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      empresaId,
      empresaNombre,
      empresaEmail,
      trabajadorId,
      trabajadorNombre,
      curso,
    } = body || {};

    if (!trabajadorId || !trabajadorNombre || !curso) {
      return NextResponse.json({ ok: false, error: "Faltan datos obligatorios" }, { status: 400 });
    }

    // Config SMTP desde env (con fallback a tu correo por requerimiento)
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const to   = process.env.RECERT_NOTIFY_TO || "marcelasotovalenzuela@gmail.com";

    // Si no hay SMTP configurado, devolver OK simulado y loguear
    if (!host || !user || !pass) {
      console.warn("⚠️ SMTP incompleto. Enviando en modo simulado.");
      console.log({ empresaId, empresaNombre, empresaEmail, trabajadorId, trabajadorNombre, curso });
      return NextResponse.json({ ok: true, mocked: true });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const subject = `RYL RECERTIFICACION – ${empresaNombre || "Empresa"}`;
    const text = [
      `RYL RECERTIFICACION`,
      ``,
      `Empresa: ${empresaNombre} (ID: ${empresaId ?? "N/A"})`,
      `Correo empresa: ${empresaEmail || "N/A"}`,
      `Trabajador: ${trabajadorNombre} (ID: ${trabajadorId})`,
      `Curso: ${curso}`,
      `Fecha: ${new Date().toLocaleString()}`,
    ].join("\n");

    const html = `
      <p><strong>RYL RECERTIFICACION</strong></p>
      <ul>
        <li><strong>Empresa:</strong> ${empresaNombre} (ID: ${empresaId ?? "N/A"})</li>
        <li><strong>Correo empresa:</strong> ${empresaEmail || "N/A"}</li>
        <li><strong>Trabajador:</strong> ${trabajadorNombre} (ID: ${trabajadorId})</li>
        <li><strong>Curso:</strong> ${curso}</li>
        <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
      </ul>
    `;

    await transporter.sendMail({
      from: `"Recertificaciones" <${user}>`,
      to,
      subject,
      text,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("❌ Error POST /api/empresas?action=recertificar", err);
    return NextResponse.json({ ok: false, error: "Error al enviar correo" }, { status: 500 });
  }
}
