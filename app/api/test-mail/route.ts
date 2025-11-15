/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const notifyTo = process.env.RECERT_NOTIFY_TO;

if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !notifyTo) {
  console.error("Faltan variables de entorno SMTP o RECERT_NOTIFY_TO");
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: Number(smtpPort) || 587,
  secure: false, // Para 587 usamos STARTTLS (no secure: true)
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function GET() {
  try {
    console.log("=== TEST SMTP R&L: INICIO ===");
    console.log("SMTP_HOST:", smtpHost);
    console.log("SMTP_PORT:", smtpPort);
    console.log("SMTP_USER:", smtpUser);
    console.log("RECERT_NOTIFY_TO:", notifyTo);

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !notifyTo) {
      return NextResponse.json(
        { ok: false, error: "Faltan variables de entorno SMTP/RECERT_NOTIFY_TO" },
        { status: 500 }
      );
    }

    // Verificamos conexión al servidor SMTP
    console.log("TEST SMTP: verificando conexión...");
    await transporter.verify();
    console.log("TEST SMTP: conexión OK ✅");

    const info = await transporter.sendMail({
      from: `"R&L Training Certificaciones" <${smtpUser}>`,
      to: notifyTo,
      subject: "Test SMTP R&L (Conexión OK)",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.5;">
          <h2>Test de Conexión SMTP R&L</h2>
          <p>Si estás leyendo este correo, el servidor SMTP está funcionando correctamente.</p>
          <p><strong>Remitente:</strong> ${smtpUser}</p>
          <p><strong>Destino:</strong> ${notifyTo}</p>
          <p>Enviado desde el endpoint <code>/api/test-mail</code>.</p>
        </div>
      `,
    });

    console.log("=== TEST SMTP R&L: ENVIADO ===");
    console.log("MessageId:", info.messageId);

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (err: any) {
    console.error("=== TEST SMTP R&L: ERROR ===");
    console.error(err);

    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
