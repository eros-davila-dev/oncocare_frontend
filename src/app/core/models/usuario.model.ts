/**
 * INVESTIGADOR: responsable del estudio de tesis (fases, muestra, fichas del
 * pretest, exportacion). SERVICIO: cuenta tecnica de n8n, nunca una persona.
 */
export type Rol = 'ADMIN' | 'MEDICO' | 'RECEPCIONISTA' | 'PACIENTE' | 'INVESTIGADOR' | 'SERVICIO';

export type Especialidad =
  | 'ONCOLOGIA_CLINICA'
  | 'ONCOLOGIA_QUIRURGICA'
  | 'RADIOTERAPIA'
  | 'CUIDADOS_PALIATIVOS';

export interface UsuarioResumen {
  id: number;
  nombres: string;
  email: string;
  rol: Rol;
  especialidad: Especialidad | null;
}

export interface CrearUsuarioRequest {
  nombres: string;
  email: string;
  password: string;
  rol: Rol;
  especialidad?: Especialidad | null;
}
