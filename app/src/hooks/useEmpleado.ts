"use client";

import { useCallback, useState } from "react";
import { fetchEmpleadoByIdAction } from "@/app/actions/empleados";
import { mapEmpleadoDetalle } from "@/lib/empleados/map";
import type { EmpleadoDetalle } from "@/types/empleados";

export function useEmpleado(empleadoId: string, initialData?: EmpleadoDetalle | null) {
  const [data, setData] = useState<EmpleadoDetalle | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchEmpleadoByIdAction(empleadoId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setData(mapEmpleadoDetalle(result.data as Record<string, unknown>));
    setLoading(false);
  }, [empleadoId]);

  return { data, loading, error, refetch, setData };
}
