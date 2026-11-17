import { calcularProximaFecha, calcularSemaforo, type CicloMeses, type EstadoSemaforo } from '../utils/mantenimiento';
import {
  agregarMantenimiento,
  analizarFallasRecurrentes,
  calcularMetricasFiabilidad,
  establecerOverrideSemaforo,
  getHistorialEquipo,
  guardarCicloEquipo,
  type AlertaFallaRecurrente,
  type MetricasFiabilidadEquipo,
} from '../utils/historialService';
import { dispararNotificacionVencimiento } from './notificationService';

export interface EventoOrdenCerrada {
  idOrden: string;
  idEquipo: string;
  numeroSerie?: string;
  tipoDispositivo?: string;
  codigoQr?: string;
  fechaCierre: Date;
  cicloMeses: CicloMeses;
  tipoIntervencion: 'preventiva' | 'correctiva';
  subsistemaAtendido: string;
  diagnostico: string;
  causaRaiz?: string;
  tecnicoResponsable: string;
}

export interface ResultadoReaccionObserver {
  proximaFecha: string;
  estadoSemaforo: EstadoSemaforo;
  alertasRecurrentes: AlertaFallaRecurrente[];
  metricasFiabilidad?: MetricasFiabilidadEquipo;
  notificacionDisparada: boolean;
}

export interface OrdenCerradaObserver {
  readonly nombre: string;
  onOrdenCerrada(evento: EventoOrdenCerrada, contexto: ResultadoReaccionObserver): Promise<void> | void;
}

/**
 * Patrón de Diseño Observer (Parte 4 de la Arquitectura TechCare).
 * Actúa como Subject/Publisher desacoplando el cierre del checklist de los módulos:
 * 1. Programación y Semáforo (HU7 / HU8)
 * 2. Historial, Causa Raíz y Detección de Fallas Recurrentes (HU9)
 * 3. Notificaciones de Vencimiento (HU8)
 */
export class OrdenServicioEventEmitter {
  private observers: OrdenCerradaObserver[] = [];

  public suscribir(observer: OrdenCerradaObserver): void {
    if (!this.observers.some((o) => o.nombre === observer.nombre)) {
      this.observers.push(observer);
    }
  }

  public desuscribir(nombreObserver: string): void {
    this.observers = this.observers.filter((o) => o.nombre !== nombreObserver);
  }

  public obtenerSuscriptores(): string[] {
    return this.observers.map((o) => o.nombre);
  }

  public async emitirOrdenCerrada(evento: EventoOrdenCerrada): Promise<ResultadoReaccionObserver> {
    const proximaDate = calcularProximaFecha(evento.fechaCierre, evento.cicloMeses);
    const contexto: ResultadoReaccionObserver = {
      proximaFecha: proximaDate.toISOString().substring(0, 10),
      estadoSemaforo: calcularSemaforo(proximaDate),
      alertasRecurrentes: [],
      notificacionDisparada: false,
    };

    for (const observer of this.observers) {
      await observer.onOrdenCerrada(evento, contexto);
    }

    return contexto;
  }
}

/**
 * Observador 1: Módulo de Programación y Semáforo (HU7 / HU8)
 */
export class ProgramacionSemaforoObserver implements OrdenCerradaObserver {
  public readonly nombre = 'ProgramacionSemaforoObserver';

  public async onOrdenCerrada(
    evento: EventoOrdenCerrada,
    contexto: ResultadoReaccionObserver
  ): Promise<void> {
    const proxima = calcularProximaFecha(evento.fechaCierre, evento.cicloMeses);
    contexto.proximaFecha = proxima.toISOString().substring(0, 10);
    contexto.estadoSemaforo = calcularSemaforo(proxima);

    const clave = evento.idEquipo || evento.numeroSerie || evento.codigoQr || 'default';
    guardarCicloEquipo(clave, evento.cicloMeses);
    // Al concluir un servicio nuevo, el semáforo vuelve al cálculo automático en verde
    establecerOverrideSemaforo(clave, null);
  }
}

/**
 * Observador 2: Módulo de Historial, Causa Raíz y Fallas Recurrentes (HU9)
 */
export class HistorialCausaRaizObserver implements OrdenCerradaObserver {
  public readonly nombre = 'HistorialCausaRaizObserver';

  public async onOrdenCerrada(
    evento: EventoOrdenCerrada,
    contexto: ResultadoReaccionObserver
  ): Promise<void> {
    await agregarMantenimiento({
      id_orden: evento.idOrden,
      id_equipo: evento.idEquipo,
      numero_serie: evento.numeroSerie,
      codigo_qr: evento.codigoQr,
      fecha: evento.fechaCierre.toISOString().substring(0, 10),
      subsistema: evento.subsistemaAtendido,
      diagnostico: evento.diagnostico,
      causa_raiz: evento.causaRaiz || '',
      tecnico: evento.tecnicoResponsable,
      tipo_intervencion: evento.tipoIntervencion,
      ciclo_meses: evento.cicloMeses,
      proxima_fecha_mtto: contexto.proximaFecha,
      estado: 'completado',
    });

    const historial = await getHistorialEquipo({
      id: evento.idEquipo,
      numero_serie: evento.numeroSerie,
      codigo_qr: evento.codigoQr,
    });

    contexto.alertasRecurrentes = analizarFallasRecurrentes(historial);
    contexto.metricasFiabilidad = calcularMetricasFiabilidad(historial);
  }
}

/**
 * Observador 3: Módulo de Notificaciones de Vencimiento (HU8)
 */
export class NotificacionesVencimientoObserver implements OrdenCerradaObserver {
  public readonly nombre = 'NotificacionesVencimientoObserver';

  public async onOrdenCerrada(
    evento: EventoOrdenCerrada,
    contexto: ResultadoReaccionObserver
  ): Promise<void> {
    if (contexto.estadoSemaforo === 'rojo') {
      await dispararNotificacionVencimiento({
        idEquipo: evento.idEquipo,
        numeroSerie: evento.numeroSerie || 'SN-EQUIPO',
        tipoDispositivo: evento.tipoDispositivo || 'Equipo',
        ultimoIngeniero: evento.tecnicoResponsable,
        proximaFecha: contexto.proximaFecha,
        estadoSemaforo: 'rojo',
      });
      contexto.notificacionDisparada = true;
    }
  }
}

/**
 * Instancia singleton predeterminada con los tres observadores oficiales suscritos.
 */
export const ordenServicioBus = new OrdenServicioEventEmitter();
ordenServicioBus.suscribir(new ProgramacionSemaforoObserver());
ordenServicioBus.suscribir(new HistorialCausaRaizObserver());
ordenServicioBus.suscribir(new NotificacionesVencimientoObserver());

