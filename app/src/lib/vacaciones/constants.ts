import type { TipoVacacion } from "@/app/actions/vacaciones";

export const TIPO_LABEL: Record<TipoVacacion, string> = {
  vacaciones:        "Vacaciones",
  permiso_con_goce:  "Permiso con goce",
  permiso_sin_goce:  "Permiso sin goce",
};
