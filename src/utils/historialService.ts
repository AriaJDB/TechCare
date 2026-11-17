import { obtenerBorradorEvidencias, obtenerEvidenciasPorEquipoLocal, type EvidenciaItem } from '../services/evidenciasService';
import { calcularProximaFecha, calcularSemaforo, type CicloMeses, type EstadoSemaforo } from './mantenimiento';

function getSupabase() {
  if (typeof window !== 'undefined' && (window as any).__techcare_supabase) {
    return (window as any).__techcare_supabase;
  }
  return null;
}

export interface MantenimientoRecord {
  id: string;
  id_orden?: string;
  id_equipo?: string;
  codigo_qr?: string;
  numero_serie?: string;
  fecha: string; // ISO date 'YYYY-MM-DD'
  subsistema: string;
  diagnostico: string;
  causa_raiz?: string;
  tecnico: string;
  tipo_intervencion?: 'preventiva' | 'correctiva';
  ciclo_meses?: CicloMeses;
  proxima_fecha_mtto?: string;
  costo_estimado?: string;
  estado?: 'completado' | 'en_proceso' | 'pendiente';
  evidencias?: EvidenciaItem[];
}

export interface AlertaFallaRecurrente {
  subsistema: string;
  totalIncidencias: number;
  causasRaizPrevias: string[];
  ultimaFecha: string;
  ultimoTecnico: string;
  sugerenciaRevision: string;
}

export interface MetricasFiabilidadEquipo {
  totalIntervenciones: number;
  preventivas: number;
  correctivas: number;
  indiceFiabilidad: number; // 0 - 100%
  ultimoIngeniero: string;
  ultimaFechaServicio: string | null;
  subsistemaMasCritico: string | null;
  alertasRecurrentes: AlertaFallaRecurrente[];
}

export interface ResumenSemaforoEquipo {
  estadoSemaforo: EstadoSemaforo;
  esManual: boolean;
  proximaFecha: string;
  diasRestantes: number;
  cicloMeses: CicloMeses;
  ultimoIngeniero: string;
  ultimaFechaServicio: string;
}

const STORAGE_KEY = 'techcare_historial_mantenimientos';
const SEMAFORO_OVERRIDE_KEY = 'techcare_semaforo_overrides';
const CICLO_EQUIPO_KEY = 'techcare_ciclo_equipos';

// Sugerencias de causa raíz por subsistema (HU9)
const SUGERENCIAS_SUBSISTEMA: Record<string, string> = {
  refrigeracion:
    'Verificar rodamiento de ventiladores, obstrucción en disipador de cobre, degradación de thermal pads y curva PWM en BIOS.',
  almacenamiento:
    'Revisar sectores reasignados S.M.A.R.T., cableado/conector SATA o M.2 NVMe, temperatura del controlador y salud de celdas NAND.',
  alimentacion:
    'Inspeccionar estabilidad de rieles de voltaje en fuente de poder, desgaste de celdas de batería y circuito de carga.',
  placa:
    'Inspeccionar soldaduras frías en puertos físicos, capacitores VRM, sulfatación en placa base y protección ESD.',
  pantalla:
    'Revisar cable flex LVDS/eDP, bisagras mecánicas, conector de video en motherboard y chip gráfico.',
  sistema:
    'Auditar versión de microcódigo UEFI/BIOS, controladores firmados y registros de Kernel Power en sistema operativo.',
};

function obtenerSugerenciaPorSubsistema(subsistema: string): string {
  const s = subsistema.toLowerCase();
  if (s.includes('refriger') || s.includes('térmic') || s.includes('termic') || s.includes('ventilador')) {
    return SUGERENCIAS_SUBSISTEMA.refrigeracion;
  }
  if (s.includes('almacenamiento') || s.includes('ssd') || s.includes('disco')) {
    return SUGERENCIAS_SUBSISTEMA.almacenamiento;
  }
  if (s.includes('fuente') || s.includes('bater') || s.includes('alimenta')) {
    return SUGERENCIAS_SUBSISTEMA.alimentacion;
  }
  if (s.includes('placa') || s.includes('puerto') || s.includes('conector')) {
    return SUGERENCIAS_SUBSISTEMA.placa;
  }
  if (s.includes('pantalla') || s.includes('video')) {
    return SUGERENCIAS_SUBSISTEMA.pantalla;
  }
  return SUGERENCIAS_SUBSISTEMA.sistema;
}

