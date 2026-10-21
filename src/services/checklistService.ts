import { supabase } from '../supabaseClient';

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

/** Metadatos descriptivos de las tareas de servicio */
export const TAREAS_INFO: Record<
  TareaChecklist,
  { titulo: string; descripcion: string; icon: string }
> = {
  limpieza: {
    titulo: 'Limpieza general',
    descripcion: 'Remoción de polvo en placa madre, disipador y carcasa física',
    icon: '🧹',
  },
  ventiladores: {
    titulo: 'Ventiladores y flujo de aire',
    descripcion: 'Inspección de giro, lubricación y limpieza de fan coolers',
    icon: '🌀',
  },
  pasta_termica: {
    titulo: 'Pasta / compuesto térmico',
    descripcion: 'Limpieza de compuesto degradado y aplicación de nueva pasta en CPU/GPU',
    icon: '🧪',
  },
  puertos: {
    titulo: 'Inspección de puertos físicos',
    descripcion: 'Prueba de puertos USB, HDMI, Jack y RJ45 (Sprint 6)',
    icon: '🔌',
  },
  temperatura: {
    titulo: 'Medición de temperatura',
    descripcion: 'Test térmico en reposo y bajo carga (Sprint 6)',
    icon: '🌡️',
  },
  smart: {
    titulo: 'Diagnóstico S.M.A.R.T',
    descripcion: 'Lectura de estado de salud del disco o SSD (Sprint 6)',
    icon: '💾',
  },
};

/**
 * Calcula el progreso de las tareas de la Parte 1 del checklist.
 * @param items Lista de tareas asignadas a la orden.
 */
export function calcularProgreso(items: ChecklistItem[]): ProgresoChecklist {
  if (!items || items.length === 0) {
    return { completadas: 0, total: 0, porcentaje: 0 };
  }

  const itemsParte1 = items.filter((item) => TAREAS_PARTE_1.includes(item.tarea));
  const total = itemsParte1.length;
  if (total === 0) {
    return { completadas: 0, total: 0, porcentaje: 0 };
  }

  const completadas = itemsParte1.filter((item) => item.completado).length;
  const porcentaje = Math.round((completadas / total) * 100);

  return { completadas, total, porcentaje };
}

/**
 * Valida si la Parte 1 del checklist está 100 % completa.
 * Requiere estrictamente que las 3 tareas obligatorias ('limpieza', 'ventiladores', 'pasta_termica')
 * existan y estén marcadas como completadas.
 * @param items Lista de tareas de la orden.
 */
export function parteUnoCompleta(items: ChecklistItem[]): boolean {
  if (!items || items.length === 0) {
    return false;
  }

  return TAREAS_PARTE_1.every((tareaReq) =>
    items.some((item) => item.tarea === tareaReq && item.completado === true),
  );
}

/** Almacenamiento local para resiliencia offline */
const DRAFT_PREFIX = 'techcare_checklist_draft_';

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

/**
 * Inicia una orden de servicio para un equipo dado.
 * Si ya existe una orden abierta para el equipo, la reanuda para continuar el checklist.
 * Genera de forma segura los ítems de la Parte 1.
 */
export async function iniciarOrden(
  idEquipo: string,
  idTecnico?: string,
  cicloMeses = 6,
  tipoIntervencion: 'preventiva' | 'correctiva' = 'preventiva',
): Promise<OrdenServicio> {
  // 1. Obtener sesión del usuario autenticado si no se proporciona idTecnico
  let tecnicoId = idTecnico;
  if (!tecnicoId) {
    const { data: authData } = await supabase.auth.getUser();
    tecnicoId = authData.user?.id;
  }

  if (!tecnicoId) {
    throw new Error('Sesión de usuario no válida para iniciar la orden.');
  }

  // 2. Comprobar si ya existe una orden abierta para este equipo
  const { data: ordenesAbiertas, error: errorBusqueda } = await supabase
    .from('orden_servicio')
    .select('*')
    .eq('id_equipo', idEquipo)
    .eq('cerrada', false)
    .order('fecha_inicio', { ascending: false })
    .limit(1);

  if (!errorBusqueda && ordenesAbiertas && ordenesAbiertas.length > 0) {
    const ordenExistente = ordenesAbiertas[0] as OrdenServicio;
    await asegurarItemsParteUno(ordenExistente.id_orden);
    return ordenExistente;
  }

  // 3. Crear nueva orden de servicio
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
  await asegurarItemsParteUno(orden.id_orden);
  return orden;
}

/**
 * Garantiza que las 3 tareas de la Parte 1 existan en la orden.
 * Si el trigger de la base de datos ya las creó, esta función no duplica.
 */
async function asegurarItemsParteUno(idOrden: string): Promise<void> {
  const { data: itemsExistentes } = await supabase
    .from('checklist_item')
    .select('tarea')
    .eq('id_orden', idOrden);

  const tareasExistentes = (itemsExistentes || []).map((it) => it.tarea);
  const faltantes = TAREAS_PARTE_1.filter((t) => !tareasExistentes.includes(t));

  if (faltantes.length > 0) {
    const nuevosItems = faltantes.map((t) => ({
      id_orden: idOrden,
      tarea: t,
      obligatorio: true,
      completado: false,
    }));
    await supabase.from('checklist_item').insert(nuevosItems);
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
    // Si falla por red, intentar recuperar el borrador local
    const local = obtenerBorradorLocal(idOrden);
    if (local && local.length > 0) {
      return local;
    }
    throw new Error('No fue posible cargar el checklist. Verifique su conexión.');
  }

  // Ordenar conforme al orden oficial de tareas
  const ordenItems = (data as ChecklistItem[]).sort((a, b) => {
    const idxA = TAREAS_PARTE_1.indexOf(a.tarea);
    const idxB = TAREAS_PARTE_1.indexOf(b.tarea);
    return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
  });

  guardarBorradorLocal(idOrden, ordenItems);
  return ordenItems;
}

/**
 * Marca o desmarca una tarea técnica del checklist.
 * El trigger de la base de datos fija fecha_marcado = now() o null de forma automática.
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
