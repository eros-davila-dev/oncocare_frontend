import { describe, expect, it } from 'vitest';
import { IndicadoresTesis } from '../../core/models/estudio.model';
import { INDICADORES_TESIS, esMejora, fechaCorta, formatoDiferencia, formatoValor } from './indicadores.util';

const vacios: IndicadoresTesis = {
  tiempoPromedioRegistroMinutos: null,
  registros: 0,
  tasaAusentismo: null,
  inasistencias: 0,
  citasCumplidas: 0,
  citasConDesenlace: 0,
  nivelConsultasAtendidas: null,
  nivelConsultasAtendidasAutomatico: null,
  consultasResueltas: 0,
  consultasResueltasBot: 0,
  consultasCerradas: 0,
};

describe('indicadores de la tesis', () => {
  it('muestra "Sin datos" cuando el denominador es cero, nunca 0', () => {
    expect(formatoValor(null, '%')).toBe('Sin datos');
    expect(formatoValor(0, '%')).toBe('0.0 %');
  });

  it('formatea minutos y porcentajes con un decimal', () => {
    expect(formatoValor(6, 'min')).toBe('6.0 min');
    expect(formatoValor(33.3333, '%')).toBe('33.3 %');
  });

  it('para TPR y TNS bajar es mejorar; para NCA subir es mejorar', () => {
    const [tpr, tns, nca] = INDICADORES_TESIS;
    expect(esMejora(-4, tpr.sentido)).toBe(true);
    expect(esMejora(-20, tns.sentido)).toBe(true);
    expect(esMejora(15, nca.sentido)).toBe(true);
    expect(esMejora(5, tns.sentido)).toBe(false);
    expect(esMejora(null, nca.sentido)).toBeNull();
  });

  it('expresa la diferencia en puntos porcentuales para TNS y NCA', () => {
    expect(formatoDiferencia(-12.5, '%')).toBe('−12.5 pp');
    expect(formatoDiferencia(3, 'min')).toBe('+3.0 min');
    expect(formatoDiferencia(null, '%')).toBe('—');
  });

  it('siempre informa la base del calculo (el n)', () => {
    const [tpr, tns, nca] = INDICADORES_TESIS;
    expect(tpr.base({ ...vacios, registros: 1 })).toBe('1 registro');
    expect(tns.base({ ...vacios, inasistencias: 3, citasConDesenlace: 9 })).toBe('3 de 9 citas con desenlace');
    expect(nca.base({ ...vacios, consultasResueltas: 2, consultasCerradas: 3, consultasResueltasBot: 1 })).toContain(
      '1 por el chatbot',
    );
  });

  it('convierte fechas ISO a formato peruano', () => {
    expect(fechaCorta('2026-09-30')).toBe('30/09/2026');
  });
});
