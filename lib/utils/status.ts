// lib/utils/status.ts
// Utilidades para determinar el estado (CRÍTICO / EN ATENCIÓN / VIGENTE)
// de una certificación y los textos para tooltip.

export type StatusKind = "critico" | "atencion" | "vigente";

export type StatusInfo = {
  status: StatusKind;
  label: string;
  dias: number | null; // días hasta el vencimiento (negativo si ya venció)
  message: string; // texto amigable para tooltip
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffInDays(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcFrom = startOfDay(from).getTime();
  const utcTo = startOfDay(to).getTime();
  return Math.round((utcTo - utcFrom) / msPerDay);
}

function formatFechaCorta(date: Date): string {
  return date.toLocaleDateString("es-CL");
}

export function getStatusInfo(
  fechaVencimiento: string | Date | null | undefined
): StatusInfo {
  // Sin fecha → lo tratamos como "en atención" porque requiere revisión.
  if (!fechaVencimiento) {
    return {
      status: "atencion",
      label: "En atención",
      dias: null,
      message: "Sin fecha de vencimiento registrada.",
    };
  }

  const hoy = new Date();
  const fv =
    typeof fechaVencimiento === "string"
      ? new Date(fechaVencimiento)
      : fechaVencimiento;

  if (Number.isNaN(fv.getTime())) {
    return {
      status: "atencion",
      label: "En atención",
      dias: null,
      message: "Fecha de vencimiento inválida.",
    };
  }

  const dias = diffInDays(hoy, fv);
  const fechaTexto = formatFechaCorta(fv);

  let status: StatusKind;
  let label: string;
  let message: string;

  if (dias < 0) {
    // Ya venció
    status = "critico";
    label = "Crítico";
    const diasAbs = Math.abs(dias);
    if (diasAbs === 0) {
      message = `Venció hoy (${fechaTexto}).`;
    } else if (diasAbs === 1) {
      message = `Venció hace 1 día (${fechaTexto}).`;
    } else {
      message = `Venció hace ${diasAbs} días (${fechaTexto}).`;
    }
  } else if (dias === 0) {
    status = "critico";
    label = "Crítico";
    message = `Vence hoy (${fechaTexto}).`;
  } else if (dias <= 30) {
    status = "atencion";
    label = "En atención";
    if (dias === 1) {
      message = `Vence en 1 día (${fechaTexto}).`;
    } else {
      message = `Vence en ${dias} días (${fechaTexto}).`;
    }
  } else {
    status = "vigente";
    label = "Vigente";
    message = `Vence el ${fechaTexto}.`;
  }

  return {
    status,
    label,
    dias,
    message,
  };
}
