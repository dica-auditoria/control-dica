import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { wasabiClient, WASABI_BUCKET } from "@/lib/wasabi";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import JSZip from "jszip";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contratoId = searchParams.get("contratoId");
  const destino = searchParams.get("destino") as "cliente" | "empleado" | null;
  const nombreZip = searchParams.get("nombre") ?? "archivos";

  if (!contratoId) {
    return NextResponse.json({ error: "contratoId requerido" }, { status: 400 });
  }

  const idsParam = searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : null;
  const folderPath = searchParams.get("folderPath");

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (admin.from("archivos") as any)
    .select("id, nombre, ruta_storage, tipo")
    .neq("estado", "eliminado")
    .neq("tipo", "carpeta"); // skip virtual folder placeholders

  if (ids?.length) {
    q = q.in("id", ids);
  } else {
    if (!contratoId) return NextResponse.json({ error: "contratoId o ids requerido" }, { status: 400 });
    q = q.eq("contrato_id", contratoId);
    if (destino) q = q.eq("destino", destino);
    if (folderPath) q = q.like("nombre", `${folderPath}/%`);
  }

  const { data: archivos, error } = await q as {
    data: Array<{ id: string; nombre: string; ruta_storage: string }> | null;
    error: unknown;
  };

  if (error || !archivos?.length) {
    return NextResponse.json({ error: "Sin archivos" }, { status: 404 });
  }

  const zip = new JSZip();

  await Promise.all(
    archivos.map(async (archivo) => {
      try {
        const command = new GetObjectCommand({ Bucket: WASABI_BUCKET, Key: archivo.ruta_storage });
        const url = await getSignedUrl(wasabiClient, command, { expiresIn: 300 });
        const res = await fetch(url);
        if (!res.ok) return;
        const buffer = await res.arrayBuffer();
        zip.file(archivo.nombre, buffer);
      } catch {
        // skip failed files silently
      }
    })
  );

  const zipBuffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

  return new NextResponse(zipBuffer as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nombreZip}.zip"`,
      "Content-Length": zipBuffer.length.toString(),
    },
  });
}
