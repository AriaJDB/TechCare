import { supabase } from '../supabaseClient';
import { calcularProximaFecha, type CicloMeses } from '../utils/mantenimiento';

export type TareaChecklist =
  | 'limpieza'
  | 'ventiladores'
  | 'pasta_termica'
  | 'puertos'
  | 'temperatura'
  | 'smart';

export interface ChecklistItem {
  id_item: string;
  id_orden: string;
  tarea: TareaChecklist;
  obligatorio: boolean;
  completado: boolean;
  fecha_marcado: string | null;
}

export interface OrdenServicio {
  id_orden: string;
  id_equipo: string;
  id_tecnico: string;
  fecha_inicio: string;
  fecha_cierre?: string | null;
  ciclo_meses: number;
  proxima_fecha_mtto?: string | null;
  estado_semaforo?: string;
  tipo_intervencion: 'preventiva' | 'correctiva';
  subsistema_atendido?: string;
  diagnostico?: string;
  causa_raiz?: string;
  cerrada: boolean;
  puertos_detalle?: PuertosDetalle;
  temperatura_detalle?: TemperaturaDetalle;
  smart_detalle?: SmartDetalle;
}

export interface ProgresoChecklist {
  completadas: number;
  total: number;
  porcentaje: number;
}

/** Tareas correspondientes a la Parte 1 (Sprint 5 - HU4) */
export const TAREAS_PARTE_1: readonly TareaChecklist[] = [
  'limpieza',
  'ventiladores',
  'pasta_termica',
] as const;

/** Tareas correspondientes a la Parte 2 (Sprint 6 - HU5) */
export const TAREAS_PARTE_2: readonly TareaChecklist[] = [
  'puertos',
  'temperatura',
  'smart',
] as const;

/** Catálogo completo de las 6 tareas técnicas del MVP */
export const TODAS_LAS_TAREAS: readonly TareaChecklist[] = [
  ...TAREAS_PARTE_1,
  ...TAREAS_PARTE_2,
] as const;

/** Metadatos descriptivos de las tareas de servicio */
export const TAREAS_INFO: Record<
  TareaChecklist,
  { titulo: string; descripcion: string; icon: string; parte: 1 | 2 }
> = {
  limpieza: {
    titulo: 'Limpieza general',
    descripcion: 'Remoción de polvo en placa madre, disipador y carcasa física',
    icon: '🧹',
    parte: 1,
  },
  ventiladores: {
    titulo: 'Ventiladores y flujo de aire',
    descripcion: 'Inspección de giro, lubricación y limpieza de fan coolers',
    icon: '🌀',
    parte: 1,
  },
  pasta_termica: {
    titulo: 'Pasta / compuesto térmico',
    descripcion: 'Limpieza de compuesto degradado y aplicación de nueva pasta en CPU/GPU',
    icon: '🧪',
    parte: 1,
  },
  puertos: {
    titulo: 'Inspección de puertos físicos',
    descripcion: 'Prueba de puertos USB, HDMI/DP, Jack audio y RJ45 Ethernet',
    icon: '🔌',
    parte: 2,
  },
  temperatura: {
    titulo: 'Medición de temperatura',
    descripcion: 'Registro de temperaturas pre y post servicio con cálculo de delta térmico',
    icon: '🌡️',
    parte: 2,
  },
  smart: {
    titulo: 'Diagnóstico S.M.A.R.T',
    descripcion: 'Evaluación rápida de salud, horas de uso y sectores del disco/SSD',
    icon: '💾',
    parte: 2,
  },
};

// ----------------------------------------------------------------------------
// Modelos de datos para verificaciones técnicas de Sprint 6 (HU5)
// ----------------------------------------------------------------------------

export type EstadoPuerto = 'ok' | 'falla' | 'danado' | 'no_aplica';

export interface PuertosDetalle {
  usb_a: EstadoPuerto;
  usb_c: EstadoPuerto;
  hdmi: EstadoPuerto;
  audio: EstadoPuerto;
  rj45: EstadoPuerto;
  observaciones?: string;
}

