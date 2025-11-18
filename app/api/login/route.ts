// app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno");
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

type Body = {
  email?: string;
  password?: string;
  rut?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = ((await req.json().catch(() => ({}))) || {}) as Body;

    const email = (body.email ?? "").trim().toLowerCase();
    const password = (body.password ?? "").trim();
    const rut = (body.rut ?? "").trim();

    if ((!email && !rut) || !password) {
      return NextResponse.json(
        { ok: false, error: "Faltan credenciales (email o RUT y password)" },
        { status: 400 }
      );
    }

    // ⚠️ Ajusta el nombre de la tabla si en Supabase se llama distinto:
    // "Empresa" vs "empresas"
    let query = supabase
      .from("Empresa")
      .select("id, email, password, rut")
      .limit(1);

    if (email) {
      // Búsqueda case-insensitive por email
      query = query.ilike("email", email);
    } else if (rut) {
      // Búsqueda exacta por RUT
      query = query.eq("rut", rut);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("❌ Error Supabase en /api/login:", error);
      return NextResponse.json(
        { ok: false, error: `DB: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado" },
        { status: 401 }
      );
    }

    // MVP: comparación simple en texto plano
    const ok = (data.password ?? "").trim() === password;
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: data.id,
          email: data.email,
          rut: data.rut,
        },
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ Error inesperado en /api/login:", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
