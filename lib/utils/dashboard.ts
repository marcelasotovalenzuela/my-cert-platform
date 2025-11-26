// lib/utils/dashboard.ts
import { getStatusInfo } from "./status";

export type DashboardStats = {
  total: number;
  critico: number;
  atencion: number;
  vigente: number;
};

// Certificación mínima esperada
export type CertLike = {
  fechaVencimiento?: string | Date | null;
};

export function getDashboardStats(certificaciones: CertLike[] | null | undefined): DashboardStats {
  const stats: DashboardStats = {
    total: 0,
    critico: 0,
    atencion: 0,
    vigente: 0,
  };

  if (!Array.isArray(certificaciones)) return stats;

  stats.total = certificaciones.length;

  certificaciones.forEach((cert) => {
    const info = getStatusInfo(cert?.fechaVencimiento ?? null);

    if (info.status === "critico") stats.critico++;
    else if (info.status === "atencion") stats.atencion++;
    else stats.vigente++;
  });

  return stats;
}
