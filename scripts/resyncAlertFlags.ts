// scripts/resyncAlertFlags.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hoy = new Date();

  // 1) Marcar como "ya enviada en crítico" todas las certificaciones vencidas
  const criticos = await prisma.certificacion.updateMany({
    where: {
      fechaVencimiento: {
        lt: hoy, // fecha < hoy => vencida
      },
      alertaCriticoEnviada: false,
    },
    data: {
      alertaCriticoEnviada: true,
    },
  });

  // 2) Marcar como "ya enviada en atención" todas las certificaciones que vencen en los próximos 30 días
  const limiteAtencion = new Date();
  limiteAtencion.setDate(limiteAtencion.getDate() + 30);

  const atencion = await prisma.certificacion.updateMany({
    where: {
      fechaVencimiento: {
        gte: hoy,             // desde hoy
        lte: limiteAtencion,  // hasta hoy + 30 días
      },
      alertaEnAtencionEnviada: false,
    },
    data: {
      alertaEnAtencionEnviada: true,
    },
  });

  console.log("Resync completado:");
  console.log(` - Certificaciones marcadas como crítico:   ${criticos.count}`);
  console.log(` - Certificaciones marcadas como atención: ${atencion.count}`);
}

main()
  .catch((err) => {
    console.error("❌ Error en resync de alert flags:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