export interface TemperaturaDetalle {
  tempCpuPre: number;
  tempGpuPre?: number;
  tempCpuPost: number;
  tempGpuPost?: number;
  deltaCpu: number;
  deltaGpu?: number;
  alerta: 'normal' | 'advertencia' | 'critica';
}

export interface SmartDetalle {
  saludPorcentaje: number;
  estado: 'bueno' | 'regular' | 'riesgo' | 'critico';
  horasEncendido: number;
  sectoresReasignados: number;
  temperaturaDisco?: number;
  diagnostico: string;
}

// ----------------------------------------------------------------------------
// Funciones de Cálculo de Progreso y Validación
// ----------------------------------------------------------------------------

/**
 * Calcula el progreso de las tareas del checklist.
 * Por compatibilidad con Sprint 5 (HU4), por defecto calcula el progreso de la Parte 1.
 * @param items Lista de tareas asignadas a la orden.
 * @param filtro Opcional: 'todos' | 'parte1' | 'parte2' (por defecto 'parte1')
 */
export function calcularProgreso(
  items: ChecklistItem[],
  filtro: 'todos' | 'parte1' | 'parte2' = 'parte1'
): ProgresoChecklist {
  if (!items || items.length === 0) {
    return { completadas: 0, total: 0, porcentaje: 0 };
  }

  let itemsFiltrados = items;
  if (filtro === 'parte1') {
    itemsFiltrados = items.filter((item) => TAREAS_PARTE_1.includes(item.tarea));
  } else if (filtro === 'parte2') {
    itemsFiltrados = items.filter((item) => TAREAS_PARTE_2.includes(item.tarea));
  }

  const total = itemsFiltrados.length;
  if (total === 0) {
    return { completadas: 0, total: 0, porcentaje: 0 };
  }

  const completadas = itemsFiltrados.filter((item) => item.completado).length;
  const porcentaje = Math.round((completadas / total) * 100);

  return { completadas, total, porcentaje };
}

/**
 * Calcula el progreso global de todas las tareas del checklist (Parte 1 + Parte 2).
 */
export function calcularProgresoGlobal(items: ChecklistItem[]): ProgresoChecklist {
  return calcularProgreso(items, 'todos');
}

/**
 * Valida si la Parte 1 del checklist está 100 % completa.
 */
export function parteUnoCompleta(items: ChecklistItem[]): boolean {
  if (!items || items.length === 0) return false;
  return TAREAS_PARTE_1.every((tareaReq) =>
    items.some((item) => item.tarea === tareaReq && item.completado === true)
  );
}

/**
 * Valida si la Parte 2 del checklist está 100 % completa.
 */
export function parteDosCompleta(items: ChecklistItem[]): boolean {
  if (!items || items.length === 0) return false;
  return TAREAS_PARTE_2.every((tareaReq) =>
    items.some((item) => item.tarea === tareaReq && item.completado === true)
  );
}

/**
 * Valida si el checklist completo de punta a punta está al 100% (todas las tareas obligatorias).
 */
export function checklistCompleto(items: ChecklistItem[]): boolean {
  if (!items || items.length === 0) return false;
  const itemsObligatorios = items.filter((item) => item.obligatorio);
  if (itemsObligatorios.length === 0) return false;
  return itemsObligatorios.every((item) => item.completado === true);
}

/**
 * Devuelve el listado de tareas obligatorias que aún siguen pendientes.
 */
export function obtenerTareasPendientes(items: ChecklistItem[]): ChecklistItem[] {
  if (!items) return [];
  return items.filter((item) => item.obligatorio && !item.completado);
}

// ----------------------------------------------------------------------------
// Evaluaciones Técnicas de Sprint 6
// ----------------------------------------------------------------------------

/**
 * Evalúa las temperaturas pre y post servicio, calculando el delta térmico y estado.
 */
