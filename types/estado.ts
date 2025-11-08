// types/estado.ts
export type CertStatus =
  | { label: "criticas"; color: string; icon: string }
  | { label: "atencion"; color: string; icon: string }
  | { label: "vigentes"; color: string; icon: string }

export type GetCertStatusFn = (fechaVencimiento: string) => CertStatus
