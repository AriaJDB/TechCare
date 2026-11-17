// Implementación de referencia (HU7 / HU8).
// Si el repositorio ya tiene estas funciones, conserva las firmas y ajusta
// únicamente la ruta de importación en tests/unit/mantenimiento.test.ts.

export type CicloMeses = 3 | 6 | 12;
export type EstadoSemaforo = 'verde' | 'amarillo' | 'rojo';

export const DIAS_ALERTA_AMARILLO = 15;
const MS_POR_DIA = 86_400_000;

/** Suma `cicloMeses` a la fecha de cierre sin desbordar el fin de mes. */
export function calcularProximaFecha(
  fechaCierre: Date,
  cicloMeses: CicloMeses,
): Date {
  if (![3, 6, 12].includes(cicloMeses)) {
    throw new RangeError('El ciclo debe ser de 3, 6 o 12 meses');
  }
  const anio = fechaCierre.getUTCFullYear();
  const mes = fechaCierre.getUTCMonth() + cicloMeses;
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const dia = Math.min(fechaCierre.getUTCDate(), ultimoDia);
  return new Date(Date.UTC(anio, mes, dia));
}

/** Verde > 15 días · Amarillo ≤ 15 días · Rojo si la fecha ya venció. */
export function calcularSemaforo(
  proximaFecha: Date,
  hoy: Date = new Date(),
): EstadoSemaforo {
  const objetivo = Date.UTC(
    proximaFecha.getUTCFullYear(),
    proximaFecha.getUTCMonth(),
    proximaFecha.getUTCDate(),
  );
  const actual = Date.UTC(
    hoy.getUTCFullYear(),
    hoy.getUTCMonth(),
    hoy.getUTCDate(),
  );
  const diasRestantes = (objetivo - actual) / MS_POR_DIA;

  if (diasRestantes < 0) return 'rojo';
  if (diasRestantes <= DIAS_ALERTA_AMARILLO) return 'amarillo';
  return 'verde';
}