// Registros semilla de ejemplo para que los equipos tengan historial demostrativo de inmediato
const SEED_HISTORIAL: Omit<MantenimientoRecord, 'id' | 'id_equipo' | 'numero_serie' | 'codigo_qr'>[] = [
  {
    fecha: '2026-09-18',
    subsistema: 'Refrigeración / Térmico',
    diagnostico:
      'Mantenimiento preventivo semestral: limpieza interna de ventiladores, soplado de ductos térmicos y renovación de pasta térmica Arctic MX-4. Disminución de temperatura operativa en reposo de 58°C a 41°C.',
    causa_raiz: 'Degradación natural de compuesto térmico por ciclo semestral de operación',
    tecnico: 'Ing. Cinthia López',
    tipo_intervencion: 'preventiva',
    ciclo_meses: 6,
    estado: 'completado',
  },
  {
    fecha: '2026-06-10',
    subsistema: 'Almacenamiento (SSD / Disco)',
    diagnostico:
      'Diagnóstico de rendimiento: comprobación de salud SMART al 98%, sectores limpios, prueba de lectura/escritura secuencial en 3200 MB/s. Optimización de partición y desfragmentación de TRIM.',
    causa_raiz: 'Revisión periódica de salud NAND Flash sin anomalías físicas',
    tecnico: 'Ing. Gabriel Flores',
    tipo_intervencion: 'preventiva',
    ciclo_meses: 6,
    estado: 'completado',
  },
  {
    fecha: '2026-03-05',
    subsistema: 'Fuente de poder y Batería',
    diagnostico:
      'Calibración de celdas de batería y verificación de voltaje estable de adaptador de corriente a 19.5V. Estado de degradación de batería en 89% de capacidad nominal.',
    causa_raiz: 'Descalibración de indicador de carga por ciclos continuos en CA',
    tecnico: 'Ing. Edgar Alegría',
    tipo_intervencion: 'preventiva',
    ciclo_meses: 6,
    estado: 'completado',
  },
  {
    fecha: '2025-11-20',
    subsistema: 'Sistema Operativo y Firmware',
    diagnostico:
      'Actualización preventiva de microcódigo UEFI BIOS v2.40, parches críticos de seguridad y depuración de controladores de red inalámbrica.',
    causa_raiz: 'Versión de firmware desactualizada con latencia en gestión de energía ACPI',
    tecnico: 'Ing. Ariadna Juárez',
    tipo_intervencion: 'preventiva',
    ciclo_meses: 6,
    estado: 'completado',
  },
];

const memoryRecords: MantenimientoRecord[] = [];
const memoryOverrides: Record<string, EstadoSemaforo> = {};
const memoryCiclos: Record<string, CicloMeses> = {};

function getLocalRecords(): MantenimientoRecord[] {
  try {
    if (typeof localStorage === 'undefined') return memoryRecords;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryRecords;
    return JSON.parse(raw);
  } catch {
    return memoryRecords;
  }
}

