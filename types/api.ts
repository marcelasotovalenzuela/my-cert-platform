// types/api.ts
import type { Empresa } from "./empresa"

export type ApiOkEmpresa = { ok: true; empresa: Empresa }
export type ApiErr = { ok: false; error: string }
export type ApiEmpresaResponse = ApiOkEmpresa | ApiErr
