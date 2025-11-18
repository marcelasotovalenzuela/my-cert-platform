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
    const email = emailParam?.trim().toLowerCase() || null;

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

    // Alerta automática por certificaciones en estado crítico o de atención
    try {
      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT || 587);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const notifyTo =
        process.env.RECERT_NOTIFY_TO || "marcelasotovalenzuela@gmail.com";

      if (!host || !user || !pass) {
        console.warn(
          "⚠️ SMTP incompleto. No se envía alerta automática de certificaciones."
        );
      } else if (empresa.trabajadores && empresa.trabajadores.length > 0) {
        type CertAlerta = {
          trabajador: string;
          curso: string;
          ct: string | null;
          estado: "CRÍTICO" | "ATENCIÓN";
          vence: string;
        };

        const ahora = new Date();
        const alertas: CertAlerta[] = [];

        for (const t of empresa.trabajadores ?? []) {
          for (const c of t.certificaciones ?? []) {
            if (!c.fechaVencimiento) continue;

            const venceDate =
              c.fechaVencimiento instanceof Date
                ? c.fechaVencimiento
                : new Date(c.fechaVencimiento as any);
            if (isNaN(venceDate.getTime())) continue;

            const diffMs = venceDate.getTime() - ahora.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            let estado: "CRÍTICO" | "ATENCIÓN" | null = null;
            if (diffDays <= 0) {
              estado = "CRÍTICO";
            } else if (diffDays <= 30) {
              estado = "ATENCIÓN";
            }

            if (estado) {
              alertas.push({
                trabajador: t.nombre,
                curso: c.curso,
                ct: t.centroTrabajo ?? null,
                estado,
                vence: venceDate.toLocaleDateString("es-CL"),
              });
            }
          }
        }

        if (alertas.length > 0 && empresa.email) {
          const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
          });

          const from =
            process.env.EMAIL_FROM || `R&L Training <${user}>`;
          const subject = `Alertas de certificaciones críticas / en atención – ${empresa.nombre}`;

          const lineas = alertas.map((a) => {
            const tag =
              a.estado === "CRÍTICO" ? "CRÍTICO" : "ATENCIÓN";
            return `- ${a.trabajador} · ${a.curso} · CT: ${
              a.ct || "-"
            } · Estado: ${tag} · Vence: ${a.vence}`;
          });

          const text = [
            `Hola ${empresa.nombre},`,
            ``,
            `Te escribimos desde R&L Training porque detectamos certificaciones de tus trabajadores que están en estado CRÍTICO o de ATENCIÓN.`,
            ``,
            ...lineas,
            ``,
            `Para gestionar la recertificación de inmediato, puedes ingresar a tu panel de empresa en R&L Training.`,
            ``,
            `Si necesitas apoyo para coordinar recertificaciones, puedes responder a este correo o escribir a juan.aguayo@ryltraining.cl.`,
            ``,
            `R&L Training`,
          ].join("\n");

          const html = `
            <p>Hola <strong>${empresa.nombre}</strong>,</p>
            <p>Te escribimos desde <strong>R&amp;L Training</strong> porque detectamos certificaciones de tus trabajadores que están en estado <strong>CRÍTICO</strong> o de <strong>ATENCIÓN</strong>.</p>
            <ul>
              ${alertas
                .map((a) => {
                  const tag =
                    a.estado === "CRÍTICO" ? "CRÍTICO" : "ATENCIÓN";
                  return `<li>${a.trabajador} · ${a.curso} · CT: ${
                    a.ct || "-"
                  } · Estado: <strong>${tag}</strong> · Vence: ${
                    a.vence
                  }</li>`;
                })
                .join("")}
            </ul>
            <p>Para gestionar la recertificación de inmediato, puedes ingresar a tu panel de empresa en R&amp;L Training.</p>
            <p>Si necesitas apoyo para coordinar recertificaciones, puedes responder a este correo o escribir a <a href="mailto:juan.aguayo@ryltraining.cl">juan.aguayo@ryltraining.cl</a>.</p>
            <p>R&amp;L Training</p>
          `;

          await transporter.sendMail({
            from,
            to: empresa.email,
            bcc: notifyTo,
            subject,
            text,
            html,
          });

          console.log(
            `📧 Alerta automática de certificaciones enviada a ${empresa.email} (BCC: ${notifyTo})`
          );
        }
      }
    } catch (alertErr) {
      console.error(
        "❌ Error enviando alerta automática de certificaciones:",
        alertErr
      );
    }

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
        <li><strong>Empresa:</strong> ${empresaNombre} (ID: ${empresaId ?? "N/A"})</li>
        <li><strong>Correo empresa:</strong> ${empresaEmail || "N/A"}</li>
        <li><strong>Trabajador:</strong> ${trabajadorNombre} (ID: ${trabajadorId})</li>
        <li><strong>Curso:</strong> ${curso}</li>
        <li><strong>Fecha solicitud:</strong> ${new Date().toLocaleString("es-CL")}</li>
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
