import { calcularProximaFecha, calcularSemaforo } from '../../src/utils/mantenimiento';
import {
  agregarMantenimiento,
  calcularResumenSemaforoEquipo,
  establecerOverrideSemaforo,
  guardarCicloEquipo,
  getHistorialEquipo,
} from '../../src/utils/historialService';
import {
  dispararNotificacionVencimiento,
  obtenerNotificacionesDisparadas,
  limpiarNotificacionesDisparadas,
} from '../../src/services/notificationService';
import {
  OrdenServicioEventEmitter,
  ProgramacionSemaforoObserver,
  HistorialCausaRaizObserver,
  NotificacionesVencimientoObserver,
} from '../../src/services/ordenServicioObserver';

describe('Sprint 8 · Programación Automática (HU7), Semáforo y Notificaciones (HU8) + Patrón Observer', () => {
  beforeEach(() => {
    limpiarNotificacionesDisparadas();
    establecerOverrideSemaforo('eq-sprint8-01', null);
  });

  test('HU7: Calcula la próxima fecha de mantenimiento para ciclos de 3, 6 y 12 meses', () => {
    const fechaCierre = new Date(Date.UTC(2026, 9, 15)); // 2026-10-15
    expect(calcularProximaFecha(fechaCierre, 3).toISOString().substring(0, 10)).toBe('2027-01-15');
    expect(calcularProximaFecha(fechaCierre, 6).toISOString().substring(0, 10)).toBe('2027-04-15');
    expect(calcularProximaFecha(fechaCierre, 12).toISOString().substring(0, 10)).toBe('2027-10-15');
  });

  test('TC08 (HU7/HU8): Equipo a 10 días de su próximo mantenimiento se muestra en color amarillo', () => {
    const hoy = new Date(Date.UTC(2026, 10, 1)); // 2026-11-01
    const proxima = new Date(Date.UTC(2026, 10, 11)); // 2026-11-11 (faltan 10 días)
    const estado = calcularSemaforo(proxima, hoy);
    expect(estado).toBe('amarillo');
  });

  test('TC09 (HU7/HU8): Equipo con mantenimiento vencido se muestra en rojo y dispara notificación al último ingeniero', async () => {
    const equipo = {
      id: 'eq-sprint8-01',
      numero_serie: 'SN-SPRINT8-ROJO',
      tipo_dispositivo: 'laptop',
      codigo_qr: 'TECHCARE-SN-SPRINT8-ROJO',
    };

    await agregarMantenimiento({
      id_equipo: equipo.id,
      numero_serie: equipo.numero_serie,
      codigo_qr: equipo.codigo_qr,
      fecha: '2026-01-10',
      subsistema: 'Refrigeración / Térmico',
      diagnostico: 'Limpieza de disipador y cambio de pasta térmica.',
      causa_raiz: 'Polvo acumulado en ductos',
      tecnico: 'Ing. Gabriel Flores',
      tipo_intervencion: 'preventiva',
      ciclo_meses: 6,
      estado: 'completado',
    });

    guardarCicloEquipo(equipo.id, 6);
    const historial = await getHistorialEquipo(equipo);
    // Hoy es posterior a 2026-07-10 (vencido)
    const hoySimulado = new Date(Date.UTC(2026, 10, 16));
    const resumen = calcularResumenSemaforoEquipo(equipo, historial, hoySimulado);

    expect(resumen.proximaFecha).toBe('2026-07-10');
    expect(resumen.estadoSemaforo).toBe('rojo');
    expect(resumen.ultimoIngeniero).toBe('Ing. Gabriel Flores');

    const notif = await dispararNotificacionVencimiento({
      idEquipo: equipo.id,
      numeroSerie: equipo.numero_serie,
      tipoDispositivo: equipo.tipo_dispositivo,
      ultimoIngeniero: resumen.ultimoIngeniero,
      proximaFecha: resumen.proximaFecha,
      estadoSemaforo: resumen.estadoSemaforo,
    });

    expect(notif.ultimoIngeniero).toBe('Ing. Gabriel Flores');
    expect(notif.mensaje).toContain('Ing. Gabriel Flores');
    expect(notif.mensaje).toContain('SN-SPRINT8-ROJO');
    expect(obtenerNotificacionesDisparadas().length).toBeGreaterThanOrEqual(1);
  });

  test('Patrón Observer (Parte 4): OrdenServicioEventEmitter notifica a los 3 observadores desacoplados al cerrar orden', async () => {
    const bus = new OrdenServicioEventEmitter();
    bus.suscribir(new ProgramacionSemaforoObserver());
    bus.suscribir(new HistorialCausaRaizObserver());
    bus.suscribir(new NotificacionesVencimientoObserver());

    expect(bus.obtenerSuscriptores()).toEqual([
      'ProgramacionSemaforoObserver',
      'HistorialCausaRaizObserver',
      'NotificacionesVencimientoObserver',
    ]);

    const resultado = await bus.emitirOrdenCerrada({
      idOrden: 'ord-obs-001',
      idEquipo: 'eq-obs-01',
      numeroSerie: 'SN-OBS-01',
      tipoDispositivo: 'servidor',
      codigoQr: 'TECHCARE-SN-OBS-01',
      fechaCierre: new Date(),
      cicloMeses: 6,
      tipoIntervencion: 'preventiva',
      subsistemaAtendido: 'Almacenamiento (SSD / Disco)',
      diagnostico: 'Verificación de arreglo RAID y estado SMART óptimo.',
      causaRaiz: 'Mantenimiento preventivo programado',
      tecnicoResponsable: 'Ing. Cinthia López',
    });

    expect(resultado.estadoSemaforo).toBe('verde');
    expect(resultado.proximaFecha).toBeDefined();
    expect(resultado.metricasFiabilidad).toBeDefined();
    expect(resultado.metricasFiabilidad?.ultimoIngeniero).toBe('Ing. Cinthia López');
  });
});

