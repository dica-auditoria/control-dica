"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface PerfilRow { rol: string; entidad_id: string | null }

export interface ResultadoBusqueda {
  tipo: "archivo" | "cliente" | "contrato";
  id: string;
  titulo: string;
  subtitulo: string;
  href: string;
  extra?: string;
}

export async function buscarGlobalAction(query: string): Promise<{ data: ResultadoBusqueda[]; error: string | null }> {
  if (!query || query.trim().length < 2) return { data: [], error: null };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios").select("rol, entidad_id").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };

  if (!perfil) return { data: [], error: "Perfil no encontrado" };

  const q = query.trim();
  const resultados: ResultadoBusqueda[] = [];

  if (perfil.rol === "cliente") {
    // Cliente: solo sus archivos
    if (!perfil.entidad_id) return { data: [], error: null };
    const { data: archivos } = await supabase
      .from("archivos")
      .select("id, nombre, tipo, size_bytes, contrato_id")
      .eq("entidad_id", perfil.entidad_id)
      .neq("estado", "eliminado")
      .neq("tipo", "carpeta")
      .ilike("nombre", `%${q}%`)
      .limit(20) as { data: Array<{ id: string; nombre: string; tipo: string; size_bytes: number; contrato_id: string | null }> | null; error: unknown };

    for (const a of archivos ?? []) {
      const fileName = a.nombre.split("/").pop() ?? a.nombre;
      resultados.push({
        tipo: "archivo",
        id: a.id,
        titulo: fileName,
        subtitulo: a.nombre.includes("/") ? a.nombre.split("/").slice(0, -1).join("/") : "Raíz",
        href: "/dashboard",
        extra: a.tipo.toUpperCase(),
      });
    }
    return { data: resultados, error: null };
  }

  // Admin/empleado: busca archivos, clientes, contratos
  const admin = createAdminClient();

  const [rArchivos, rClientes, rContratos] = await Promise.all([
    (admin.from("archivos") as any)
      .select("id, nombre, tipo, entidad_id, contrato_id, entidades(nombre), contratos(nombre, entidad_id)")
      .neq("estado", "eliminado")
      .neq("tipo", "carpeta")
      .ilike("nombre", `%${q}%`)
      .limit(15) as Promise<{ data: Array<{ id: string; nombre: string; tipo: string; entidad_id: string; contrato_id: string | null; entidades: { nombre: string } | null; contratos: { nombre: string; entidad_id: string } | null }> | null; error: unknown }>,

    (admin.from("entidades") as any)
      .select("id, nombre, activo")
      .ilike("nombre", `%${q}%`)
      .limit(10) as Promise<{ data: Array<{ id: string; nombre: string; activo: boolean }> | null; error: unknown }>,

    (admin.from("contratos") as any)
      .select("id, nombre, entidad_id, numero_contrato, estado, entidades(nombre)")
      .or(`nombre.ilike.%${q}%,numero_contrato.ilike.%${q}%`)
      .limit(10) as Promise<{ data: Array<{ id: string; nombre: string; entidad_id: string; numero_contrato: string | null; estado: string; entidades: { nombre: string } | null }> | null; error: unknown }>,
  ]);

  for (const a of rArchivos.data ?? []) {
    const fileName = a.nombre.split("/").pop() ?? a.nombre;
    const entidadNombre = a.entidades?.nombre ?? "—";
    const contratoNombre = a.contratos?.nombre ?? null;
    const entidadId = a.entidad_id;
    const contratoId = a.contrato_id;
    resultados.push({
      tipo: "archivo",
      id: a.id,
      titulo: fileName,
      subtitulo: contratoNombre ? `${entidadNombre} / ${contratoNombre}` : entidadNombre,
      href: contratoId && entidadId ? `/dashboard/directorio/empresa/${entidadId}/${contratoId}` : `/dashboard/directorio/empresa/${entidadId}`,
      extra: a.tipo.toUpperCase(),
    });
  }

  for (const e of rClientes.data ?? []) {
    resultados.push({
      tipo: "cliente",
      id: e.id,
      titulo: e.nombre,
      subtitulo: e.activo ? "Activo" : "Inactivo",
      href: `/dashboard/clientes/${e.id}`,
    });
  }

  for (const c of rContratos.data ?? []) {
    resultados.push({
      tipo: "contrato",
      id: c.id,
      titulo: c.nombre,
      subtitulo: c.entidades?.nombre ?? "—",
      href: `/dashboard/directorio/empresa/${c.entidad_id}/${c.id}`,
      extra: c.estado,
    });
  }

  return { data: resultados, error: null };
}
