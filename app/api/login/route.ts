import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Body = { email?: string; password?: string };

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = (body.email ?? "").trim().toLowerCase();
    const password = (body.password ?? "").trim();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Faltan email o password" }, { status: 400 });
    }

    // ✅ Búsqueda case-insensitive por email
    const { data, error } = await supabase
      .from("Empresa") // o "empresas" si ese es el nombre real
      .select("id,email,password")
      .ilike("email", email) // ← case-insensitive
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: `DB: ${error.message}` }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 401 });
    }

    // DEV: comparación simple (texto plano)
    const ok = (data.password ?? "").trim() === password;
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Credenciales inválidas" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, user: { id: data.id, email: data.email } }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