export function evaluarTemperatura(
  tempCpuPre: number,
  tempCpuPost: number,
  tempGpuPre?: number,
  tempGpuPost?: number
): TemperaturaDetalle {
  const deltaCpu = Number((tempCpuPost - tempCpuPre).toFixed(1));
  const deltaGpu =
    tempGpuPre !== undefined && tempGpuPost !== undefined
      ? Number((tempGpuPost - tempGpuPre).toFixed(1))
      : undefined;

  let alerta: 'normal' | 'advertencia' | 'critica' = 'normal';
  const maxTemp = Math.max(tempCpuPost, tempGpuPost || 0);

  if (maxTemp >= 88) {
    alerta = 'critica';
  } else if (maxTemp >= 76) {
    alerta = 'advertencia';
  }

  return {
    tempCpuPre,
    tempGpuPre,
    tempCpuPost,
    tempGpuPost,
    deltaCpu,
    deltaGpu,
    alerta,
  };
}

/**
 * Evalúa el estado de salud S.M.A.R.T. del disco o SSD y genera recomendación automática.
 */
export function evaluarSmart(
  saludPorcentaje: number,
  horasEncendido: number,
  sectoresReasignados: number,
  temperaturaDisco = 38
): SmartDetalle {
  let estado: 'bueno' | 'regular' | 'riesgo' | 'critico' = 'bueno';
  let diagnostico = 'Unidad en estado óptimo. Sin sectores defectuosos.';

  if (saludPorcentaje < 40 || sectoresReasignados > 50) {
    estado = 'critico';
    diagnostico =
      'CRÍTICO: Unidad al final de su vida útil o con sectores reasignados severos. Remplazo urgente antes de pérdida total de datos.';
  } else if (saludPorcentaje < 75 || sectoresReasignados > 0) {
    estado = 'riesgo';
    diagnostico =
      'ADVERTENCIA: Se detectaron sectores reasignados o degradación de celdas. Programar cambio preventivo de unidad.';
  } else if (horasEncendido > 25000) {
    estado = 'regular';
    diagnostico =
      'Aceptable: Horas de encendido elevadas (> 25,000h). Mantener respaldos periódicos.';
  }

  return {
    saludPorcentaje,
    estado,
    horasEncendido,
    sectoresReasignados,
    temperaturaDisco,
    diagnostico,
  };
}

// ----------------------------------------------------------------------------
// Almacenamiento Local (Offline First)
// ----------------------------------------------------------------------------

const DRAFT_PREFIX = 'techcare_checklist_draft_';
const TELEMETRY_PREFIX = 'techcare_telemetry_';

export function guardarBorradorLocal(idOrden: string, items: ChecklistItem[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${DRAFT_PREFIX}${idOrden}`, JSON.stringify(items));
    }
  } catch {
    // Si localStorage no está disponible, continuar sin bloquear
  }
}

export function obtenerBorradorLocal(idOrden: string): ChecklistItem[] | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(`${DRAFT_PREFIX}${idOrden}`);
      return data ? JSON.parse(data) : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function guardarTelemetriaLocal(idOrden: string, tipo: string, data: unknown): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${TELEMETRY_PREFIX}${tipo}_${idOrden}`, JSON.stringify(data));
    }
  } catch {
    // Ignore
  }
}

export function obtenerTelemetriaLocal<T>(idOrden: string, tipo: string): T | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`${TELEMETRY_PREFIX}${tipo}_${idOrden}`);
      return raw ? JSON.parse(raw) : null;
    }
  } catch {
    return null;
  }
  return null;
}

// ----------------------------------------------------------------------------
// Operaciones de API y Base de Datos (Supabase)
// ----------------------------------------------------------------------------

/**
 * Inicia una orden de servicio para un equipo dado.
 * Si ya existe una orden abierta, la reanuda asegurando las 6 tareas del checklist.
 */
