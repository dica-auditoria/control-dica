"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchEmpleadosListAction } from "@/app/actions/empleados";
import type { EmpleadoListItem, EmpleadosStats } from "@/types/empleados";

export interface EmpleadosFilters {
  busqueda?: string;
  departamento?: string;
  estado?: string;
}

export function useEmpleados(initialData?: EmpleadoListItem[], initialStats?: EmpleadosStats) {
  const [data, setData] = useState<EmpleadoListItem[]>(initialData ?? []);
  const [stats, setStats] = useState<EmpleadosStats | null>(initialStats ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EmpleadosFilters>({
    departamento: "todos",
    estado: "todos",
    busqueda: "",
  });

  const refetch = useCallback(async (override?: EmpleadosFilters) => {
    setLoading(true);
    setError(null);
    const f = override ?? filters;
    const result = await fetchEmpleadosListAction(f);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setData((result.data ?? []) as EmpleadoListItem[]);
    setStats(result.stats);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    if (!initialData) refetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilters = useCallback((next: Partial<EmpleadosFilters>) => {
    setFilters(prev => {
      const merged = { ...prev, ...next };
      refetch(merged);
      return merged;
    });
  }, [refetch]);

  return { data, stats, loading, error, refetch, filters, updateFilters };
}
