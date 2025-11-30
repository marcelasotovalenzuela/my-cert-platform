// lib/db/empresas.ts
import { cache } from "react";
import { createClient } from "@/lib/supabase/server"; // ← esta ruta ya la usas en tu proyecto

/**
 * Obtiene todas las empresas con trabajadores y certificaciones
 * en una sola consulta optimizada.
 *
 * Esta función está cacheada para rendimiento futuro.
 */
export const getEmpresasConCertificaciones = cache(async () => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("Empresa")
    .select(`
      id,
      nombre,
      rut,
      Trabajador (
        id,
        nombre,
        rut,
        centro_trabajo,
        Certificacion (
          id,
          curso,
          fecha_emision,
          fecha_vencimiento,
          estado,
          codigo_verificacion
        )
      )
    `);

  if (error) {
    console.error("❌ Error en getEmpresasConCertificaciones:", error);
    throw error;
  }

  return data;
});
