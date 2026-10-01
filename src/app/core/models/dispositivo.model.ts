export type TipoDispositivo = 'MONITOR_SIGNOS_VITALES' | 'BASCULA' | 'BOMBA_INFUSION';
export type ProtocoloDispositivo = 'MQTT' | 'REST' | 'SERIAL';
export type EstadoConexion = 'CONECTADO' | 'DESCONECTADO' | 'ERROR';

export interface Dispositivo {
  id: number;
  nombre: string;
  tipo: TipoDispositivo;
  protocolo: ProtocoloDispositivo;
  estadoConexion: EstadoConexion;
}

export interface DispositivoRequest {
  nombre: string;
  tipo: TipoDispositivo;
  protocolo: ProtocoloDispositivo;
  credencial: string;
}

export interface LecturaDispositivo {
  id: number;
  dispositivoId: number;
  pacienteId: number | null;
  cicloTratamientoId: number | null;
  tipoDato: string;
  valor: string;
  fechaLectura: string;
}
