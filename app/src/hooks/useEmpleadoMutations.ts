"use client";

import { useCallback, useState } from "react";
import {
  crearEmpleadoAction,
  actualizarEmpleadoAction,
  guardarPerfilEmpleadoAction,
  generarInvitacionEmpleadoAction,
  aceptarPrivacidadEmpleadoAction,
  type GuardarPerfilEmpleadoInput,
} from "@/app/actions/empleados";
import type { CrearEmpleadoInput } from "@/types/empleados";

export function useEmpleadoMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = useCallback(async (input: CrearEmpleadoInput) => {
    setLoading(true);
    setError(null);
    const result = await crearEmpleadoAction(input);
    if ("error" in result && result.error && !result.empleadoId) {
      setError(result.error);
      setLoading(false);
      return { error: result.error };
    }
    setLoading(false);
    return result;
  }, []);

  const actualizar = useCallback(
    async (empleadoId: string, updates: Partial<CrearEmpleadoInput> & { estado?: string }) => {
      setLoading(true);
      setError(null);
      const result = await actualizarEmpleadoAction(empleadoId, updates);
      if (result.error) setError(result.error);
      setLoading(false);
      return result;
    },
    []
  );

  const guardarPerfil = useCallback(
    async (empleadoId: string, datos: GuardarPerfilEmpleadoInput) => {
      setLoading(true);
      setError(null);
      const result = await guardarPerfilEmpleadoAction(empleadoId, datos);
      if (result.error) setError(result.error);
      setLoading(false);
      return result;
    },
    []
  );

  const generarInvitacion = useCallback(async (empleadoId: string) => {
    setLoading(true);
    setError(null);
    const result = await generarInvitacionEmpleadoAction(empleadoId);
    if (result.error) setError(result.error);
    setLoading(false);
    return result;
  }, []);

  const aceptarPrivacidad = useCallback(
    async (token: string, aceptaAviso: boolean, aceptaSensibles: boolean) => {
      setLoading(true);
      setError(null);
      const result = await aceptarPrivacidadEmpleadoAction(token, aceptaAviso, aceptaSensibles);
      if (result.error) setError(result.error);
      setLoading(false);
      return result;
    },
    []
  );

  return {
    loading,
    error,
    crear,
    actualizar,
    guardarPerfil,
    generarInvitacion,
    aceptarPrivacidad,
    clearError: () => setError(null),
  };
}
