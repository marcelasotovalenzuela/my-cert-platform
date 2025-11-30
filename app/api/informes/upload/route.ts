import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const certId = formData.get("certificacionId");

    if (!file || !certId) {
      return NextResponse.json(
        { error: "Falta archivo o certificacionId" },
        { status: 400 }
      );
    }

    const certIdNum = Number(certId);

    // 1️⃣ Buscar certificación
    const cert = await prisma.certificacion.findUnique({
      where: { id: certIdNum },
    });

    if (!cert) {
      return NextResponse.json(
        { error: "Certificación no encontrada" },
        { status: 404 }
      );
    }

    if (!cert.codigoVerificacion) {
      return NextResponse.json(
        { error: "Certificación no tiene código de verificación" },
        { status: 400 }
      );
    }

    // 2️⃣ Crear nombre final
    const fileName = `informe-${cert.codigoVerificacion}.pdf`;

    // Convert File → Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3️⃣ Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("informes")
      .upload(fileName, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error subiendo PDF:", uploadError);
      return NextResponse.json(
        { error: "No se pudo subir el archivo" },
        { status: 500 }
      );
    }

    // 4️⃣ Obtener URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from("informes").getPublicUrl(fileName);

    // 5️⃣ Guardar URL en Certificacion
    await prisma.certificacion.update({
      where: { id: certIdNum },
      data: { informe_url: publicUrl },
    });

    return NextResponse.json({
      message: "Informe subido correctamente",
      url: publicUrl,
    });
  } catch (error: any) {
    console.error("Error en subida de informe", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