export async function iniciarOrden(
  idEquipo: string,
  idTecnico?: string,
  cicloMeses = 6,
  tipoIntervencion: 'preventiva' | 'correctiva' = 'preventiva'
): Promise<OrdenServicio> {
  let tecnicoId = idTecnico;
  if (!tecnicoId) {
    const { data: authData } = await supabase.auth.getUser();
    tecnicoId = authData.user?.id;
  }

  if (!tecnicoId) {
    throw new Error('Sesión de usuario no válida para iniciar la orden.');
  }

  // 1. Comprobar si ya existe una orden abierta
  const { data: ordenesAbiertas, error: errorBusqueda } = await supabase
    .from('orden_servicio')
    .select('*')
    .eq('id_equipo', idEquipo)
    .eq('cerrada', false)
    .order('fecha_inicio', { ascending: false })
    .limit(1);

  if (!errorBusqueda && ordenesAbiertas && ordenesAbiertas.length > 0) {
    const ordenExistente = ordenesAbiertas[0] as OrdenServicio;
    await asegurarItemsCompletos(ordenExistente.id_orden);
    return ordenExistente;
  }

  // 2. Crear nueva orden de servicio
  const { data: nuevaOrden, error: errorCreacion } = await supabase
    .from('orden_servicio')
    .insert([
      {
        id_equipo: idEquipo,
        id_tecnico: tecnicoId,
        ciclo_meses: cicloMeses,
        tipo_intervencion: tipoIntervencion,
        cerrada: false,
      },
    ])
    .select()
    .single();

  if (errorCreacion || !nuevaOrden) {
    throw new Error('No se pudo crear la orden de servicio. Intente nuevamente.');
  }

  const orden = nuevaOrden as OrdenServicio;
  await asegurarItemsCompletos(orden.id_orden);
  return orden;
}

/**
 * Garantiza que las 6 tareas del checklist existan en la orden.
 */
export async function asegurarItemsCompletos(idOrden: string): Promise<void> {
  const { data: itemsExistentes } = await supabase
    .from('checklist_item')
    .select('tarea')
    .eq('id_orden', idOrden);

  const tareasExistentes = (itemsExistentes || []).map((it) => it.tarea);
  const faltantes = TODAS_LAS_TAREAS.filter((t) => !tareasExistentes.includes(t));

  if (faltantes.length > 0) {
    const nuevosItems = faltantes.map((t) => ({
      id_orden: idOrden,
      tarea: t,
      obligatorio: true,
      completado: false,
    }));
    const tableRef: any = supabase.from('checklist_item');
    if (typeof tableRef?.insert === 'function') {
      await tableRef.insert(nuevosItems);
    }
  }
}

/**
 * Consulta el listado de checklist_item asignados a una orden de servicio.
 */
export async function obtenerChecklist(idOrden: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_item')
    .select('*')
    .eq('id_orden', idOrden);

  if (error) {
    const local = obtenerBorradorLocal(idOrden);
    if (local && local.length > 0) {
      return local;
    }
    throw new Error('No fue posible cargar el checklist. Verifique su conexión.');
  }

  // Ordenar conforme al orden oficial de tareas
  const ordenItems = (data as ChecklistItem[]).sort((a, b) => {
    const idxA = TODAS_LAS_TAREAS.indexOf(a.tarea);
    const idxB = TODAS_LAS_TAREAS.indexOf(b.tarea);
    return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
  });

  guardarBorradorLocal(idOrden, ordenItems);
  return ordenItems;
}

/**
 * Marca o desmarca una tarea técnica del checklist.
 */
export async function marcarTarea(idItem: string, completado: boolean): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from('checklist_item')
    .update({ completado })
    .eq('id_item', idItem)
    .select()
    .single();

  if (error || !data) {
    throw new Error('Error al actualizar la verificación. Por favor intente nuevamente.');
  }

  return data as ChecklistItem;
}

/**
 * Guarda los detalles de inspección de puertos físicos.
 */
