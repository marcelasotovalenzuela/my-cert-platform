// app/api/alertas/estado-certificaciones/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (!smtpHost || !smtpUser || !smtpPass) {
  console.warn("⚠️ SMTP incompleto en /api/alertas/estado-certificaciones");
}

type CertResumen = {
  curso: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  fechaVencimiento: string;
  centroTrabajo: string;
  estado: string; // "Crítico" | "En atención"
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      emailDestino,
      empresaNombre,
      certificaciones,
    }: {
      emailDestino?: string;
      empresaNombre?: string;
      certificaciones?: CertResumen[];
    } = body;

    if (!emailDestino || !certificaciones || certificaciones.length === 0) {
      return NextResponse.json(
        { error: "Faltan datos para enviar la alerta" },
        { status: 400 }
      );
    }

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn(
        "⚠️ /api/alertas/estado-certificaciones en modo SIMULADO (SMTP incompleto)"
      );
      console.log({ emailDestino, empresaNombre, certificaciones });

      return NextResponse.json({
        ok: true,
        mocked: true,
        message:
          "Alerta simulada (SMTP incompleto en el servidor, no se envió correo).",
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const subject = `Certificaciones en estado crítico / en atención – ${empresaNombre ?? ""}`;

    const lineas = certificaciones.map((c) => {
      return `- ${c.curso} | Trabajador: ${c.trabajadorNombre} (${c.trabajadorRut}) | CT: ${c.centroTrabajo} | Vence: ${c.fechaVencimiento} | Estado: ${c.estado}`;
    });

    const text = [
      `Estimado(a),`,
      ``,
      `Hay certificaciones en estado CRÍTICO o EN ATENCIÓN para su empresa${
        empresaNombre ? `: ${empresaNombre}` : ""
      }.`,
      ``,
      `Detalle:`,
      ...lineas,
      ``,
      `Puede pedir recertificación desde el panel de control de la empresa o respondiendo a este correo.`,
      ``,
      `Atentamente,`,
      `Rigging & Lifting Training SpA`,
    ].join("\n");

    const html = `
      <p>Estimado(a),</p>
      <p>
        Hay certificaciones en estado <strong>CRÍTICO</strong> o 
        <strong>EN ATENCIÓN</strong>
        para su empresa${
          empresaNombre ? `: <strong>${empresaNombre}</strong>` : ""
        }.
      </p>

      <h3>Detalle</h3>
      <ul>
        ${certificaciones
          .map(
            (c) => `
          <li style="margin-bottom: 10px;">
            <strong>${c.curso}</strong><br/>
            Trabajador: ${c.trabajadorNombre} (${c.trabajadorRut})<br/>
            Centro de trabajo: ${c.centroTrabajo}<br/>
            Vence: ${c.fechaVencimiento}<br/>
            Estado: <strong>${c.estado}</strong>
          </li>
        `
          )
          .join("")}
      </ul>

      <p>
        Puede solicitar recertificación desde el 
        <strong>panel de control de la empresa</strong> o respondiendo a este correo.
      </p>

      <p>Atentamente,<br/>Rigging &amp; Lifting Training SpA</p>
    `;

    await transporter.sendMail({
      from: `"Rigging & Lifting Training SpA" <${smtpUser}>`,
      to: emailDestino,
      cc: "juan.aguayo@ryltraining.cl",
      subject,
      text,
      html,
    });

    console.log("📧 Alerta de estado enviada correctamente");
    return NextResponse.json({
      ok: true,
      message: "Alerta de certificaciones enviada",
    });
  } catch (err: unknown) {
    console.error("❌ Error en POST /api/alertas/estado-certificaciones:", err);

    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else {
      message = String(err);
    }

    return NextResponse.json(
      {
        error: "Error al enviar la alerta de certificaciones",
        detail: message,
      },
      { status: 500 }
    );
  }
}
