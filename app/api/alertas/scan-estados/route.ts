// app/api/alertas/scan-estados/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (!smtpHost || !smtpUser || !smtpPass) {
  console.warn("⚠️ SMTP incompleto en /api/alertas/scan-estados");
}

/**
 * Calcula el estado en base a la fecha de vencimiento.
 * Debe ser consistente con lo que ves en /empresas.
 * Ajusta lógica si tu getStatusInfo usa otros rangos.
 */
function getEstadoDesdeFecha(fechaVencimiento: Date | string | null): "vigente" | "atencion" | "critico" {
  if (!fechaVencimiento) return "vigente";

  const fv = new Date(fechaVencimiento);
  const ahora = new Date();

  // diferencia en días (redondeando hacia abajo)
  const diffMs = fv.getTime() - ahora.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Ajusta estos rangos para que calcen con tu getStatusInfo del front:
  if (diffDias < 0) {
    return "critico";           // vencida
  } else if (diffDias <= 30) {
    return "atencion";          // vence pronto
  } else {
    return "vigente";
  }
}

export async function GET() {
  try {
    // Si no hay SMTP bien configurado → modo simulado
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("⚠️ /api/alertas/scan-estados en modo SIMULADO (sin SMTP completo)");
      return NextResponse.json({
        ok: true,
        mocked: true,
        message: "Scan de estados simulado (SMTP incompleto en el servidor).",
      });
    }

    // Obtenemos todas las certificaciones que aún puedan disparar alerta
    const certificaciones = await prisma.certificacion.findMany({
      where: {
        OR: [
          { alertaEnAtencionEnviada: false },
          { alertaCriticoEnviada: false },
        ],
      },
      include: {
        trabajador: {
          include: {
            empresa: true,
          },
        },
      },
    });

    if (!certificaciones.length) {
      return NextResponse.json({
        ok: true,
        message: "No hay certificaciones candidatas para alerta.",
      });
    }

    type CertConEstado = {
      id: number;
      curso: string | null;
      fechaVencimiento: Date | string | null;
      estado: "atencion" | "critico";
      trabajadorNombre: string;
      trabajadorRut: string;
      centroTrabajo: string;
      empresaId: number;
      empresaNombre: string;
      empresaEmail: string | null;
      alertaEnAtencionEnviada: boolean;
      alertaCriticoEnviada: boolean;
    };

    const candidatas: CertConEstado[] = [];

    for (const cert of certificaciones) {
      const trabajador = cert.trabajador;
      const empresa = trabajador?.empresa;

      if (!trabajador || !empresa) continue;
      if (!cert.fechaVencimiento) continue;

      const estado = getEstadoDesdeFecha(cert.fechaVencimiento);

      // Sólo nos importan las que están en atención o crítico
      if (estado === "atencion" && !cert.alertaEnAtencionEnviada) {
        candidatas.push({
          id: cert.id,
          curso: cert.curso,
          fechaVencimiento: cert.fechaVencimiento,
          estado: "atencion",
          trabajadorNombre: `${trabajador.nombre ?? ""} ${trabajador.apellido ?? ""}`.trim(),
          trabajadorRut: trabajador.rut ?? "",
          centroTrabajo: trabajador.centroTrabajo ?? "",
          empresaId: empresa.id,
          empresaNombre: empresa.nombre ?? "Empresa sin nombre",
          empresaEmail: empresa.email ?? null,
          alertaEnAtencionEnviada: cert.alertaEnAtencionEnviada,
          alertaCriticoEnviada: cert.alertaCriticoEnviada,
        });
      } else if (estado === "critico" && !cert.alertaCriticoEnviada) {
        candidatas.push({
          id: cert.id,
          curso: cert.curso,
          fechaVencimiento: cert.fechaVencimiento,
          estado: "critico",
          trabajadorNombre: `${trabajador.nombre ?? ""} ${trabajador.apellido ?? ""}`.trim(),
          trabajadorRut: trabajador.rut ?? "",
          centroTrabajo: trabajador.centroTrabajo ?? "",
          empresaId: empresa.id,
          empresaNombre: empresa.nombre ?? "Empresa sin nombre",
          empresaEmail: empresa.email ?? null,
          alertaEnAtencionEnviada: cert.alertaEnAtencionEnviada,
          alertaCriticoEnviada: cert.alertaCriticoEnviada,
        });
      }
    }

    if (!candidatas.length) {
      return NextResponse.json({
        ok: true,
        message: "No hay certificaciones que hayan cambiado a EN ATENCIÓN o CRÍTICO sin alerta enviada.",
      });
    }

    // Agrupar por empresa
    const porEmpresa = new Map<
      number,
      {
        empresaNombre: string;
        empresaEmail: string | null;
        certs: CertConEstado[];
      }
    >();

    for (const cert of candidatas) {
      const grupo = porEmpresa.get(cert.empresaId) ?? {
        empresaNombre: cert.empresaNombre,
        empresaEmail: cert.empresaEmail,
        certs: [],
      };
      grupo.certs.push(cert);
      porEmpresa.set(cert.empresaId, grupo);
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

    // Enviamos correo por empresa
    for (const [empresaId, data] of porEmpresa.entries()) {
      const { empresaNombre, empresaEmail, certs } = data;
      if (!empresaEmail) {
        console.warn(
          `⚠️ Empresa ${empresaNombre} (ID ${empresaId}) sin email. No se envía alerta.`
        );
        continue;
      }

      const lineas = certs.map((c) => {
        const fvStr =
          c.fechaVencimiento instanceof Date
            ? c.fechaVencimiento.toISOString().slice(0, 10)
            : String(c.fechaVencimiento).slice(0, 10);

        const estadoLabel =
          c.estado === "critico" ? "Crítico (vencida)" : "En atención (vence pronto)";

        return `- ${c.curso ?? "Curso sin nombre"} | Trabajador: ${
          c.trabajadorNombre
        } (${c.trabajadorRut}) | CT: ${c.centroTrabajo} | Vence: ${fvStr} | Estado: ${estadoLabel}`;
      });

      const subject = `Alertas de certificaciones en estado crítico / en atención – ${empresaNombre}`;

      const text = [
        `Estimado(a),`,
        ``,
        `Hay certificaciones en estado CRÍTICO o EN ATENCIÓN para su empresa: ${empresaNombre}.`,
        ``,
        `Detalle:`,
        ...lineas,
        ``,
        `Puede solicitar recertificación desde el panel de control de la empresa o respondiendo a este correo.`,
        ``,
        `Atentamente,`,
        `Rigging & Lifting Training SpA`,
      ].join("\n");

      const html = `
        <p>Estimado(a),</p>
        <p>
          Hay certificaciones en estado <strong>CRÍTICO</strong> o 
          <strong>EN ATENCIÓN</strong> para su empresa <strong>${empresaNombre}</strong>.
        </p>
        <h3>Detalle</h3>
        <ul>
          ${certs
            .map((c) => {
              const fvStr =
                c.fechaVencimiento instanceof Date
                  ? c.fechaVencimiento.toISOString().slice(0, 10)
                  : String(c.fechaVencimiento).slice(0, 10);

              const estadoLabel =
                c.estado === "critico"
                  ? "Crítico (vencida)"
                  : "En atención (vence pronto)";

              return `
                <li style="margin-bottom: 10px;">
                  <strong>${c.curso ?? "Curso sin nombre"}</strong><br/>
                  Trabajador: ${c.trabajadorNombre} (${c.trabajadorRut})<br/>
                  Centro de trabajo: ${c.centroTrabajo}<br/>
                  Vence: ${fvStr}<br/>
                  Estado: <strong>${estadoLabel}</strong>
                </li>
              `;
            })
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
        to: empresaEmail,
        cc: "juan.aguayo@ryltraining.cl",
        subject,
        text,
        html,
      });

      console.log(
        `📧 Enviada alerta de estados a empresa ${empresaNombre} (${empresaEmail})`
      );

      // Actualizar flags de estas certificaciones (solo pasamos de false -> true)
      for (const c of certs) {
        const data: Record<string, boolean> = {};

        if (c.estado === "atencion" && !c.alertaEnAtencionEnviada) {
          data.alertaEnAtencionEnviada = true;
        }

        if (c.estado === "critico" && !c.alertaCriticoEnviada) {
          data.alertaCriticoEnviada = true;
        }

        if (Object.keys(data).length > 0) {
          await prisma.certificacion.update({
            where: { id: c.id },
            data,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Scan de estados completado y alertas enviadas.",
    });
  } catch (err) {
    console.error("❌ Error en GET /api/alertas/scan-estados:", err);
    const message =
      err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      {
        error: "Error al escanear estados de certificaciones",
        detail: message,
      },
      { status: 500 }
    );
  }
}
