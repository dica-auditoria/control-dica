"use server";

import { createClient } from "@/lib/supabase/server";

export interface EmpleadoCumpleanos {
  id: string;
  nombre: string;
  departamento: string;
  fecha_nacimiento: string;
  foto_url: string | null;
}

export async function fetchCumpleanosAction(): Promise<{ data: EmpleadoCumpleanos[] | null; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("empleados")
    .select("id, nombres, apellido_paterno, apellido_materno, departamento, fecha_nacimiento, foto_url")
    .eq("estado", "activo")
    .not("fecha_nacimiento", "is", null)
    .order("apellido_paterno") as {
      data: Array<{
        id: string;
        nombres: string;
        apellido_paterno: string;
        apellido_materno: string | null;
        departamento: string;
        fecha_nacimiento: string;
        foto_url: string | null;
      }> | null;
      error: unknown;
    };

  if (error || !data) return { data: null, error: "Error al cargar cumpleaños" };

  const result: EmpleadoCumpleanos[] = await Promise.all(
    data.map(async e => {
      let foto_url: string | null = null;
      if (e.foto_url && !e.foto_url.startsWith("http")) {
        const { data: signed } = await supabase.storage.from("empleado-docs").createSignedUrl(e.foto_url, 3600);
        foto_url = signed?.signedUrl ?? null;
      } else {
        foto_url = e.foto_url;
      }
      return {
        id: e.id,
        nombre: `${e.nombres} ${e.apellido_paterno}${e.apellido_materno ? " " + e.apellido_materno : ""}`.trim(),
        departamento: e.departamento,
        fecha_nacimiento: e.fecha_nacimiento,
        foto_url,
      };
    })
  );

  return { data: result, error: null };
}