function saveLocalRecords(records: MantenimientoRecord[]): void {
  try {
    if (typeof localStorage === 'undefined') {
      memoryRecords.length = 0;
      memoryRecords.push(...records);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('No se pudo guardar en localStorage', err);
  }
}

/**
 * Obtiene el historial de mantenimientos de un equipo dado.
 * Cumple con TC11 (HU9) y HU6 (Evidencias fotográficas):
 * "Se listan los mantenimientos en orden cronológico inverso con fecha, subsistema, diagnóstico, causa raíz, técnico y evidencias"
 */
export async function getHistorialEquipo(equipo: {
  id?: string;
  id_equipo?: string;
  numero_serie?: string;
  codigo_qr?: string;
}): Promise<MantenimientoRecord[]> {
  let records: MantenimientoRecord[] = [];
  const idEquipo = equipo.id || equipo.id_equipo;

  // 1. Intentar consultar en Supabase
  try {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from('mantenimiento')
        .select('*')
        .or(`id_equipo.eq.${idEquipo},codigo_qr.eq.${equipo.codigo_qr}`)
        .order('fecha', { ascending: false });

      if (!error && data && data.length > 0) {
        records = data.map((item: any) => ({
          id: item.id || `sup-${Math.random()}`,
          id_orden: item.id_orden,
          id_equipo: item.id_equipo,
          codigo_qr: item.codigo_qr,
          numero_serie: item.numero_serie,
          fecha: item.fecha ? item.fecha.substring(0, 10) : new Date().toISOString().substring(0, 10),
          subsistema: item.subsistema || item.sistema || 'General',
          diagnostico: item.diagnostico || item.descripcion || item.observaciones || 'Mantenimiento registrado',
          causa_raiz: item.causa_raiz || '',
          tecnico: item.tecnico || item.nombre_tecnico || 'Técnico asignado',
          tipo_intervencion: item.tipo_intervencion || 'preventiva',
          ciclo_meses: (item.ciclo_meses as CicloMeses) || 6,
          proxima_fecha_mtto: item.proxima_fecha_mtto,
          estado: item.estado || 'completado',
          evidencias: item.evidencias || [],
        }));
      }

      // Consultar órdenes de servicio con sus evidencias fotográficas asociadas
      if (idEquipo) {
        const { data: ordenesData } = await sb
          .from('orden_servicio')
          .select('*, evidencia_fotografica(*)')
          .eq('id_equipo', idEquipo)
          .order('fecha_inicio', { ascending: false });

        if (ordenesData && ordenesData.length > 0) {
          for (const ord of ordenesData) {
            const yaExiste = records.some((r) => r.id_orden === ord.id_orden);
            const evs = Array.isArray(ord.evidencia_fotografica) ? ord.evidencia_fotografica : [];
            if (!yaExiste && (ord.cerrada || evs.length > 0)) {
              records.push({
                id: `ord-${ord.id_orden}`,
                id_orden: ord.id_orden,
                id_equipo: idEquipo,
                codigo_qr: equipo.codigo_qr,
                numero_serie: equipo.numero_serie,
                fecha: (ord.fecha_cierre || ord.fecha_inicio || new Date().toISOString()).substring(0, 10),
                subsistema: ord.subsistema_atendido || 'Mantenimiento Integral (Checklist)',
                diagnostico: ord.diagnostico || 'Orden de servicio documentada con bitácora fotográfica.',
                causa_raiz: ord.causa_raiz || '',
                tecnico: ord.nombre_tecnico || 'Ing. Gabriel Flores',
                tipo_intervencion: ord.tipo_intervencion || 'preventiva',
                ciclo_meses: (ord.ciclo_meses as CicloMeses) || 6,
                proxima_fecha_mtto: ord.proxima_fecha_mtto,
                estado: ord.cerrada ? 'completado' : 'en_proceso',
                evidencias: evs,
              });
            }
          }
        }
      }
    }
  } catch {
    // Si la tabla no existe en Supabase todavía, se continúa con el almacenamiento local
  }

  // 2. Cargar registros locales
  const local = getLocalRecords().filter(
    (r) =>
      (idEquipo && r.id_equipo === idEquipo) ||
      (equipo.codigo_qr && r.codigo_qr === equipo.codigo_qr) ||
      (equipo.numero_serie && r.numero_serie === equipo.numero_serie)
  );

  for (const r of local) {
    if (!records.some((rec) => rec.id === r.id || (r.id_orden && rec.id_orden === r.id_orden))) {
      records.push(r);
    }
  }

  // Si no hay ningún registro histórico para este equipo, inicializar registros semilla coherentes
  if (records.length === 0) {
    const initialSeed: MantenimientoRecord[] = SEED_HISTORIAL.map((seed, idx) => ({
      ...seed,
      id: `seed-${equipo.numero_serie || 'eq'}-${idx}`,
      id_equipo: idEquipo,
      codigo_qr: equipo.codigo_qr,
      numero_serie: equipo.numero_serie,
    }));

    const allLocal = getLocalRecords();
    saveLocalRecords([...allLocal, ...initialSeed]);
    records = initialSeed;
  }

  // 3. Vincular evidencias fotográficas locales por equipo y orden
  if (idEquipo) {
    const evsEquipo = obtenerEvidenciasPorEquipoLocal(idEquipo);
    if (evsEquipo.length > 0) {
      const mapPorOrden = new Map<string, EvidenciaItem[]>();
      for (const ev of evsEquipo) {
        const arr = mapPorOrden.get(ev.id_orden) || [];
        arr.push(ev);
        mapPorOrden.set(ev.id_orden, arr);
      }
      for (const [idOrd, evs] of mapPorOrden.entries()) {
        const reg = records.find((r) => r.id_orden === idOrd);
        if (reg) {
          reg.evidencias = evs;
        } else {
          records.push({
            id: `bitacora-${idOrd}`,
            id_orden: idOrd,
            id_equipo: idEquipo,
            codigo_qr: equipo.codigo_qr,
            numero_serie: equipo.numero_serie,
            fecha: new Date().toISOString().substring(0, 10),
            subsistema: 'Servicio Técnico con Bitácora Fotográfica',
            diagnostico: `Orden de servicio respaldada con ${evs.length} fotografía(s) de evidencia (${evs.map((e) => e.etapa).join(', ')}).`,
            tecnico: 'Ing. Cinthia López',
            tipo_intervencion: 'preventiva',
            estado: 'completado',
            evidencias: evs,
          });
        }
      }
    }
  }

  for (const r of records) {
    if (r.id_orden && (!r.evidencias || r.evidencias.length === 0)) {
      const ordEvs = obtenerBorradorEvidencias(r.id_orden);
      if (ordEvs.length > 0) {
        r.evidencias = ordEvs;
      }
    }
  }

  // TC11: Orden cronológico inverso (el más reciente primero)
  return records.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

/**
 * Registra un nuevo mantenimiento para un equipo (HU7, HU8 y HU9).
 */
export async function agregarMantenimiento(
  nuevo: Omit<MantenimientoRecord, 'id'>
): Promise<MantenimientoRecord> {
  const current = getLocalRecords();

  // Deduplicación 1: si ya existe un registro con el mismo id_orden
  if (nuevo.id_orden) {
    const yaExiste = current.find((r) => r.id_orden === nuevo.id_orden);
    if (yaExiste) {
      return yaExiste;
    }
  }

  // Deduplicación 2: evitar inserciones dobles por doble clic o llamadas concurrentes
  const duplicadoReciente = current.find((r) => {
    const mismoEquipo =
      (nuevo.id_equipo && r.id_equipo === nuevo.id_equipo) ||
      (nuevo.numero_serie && r.numero_serie === nuevo.numero_serie);
    const mismaFecha = r.fecha === nuevo.fecha;
    const mismoDiagnostico = r.diagnostico === nuevo.diagnostico;
    return mismoEquipo && mismaFecha && mismoDiagnostico;
  });

  if (duplicadoReciente) {
    return duplicadoReciente;
  }

  const evidencias =
    nuevo.evidencias && nuevo.evidencias.length > 0
      ? nuevo.evidencias
      : nuevo.id_orden
      ? obtenerBorradorEvidencias(nuevo.id_orden)
      : [];

  const ciclo: CicloMeses = nuevo.ciclo_meses && [3, 6, 12].includes(nuevo.ciclo_meses) ? nuevo.ciclo_meses : 6;
  let proximaStr = nuevo.proxima_fecha_mtto;
  if (!proximaStr) {
    try {
      const fechaBase = new Date((nuevo.fecha || new Date().toISOString().substring(0, 10)) + 'T12:00:00Z');
      proximaStr = calcularProximaFecha(fechaBase, ciclo).toISOString().substring(0, 10);
    } catch {
      proximaStr = calcularProximaFecha(new Date(), ciclo).toISOString().substring(0, 10);
    }
  }

  const record: MantenimientoRecord = {
    ...nuevo,
    id: `mant-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ciclo_meses: ciclo,
    proxima_fecha_mtto: proximaStr,
    evidencias,
  };

  // Intentar guardar en Supabase por si la tabla existe
  try {
    const sb = getSupabase();
    if (sb) {
      await sb.from('mantenimiento').insert([
        {
          id_equipo: record.id_equipo,
          codigo_qr: record.codigo_qr,
          numero_serie: record.numero_serie,
          fecha: record.fecha,
          subsistema: record.subsistema,
          diagnostico: record.diagnostico,
          causa_raiz: record.causa_raiz || '',
          tecnico: record.tecnico,
          tipo_intervencion: record.tipo_intervencion || 'preventiva',
          ciclo_meses: record.ciclo_meses,
          proxima_fecha_mtto: record.proxima_fecha_mtto,
          estado: record.estado || 'completado',
        },
      ]);
    }
  } catch {
    // Silencioso si la tabla no está en el backend de pruebas
  }

  // Guardar en almacenamiento local
  saveLocalRecords([record, ...current]);

  return record;
}

/**
 * HU9 — Escenario: Detección y alerta de fallas recurrentes por subsistema.
 * Detecta cuando un equipo registra 2 o más intervenciones correctivas previas en el mismo subsistema.
 */
export function analizarFallasRecurrentes(historial: MantenimientoRecord[]): AlertaFallaRecurrente[] {
  if (!historial || historial.length === 0) return [];

  const mapaSubsistemas = new Map<
    string,
    {
      nombreOriginal: string;
      count: number;
      causas: string[];
      ultimaFecha: string;
      ultimoTecnico: string;
    }
  >();

  // Ordenar del más reciente al más antiguo para tomar la fecha/técnico más reciente primero
  const ordenados = [...historial].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  for (const item of ordenados) {
    if (item.tipo_intervencion !== 'correctiva') continue;
    const subNorm = (item.subsistema || 'General').trim().toLowerCase();
    const existente = mapaSubsistemas.get(subNorm);
    const causaLimpia = (item.causa_raiz || '').trim();

    if (!existente) {
      mapaSubsistemas.set(subNorm, {
        nombreOriginal: item.subsistema || 'General',
        count: 1,
        causas: causaLimpia ? [causaLimpia] : [],
        ultimaFecha: item.fecha,
        ultimoTecnico: item.tecnico || 'Ingeniero de Soporte',
      });
    } else {
      existente.count += 1;
      if (causaLimpia && !existente.causas.includes(causaLimpia)) {
        existente.causas.push(causaLimpia);
      }
    }
  }

  const alertas: AlertaFallaRecurrente[] = [];
  for (const [, info] of mapaSubsistemas.entries()) {
    if (info.count >= 2) {
      alertas.push({
        subsistema: info.nombreOriginal,
        totalIncidencias: info.count,
        causasRaizPrevias:
          info.causas.length > 0
            ? info.causas
            : ['Reincidencia reportada en bitácora correctiva sin causa raíz detallada'],
        ultimaFecha: info.ultimaFecha,
        ultimoTecnico: info.ultimoTecnico,
        sugerenciaRevision: obtenerSugerenciaPorSubsistema(info.nombreOriginal),
      });
    }
  }

  return alertas.sort((a, b) => b.totalIncidencias - a.totalIncidencias);
}

/**
 * HU9 — Escenario: Registro de causa raíz y actualización de métricas de fiabilidad del equipo.
 */
export function calcularMetricasFiabilidad(historial: MantenimientoRecord[]): MetricasFiabilidadEquipo {
  if (!historial || historial.length === 0) {
    return {
      totalIntervenciones: 0,
      preventivas: 0,
      correctivas: 0,
      indiceFiabilidad: 100,
      ultimoIngeniero: 'Ing. Cinthia López',
      ultimaFechaServicio: null,
      subsistemaMasCritico: null,
      alertasRecurrentes: [],
    };
  }

  const ordenados = [...historial].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  const preventivas = ordenados.filter((r) => r.tipo_intervencion !== 'correctiva').length;
  const correctivas = ordenados.filter((r) => r.tipo_intervencion === 'correctiva').length;
  const alertasRecurrentes = analizarFallasRecurrentes(ordenados);

  // Índice de fiabilidad: 100 base, penaliza fallas correctivas y reincidencias por subsistema, bonifica preventivos recientes
  const penalizacionCorrectivas = correctivas * 12;
  const penalizacionRecurrentes = alertasRecurrentes.length * 15;
  const bonificacionPreventivas = Math.min(10, preventivas * 2);
  const indiceFiabilidad = Math.max(
    15,
    Math.min(100, 100 - penalizacionCorrectivas - penalizacionRecurrentes + bonificacionPreventivas)
  );

  return {
    totalIntervenciones: ordenados.length,
    preventivas,
    correctivas,
    indiceFiabilidad,
    ultimoIngeniero: ordenados[0]?.tecnico || 'Ing. Cinthia López',
    ultimaFechaServicio: ordenados[0]?.fecha || null,
    subsistemaMasCritico: alertasRecurrentes[0]?.subsistema || null,
    alertasRecurrentes,
  };
}

/**
 * Obtiene o guarda el ciclo configurado de un equipo (3, 6 o 12 meses).
 */
export function obtenerCicloEquipo(claveEquipo: string): CicloMeses {
  try {
    if (typeof localStorage === 'undefined') {
      return memoryCiclos[claveEquipo] || 6;
    }
    const raw = localStorage.getItem(CICLO_EQUIPO_KEY);
    if (!raw) return 6;
    const map = JSON.parse(raw) as Record<string, CicloMeses>;
    const val = map[claveEquipo];
    return val && [3, 6, 12].includes(val) ? val : 6;
  } catch {
    return 6;
  }
}

export function guardarCicloEquipo(claveEquipo: string, ciclo: CicloMeses): void {
  memoryCiclos[claveEquipo] = ciclo;
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(CICLO_EQUIPO_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[claveEquipo] = ciclo;
    localStorage.setItem(CICLO_EQUIPO_KEY, JSON.stringify(map));
  } catch {
    // Ignorar
  }
}

/**
 * Obtiene o establece el estado manual de demostración para el semáforo de un equipo,
 * conservando intacto el cálculo de la próxima fecha de mantenimiento.
 */
export function obtenerOverrideSemaforo(claveEquipo: string): EstadoSemaforo | null {
  try {
    if (typeof localStorage === 'undefined') {
      return memoryOverrides[claveEquipo] || null;
    }
    const raw = localStorage.getItem(SEMAFORO_OVERRIDE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, EstadoSemaforo>;
    return map[claveEquipo] || null;
  } catch {
    return null;
  }
}

export function establecerOverrideSemaforo(
  claveEquipo: string,
  estado: EstadoSemaforo | null
): void {
  if (estado === null) {
    delete memoryOverrides[claveEquipo];
  } else {
    memoryOverrides[claveEquipo] = estado;
  }

  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(SEMAFORO_OVERRIDE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (estado === null) {
      delete map[claveEquipo];
    } else {
      map[claveEquipo] = estado;
    }
    localStorage.setItem(SEMAFORO_OVERRIDE_KEY, JSON.stringify(map));
  } catch {
    // Ignorar
  }
}

/**
 * Calcula el resumen completo de programación y semáforo para un equipo (HU7 y HU8).
 */
export function calcularResumenSemaforoEquipo(
  equipo: { id?: string; id_equipo?: string; numero_serie?: string; codigo_qr?: string },
  historial: MantenimientoRecord[],
  hoy: Date = new Date()
): ResumenSemaforoEquipo {
  const clave = equipo.id || equipo.id_equipo || equipo.numero_serie || equipo.codigo_qr || 'default';
  const ordenados = [...(historial || [])].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  const ultimo = ordenados[0];
  const ultimaFechaStr = ultimo?.fecha || '2026-09-18';
  const ultimoIngeniero = ultimo?.tecnico || 'Ing. Cinthia López';
  const cicloMeses = obtenerCicloEquipo(clave) || ultimo?.ciclo_meses || 6;

  let proximaDate: Date;
  try {
    const fechaBase = new Date(ultimaFechaStr + 'T12:00:00Z');
    proximaDate = calcularProximaFecha(fechaBase, cicloMeses);
  } catch {
    proximaDate = calcularProximaFecha(hoy, cicloMeses);
  }

  const proximaFecha = proximaDate.toISOString().substring(0, 10);
  const estadoCalculado = calcularSemaforo(proximaDate, hoy);

  const objetivoUTC = Date.UTC(
    proximaDate.getUTCFullYear(),
    proximaDate.getUTCMonth(),
    proximaDate.getUTCDate()
  );
  const hoyUTC = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  const diasRestantes = Math.round((objetivoUTC - hoyUTC) / 86_400_000);

  const override = obtenerOverrideSemaforo(clave);

  return {
    estadoSemaforo: override || estadoCalculado,
    esManual: override !== null,
    proximaFecha,
    diasRestantes,
    cicloMeses,
    ultimoIngeniero,
    ultimaFechaServicio: ultimaFechaStr,
  };
}
