// types/api.ts
import type { Empresa } from "./empresas"

export type ApiOkEmpresa = { ok: true; empresa: Empresa }
export type ApiErr = { ok: false; error: string }
export type ApiEmpresaResp = ApiOkEmpresa | ApiErr
