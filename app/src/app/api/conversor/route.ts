import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CC_API = "https://api.cloudconvert.com/v2";

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.CLOUDCONVERT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key de CloudConvert no configurada. Agrega CLOUDCONVERT_API_KEY en .env.local" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const inputFormat = formData.get("inputFormat") as string;
  const outputFormat = formData.get("outputFormat") as string;

  if (!file || !inputFormat || !outputFormat) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // 1. Create job
  const createRes = await fetch(`${CC_API}/jobs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      tasks: {
        "upload-task": { operation: "import/upload" },
        "convert-task": {
          operation: "convert",
          input: "upload-task",
          input_format: inputFormat,
          output_format: outputFormat,
        },
        "export-task": {
          operation: "export/url",
          input: "convert-task",
        },
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    return NextResponse.json({ error: `CloudConvert: ${err.message ?? createRes.statusText}` }, { status: 502 });
  }

  const { data: job } = await createRes.json();
  const uploadTask = job.tasks.find((t: { name: string }) => t.name === "upload-task");

  // 2. Upload file to CloudConvert's S3 endpoint
  const uploadForm = new FormData();
  for (const [k, v] of Object.entries(uploadTask.result.form.parameters as Record<string, string>)) {
    uploadForm.append(k, v);
  }
  uploadForm.append("file", file, file.name);

  const uploadRes = await fetch(uploadTask.result.form.url, {
    method: "POST",
    body: uploadForm,
  });

  if (!uploadRes.ok) {
    return NextResponse.json({ error: "Error al subir el archivo a CloudConvert" }, { status: 502 });
  }

  // 3. Poll until job finishes (max 3 minutes)
  const jobId = job.id;
  let finishedJob = null;
  const deadline = Date.now() + 180_000;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000));

    const statusRes = await fetch(`${CC_API}/jobs/${jobId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const { data: status } = await statusRes.json();

    if (status.status === "finished") {
      finishedJob = status;
      break;
    }
    if (status.status === "error") {
      const failedTask = status.tasks.find((t: { status: string; message?: string }) => t.status === "error");
      return NextResponse.json({ error: failedTask?.message ?? "Error en la conversión" }, { status: 422 });
    }
  }

  if (!finishedJob) {
    return NextResponse.json({ error: "La conversión tardó demasiado. Intenta con un archivo más pequeño." }, { status: 504 });
  }

  // 4. Return download URL
  const exportTask = finishedJob.tasks.find((t: { name: string }) => t.name === "export-task");
  const fileResult = exportTask?.result?.files?.[0];

  if (!fileResult?.url) {
    return NextResponse.json({ error: "No se pudo obtener el archivo convertido" }, { status: 502 });
  }

  return NextResponse.json({ url: fileResult.url, filename: fileResult.filename });
}
