import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tipos mínimos (coinciden con tu select/include)
type CertificacionDTO = {
  id: number;
  curso: string;
  fechaEmision: string;
  fechaVencimiento: string;
};

type TrabajadorDTO = {
  id: number;
  nombre: string;
  apellido?: string | null;
  centroTrabajo?: string | null;
  certificaciones: CertificacionDTO[];
};

type EmpresaDTO = {
  id: number;
  nombre: string;
  rut?: string | null;
  email: string;
  trabajadores: TrabajadorDTO[];
};

export async function GET(req: NextRequest) {
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

    let empresaOut: EmpresaDTO | null = null;

    if (id) {
      const e = await prisma.empresa.findUnique({
        where: { id },
        include: {
          trabajadores: {
            include: { certificaciones: true },
            orderBy: { id: "asc" },
          },
        },
      });

      if (e) {
        empresaOut = {
          id: e.id,
          nombre: e.nombre,
          rut: e.rut ?? null,
          email: e.email,
          trabajadores: (e.trabajadores || []).map((t) => ({
            id: t.id,
            nombre: t.nombre,
            apellido: t.apellido ?? null,
            centroTrabajo: t.centroTrabajo ?? null,
            certificaciones: (t.certificaciones || []).map((c) => ({
              id: c.id,
              curso: c.curso,
              fechaEmision: c.fechaEmision,
              fechaVencimiento: c.fechaVencimiento,
            })),
          })),
        };
      }
    } else if (email) {
      // Búsqueda por email case-insensitive
      const e = await prisma.empresa.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        include: {
          trabajadores: {
            include: { certificaciones: true },
            orderBy: { id: "asc" },
          },
        },
      });

      if (e) {
        empresaOut = {
          id: e.id,
          nombre: e.nombre,
          rut: e.rut ?? null,
          email: e.email,
          trabajadores: (e.trabajadores || []).map((t) => ({
            id: t.id,
            nombre: t.nombre,
            apellido: t.apellido ?? null,
            centroTrabajo: t.centroTrabajo ?? null,
            certificaciones: (t.certificaciones || []).map((c) => ({
              id: c.id,
              curso: c.curso,
              fechaEmision: c.fechaEmision,
              fechaVencimiento: c.fechaVencimiento,
            })),
          })),
        };
      }
    }

    if (!empresaOut) {
      return NextResponse.json(
        { ok: false, error: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, empresa: empresaOut }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ Error en GET /api/empresas:", msg);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    if (action !== "recertificar") {
      return NextResponse.json({ ok: false, error: "Acción no soportada" }, { status: 400 });
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Error POST /api/empresas?action=recertificar", msg);
    return NextResponse.json({ ok: false, error: "Error al enviar correo" }, { status: 500 });
  }
}