export async function guardarPuertosDetalle(
  idOrden: string,
  detalle: PuertosDetalle
): Promise<void> {
  guardarTelemetriaLocal(idOrden, 'puertos', detalle);
  try {
    await supabase
      .from('orden_servicio')
      .update({ puertos_detalle: detalle })
      .eq('id_orden', idOrden);
  } catch {
    // Si la columna aún no está en Supabase, la información sigue segura en telemetría local
  }
}

/**
 * Guarda los detalles de temperatura pre/post servicio.
 */
export async function guardarTemperaturaDetalle(
  idOrden: string,
  detalle: TemperaturaDetalle
): Promise<void> {
  guardarTelemetriaLocal(idOrden, 'temperatura', detalle);
  try {
    await supabase
      .from('orden_servicio')
      .update({ temperatura_detalle: detalle })
      .eq('id_orden', idOrden);
  } catch {
    // Continúa con respaldo local
  }
}

/**
 * Guarda el diagnóstico SMART del disco/SSD.
 */
export async function guardarSmartDetalle(
  idOrden: string,
  detalle: SmartDetalle
): Promise<void> {
  guardarTelemetriaLocal(idOrden, 'smart', detalle);
  try {
    await supabase
      .from('orden_servicio')
      .update({ smart_detalle: detalle })
      .eq('id_orden', idOrden);
  } catch {
    // Continúa con respaldo local
  }
}

/**
 * Cierra una orden de servicio validando que el checklist obligatorio esté al 100%.
 * Escenario HU4/HU5 & TC06: "Bloquea el cierre y señala las tareas pendientes si el checklist está incompleto."
 * HU7: Calcula y guarda la próxima fecha de mantenimiento.
 * HU8: Actualiza el semáforo a 'verde'.
 */
export async function cerrarOrdenServicio(
  idOrden: string,
  params: {
    items: ChecklistItem[];
    cicloMeses?: CicloMeses;
    diagnostico?: string;
    causaRaiz?: string;
    subsistemaAtendido?: string;
    tipoIntervencion?: 'preventiva' | 'correctiva';
  }
): Promise<OrdenServicio> {
  const { items, cicloMeses = 6, diagnostico, causaRaiz, subsistemaAtendido, tipoIntervencion } = params;

  // 1. Validar regla de negocio fundamental (TC06 / HU4/HU5)
  const pendientes = obtenerTareasPendientes(items);
  if (pendientes.length > 0) {
    const nombresPendientes = pendientes
      .map((p) => TAREAS_INFO[p.tarea]?.titulo || p.tarea)
      .join(', ');
    const error = new Error(
      `No se puede cerrar la orden de servicio: existen tareas obligatorias sin marcar (${nombresPendientes}).`
    ) as Error & { code?: string; pendientes?: ChecklistItem[] };
    error.code = 'P0001';
    error.pendientes = pendientes;
    throw error;
  }

  // 2. Calcular próxima fecha de mantenimiento (HU7)
  const ahora = new Date();
  const proximaFecha = calcularProximaFecha(ahora, cicloMeses);
  const proximaFechaStr = proximaFecha.toISOString().substring(0, 10);

  // 3. Actualizar la orden en Supabase
  const updatePayload: Partial<OrdenServicio> = {
    cerrada: true,
    fecha_cierre: ahora.toISOString(),
    ciclo_meses: cicloMeses,
    proxima_fecha_mtto: proximaFechaStr,
    estado_semaforo: 'verde',
    diagnostico: diagnostico || 'Mantenimiento integral completado con éxito.',
    causa_raiz: causaRaiz || '',
    subsistema_atendido: subsistemaAtendido || 'General',
    tipo_intervencion: tipoIntervencion || 'preventiva',
  };

  const { data, error } = await supabase
    .from('orden_servicio')
    .update(updatePayload)
    .eq('id_orden', idOrden)
    .select()
    .single();

  if (error || !data) {
    // Si la base de datos lanza trigger P0001 o hay problema de red
    throw new Error(error?.message || 'Error al cerrar la orden de servicio.');
  }

  return data as OrdenServicio;
}
