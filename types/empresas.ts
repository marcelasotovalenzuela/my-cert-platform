// types/empresa.ts
export type Certificacion = {
  id: number
  curso: string
  fechaEmision: string      // ISO (YYYY-MM-DD)
  fechaVencimiento: string  // ISO (YYYY-MM-DD)
}

export type Trabajador = {
  id: number
  nombre: string
  apellido?: string
  centroTrabajo?: string | null
  certificaciones: Certificacion[]
}

export type Empresa = {
  id: number
  nombre: string
  rut?: string | null
  email: string
  trabajadores: Trabajador[]
}

// Filtros permitidos
export type EstadoCert = "criticas" | "atencion" | "vigentes" | "todas"
