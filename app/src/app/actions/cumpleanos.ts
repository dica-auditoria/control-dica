"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Use admin client so all authenticated users can read birthdays regardless of RLS
  const admin = createAdminClient();

  // fecha_nacimiento lives in empleado_datos_personales, not empleados
  const { data, error } = await (admin as any)
    .from("empleado_datos_personales")
    .select("fecha_nacimiento, empleado:empleados!empleado_datos_personales_empleado_id_fkey(id, nombres, apellido_paterno, apellido_materno, departamento, foto_url, estado)")
    .not("fecha_nacimiento", "is", null) as {
      data: Array<{
        fecha_nacimiento: string;
        empleado: {
          id: string;
          nombres: string;
          apellido_paterno: string;
          apellido_materno: string | null;
          departamento: string;
          foto_url: string | null;
          estado: string;
        } | null;
      }> | null;
      error: unknown;
    };

  if (error || !data) return { data: null, error: "Error al cargar cumpleaños" };

  const activos = data.filter(r => r.empleado?.estado === "activo" && r.fecha_nacimiento);

  const result: EmpleadoCumpleanos[] = await Promise.all(
    activos.map(async r => {
      const e = r.empleado!;
      let foto_url: string | null = null;
      if (e.foto_url && !e.foto_url.startsWith("http")) {
        const { data: signed } = await admin.storage.from("empleado-docs").createSignedUrl(e.foto_url, 3600);
        foto_url = signed?.signedUrl ?? null;
      } else {
        foto_url = e.foto_url;
      }
      return {
        id: e.id,
        nombre: `${e.nombres} ${e.apellido_paterno}${e.apellido_materno ? " " + e.apellido_materno : ""}`.trim(),
        departamento: e.departamento,
        fecha_nacimiento: r.fecha_nacimiento,
        foto_url,
      };
    })
  );

  result.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { data: result, error: null };
}
