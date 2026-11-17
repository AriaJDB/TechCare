import { obtenerBorradorEvidencias, obtenerEvidenciasPorEquipoLocal, type EvidenciaItem } from '../services/evidenciasService';

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
  tecnico: string;
  tipo_intervencion?: 'preventiva' | 'correctiva';
  costo_estimado?: string;
  estado?: 'completado' | 'en_proceso' | 'pendiente';
  evidencias?: EvidenciaItem[];
}

const STORAGE_KEY = 'techcare_historial_mantenimientos';

// Registros semilla de ejemplo para que los equipos tengan historial demostrativo de inmediato
const SEED_HISTORIAL: Omit<MantenimientoRecord, 'id' | 'id_equipo' | 'numero_serie' | 'codigo_qr'>[] = [
  {
    fecha: '2026-09-18',
    subsistema: 'Refrigeración / Disipador térmico',
    diagnostico:
      'Mantenimiento preventivo semestral: limpieza interna de ventiladores, soplado de ductos térmicos y renovación de pasta térmica Arctic MX-4. Disminución de temperatura operativa en reposo de 58°C a 41°C.',
    tecnico: 'Ing. Cinthia López',
    tipo_intervencion: 'preventiva',
    estado: 'completado',
  },
  {
    fecha: '2026-06-10',
    subsistema: 'Almacenamiento (SSD / Disco)',
    diagnostico:
      'Diagnóstico de rendimiento: comprobación de salud SMART al 98%, sectores limpios, prueba de lectura/escritura secuencial en 3200 MB/s. Optimización de partición y desfragmentación de TRIM.',
    tecnico: 'Téc. Carlos Mendoza',
    tipo_intervencion: 'preventiva',
    estado: 'completado',
  },
  {
    fecha: '2026-03-05',
    subsistema: 'Fuente de poder y Batería',
    diagnostico:
      'Calibración de celdas de batería y verificación de voltaje estable de adaptador de corriente a 19.5V. Estado de degradación de batería en 89% de capacidad nominal.',
    tecnico: 'Téc. Marco Antonio Ruiz',
    tipo_intervencion: 'preventiva',
    estado: 'completado',
  },
  {
    fecha: '2025-11-20',
    subsistema: 'Sistema Operativo y Firmware BIOS',
    diagnostico:
      'Actualización preventiva de microcódigo UEFI BIOS v2.40, parches críticos de seguridad y depuración de controladores de red inalámbrica.',
    tecnico: 'Ing. Cinthia López',
    tipo_intervencion: 'preventiva',
    estado: 'completado',
  },
];

const memoryRecords: MantenimientoRecord[] = [];

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
 * "Se listan los mantenimientos en orden cronológico inverso con fecha, subsistema, diagnóstico, técnico y evidencias"
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
          tecnico: item.tecnico || item.nombre_tecnico || 'Técnico asignado',
          tipo_intervencion: item.tipo_intervencion || 'preventiva',
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
                tecnico: 'Técnico Especialista TechCare',
                tipo_intervencion: ord.tipo_intervencion || 'preventiva',
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
            tecnico: 'Técnico Responsable',
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
 * Registra un nuevo mantenimiento para un equipo.
 */
export async function agregarMantenimiento(
  nuevo: Omit<MantenimientoRecord, 'id'>
): Promise<MantenimientoRecord> {
  const evidencias =
    nuevo.evidencias && nuevo.evidencias.length > 0
      ? nuevo.evidencias
      : nuevo.id_orden
      ? obtenerBorradorEvidencias(nuevo.id_orden)
      : [];

  const record: MantenimientoRecord = {
    ...nuevo,
    id: `mant-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
          tecnico: record.tecnico,
          tipo_intervencion: record.tipo_intervencion || 'preventiva',
          estado: record.estado || 'completado',
        },
      ]);
    }
  } catch {
    // Silencioso si la tabla no está en el backend de pruebas
  }

  // Guardar en almacenamiento local
  const current = getLocalRecords();
  saveLocalRecords([record, ...current]);

  return record;
}
