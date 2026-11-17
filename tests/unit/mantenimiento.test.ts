import {
  calcularProximaFecha,
  calcularSemaforo,
  CicloMeses,
} from '../../src/utils/mantenimiento';

const iso = (fecha: Date) => fecha.toISOString().slice(0, 10);

describe('Próximo mantenimiento (HU7)', () => {
  //#region CP-08
  it.each([
    [3, '2026-12-15'],
    [6, '2027-03-15'],
    [12, '2027-09-15'],
  ])('CP-08: ciclo de %i meses desde el cierre', (ciclo, esperada) => {
    // Arrange
    const fechaCierre = new Date('2026-09-15T00:00:00Z');

    // Act
    const proxima = calcularProximaFecha(fechaCierre, ciclo as CicloMeses);

    // Assert
    expect(iso(proxima)).toBe(esperada);
  });
  //#endregion

  it('no desborda el fin de mes (31 de agosto + 6 meses)', () => {
    // Arrange
    const fechaCierre = new Date('2026-08-31T00:00:00Z');

    // Act
    const proxima = calcularProximaFecha(fechaCierre, 6);

    // Assert
    expect(iso(proxima)).toBe('2027-02-28');
  });

  it('rechaza ciclos distintos de 3, 6 o 12 meses', () => {
    // Arrange
    const fechaCierre = new Date('2026-09-15T00:00:00Z');

    // Act
    const accion = () => calcularProximaFecha(fechaCierre, 5 as CicloMeses);

    // Assert
    expect(accion).toThrow(RangeError);
  });
});

describe('Semáforo de estado (HU8)', () => {
  const hoy = new Date('2026-10-07T12:00:00Z');

  //#region CP-09
  it.each([
    ['2026-10-23', 'verde'], // faltan 16 días
    ['2026-10-22', 'amarillo'], // faltan 15 días (límite)
    ['2026-10-17', 'amarillo'], // faltan 10 días (TC08)
    ['2026-10-07', 'amarillo'], // vence hoy
    ['2026-10-06', 'rojo'], // vencido ayer (TC09)
  ])('CP-09: próxima fecha %s → %s', (fecha, esperado) => {
    // Arrange
    const proximaFecha = new Date(`${fecha}T00:00:00Z`);

    // Act
    const estado = calcularSemaforo(proximaFecha, hoy);

    // Assert
    expect(estado).toBe(esperado);
  });
  //#endregion

  it('usa la fecha actual cuando no se indica "hoy"', () => {
    // Arrange
    jest.useFakeTimers().setSystemTime(hoy);
    const proximaFecha = new Date('2026-10-12T00:00:00Z');

    // Act
    const estado = calcularSemaforo(proximaFecha);

    // Assert
    expect(estado).toBe('amarillo');
    jest.useRealTimers();
  });
});
