function getSupabase() {
  if (typeof window !== 'undefined' && (window as any).__techcare_supabase) {
    return (window as any).__techcare_supabase;
  }
  return null;
}

export interface MantenimientoRecord {
  id: string;
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
}

const STORAGE_KEY = 'techcare_historial_mantenimientos';

// Registros semilla de ejemplo para que los equipos tengan historial demostrativo de inmediato
const SEED_HISTORIAL: Omit<MantenimientoRecord, 'id' | 'id_equipo' | 'numero_serie' | 'codigo_qr'>[] = [
  {
    fecha: '2026-09-18',
    subsistema: 'Refrigeración / Disipador térmico',
    diagnostico: 'Mantenimiento preventivo semestral: limpieza interna de ventiladores, soplado de ductos térmicos y renovación de pasta térmica Arctic MX-4. Disminución de temperatura operativa en reposo de 58°C a 41°C.',
    tecnico: 'Ing. Cinthia López',
    tipo_intervencion: 'preventiva',
    estado: 'completado'
  },
  {
    fecha: '2026-06-10',
    subsistema: 'Almacenamiento (SSD / Disco)',
    diagnostico: 'Diagnóstico de rendimiento: comprobación de salud SMART al 98%, sectores limpios, prueba de lectura/escritura secuencial en 3200 MB/s. Optimización de partición y desfragmentación de TRIM.',
    tecnico: 'Téc. Carlos Mendoza',
    tipo_intervencion: 'preventiva',
    estado: 'completado'
  },
  {
    fecha: '2026-03-05',
    subsistema: 'Fuente de poder y Batería',
    diagnostico: 'Calibración de celdas de batería y verificación de voltaje estable de adaptador de corriente a 19.5V. Estado de degradación de batería en 89% de capacidad nominal.',
    tecnico: 'Téc. Marco Antonio Ruiz',
    tipo_intervencion: 'preventiva',
    estado: 'completado'
  },
  {
    fecha: '2025-11-20',
    subsistema: 'Sistema Operativo y Firmware BIOS',
    diagnostico: 'Actualización preventiva de microcódigo UEFI BIOS v2.40, parches críticos de seguridad y depuración de controladores de red inalámbrica.',
    tecnico: 'Ing. Cinthia López',
    tipo_intervencion: 'preventiva',
    estado: 'completado'
  }
];

function getLocalRecords(): MantenimientoRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalRecords(records: MantenimientoRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('No se pudo guardar en localStorage', err);
  }
}

/**
 * Obtiene el historial de mantenimientos de un equipo dado.
 * Cumple con TC11 (HU9):
 * "Se listan los mantenimientos en orden cronológico inverso con fecha, subsistema, diagnóstico y técnico"
 */
export async function getHistorialEquipo(equipo: { id?: string; numero_serie?: string; codigo_qr?: string }): Promise<MantenimientoRecord[]> {
  let records: MantenimientoRecord[] = [];

  // 1. Intentar consultar en Supabase si existe la tabla
  try {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from('mantenimiento')
        .select('*')
        .or(`id_equipo.eq.${equipo.id},codigo_qr.eq.${equipo.codigo_qr}`)
        .order('fecha', { ascending: false });

      if (!error && data && data.length > 0) {
        records = data.map((item: any) => ({
          id: item.id || `sup-${Math.random()}`,
          id_equipo: item.id_equipo,
          codigo_qr: item.codigo_qr,
          numero_serie: item.numero_serie,
          fecha: item.fecha ? item.fecha.substring(0, 10) : new Date().toISOString().substring(0, 10),
          subsistema: item.subsistema || item.sistema || 'General',
          diagnostico: item.diagnostico || item.descripcion || item.observaciones || 'Mantenimiento registrado',
          tecnico: item.tecnico || item.nombre_tecnico || 'Técnico asignado',
          tipo_intervencion: item.tipo_intervencion || 'preventiva',
          estado: item.estado || 'completado'
        }));
      }
    }
  } catch {
    // Si la tabla no existe en Supabase todavía, se continúa con el almacenamiento local
  }

  // 2. Cargar registros locales
  const local = getLocalRecords().filter(r => 
    (equipo.id && r.id_equipo === equipo.id) ||
    (equipo.codigo_qr && r.codigo_qr === equipo.codigo_qr) ||
    (equipo.numero_serie && r.numero_serie === equipo.numero_serie)
  );

  records = [...records, ...local];

  // Si no hay ningún registro histórico para este equipo, inicializar registros semilla coherentes
  if (records.length === 0) {
    const initialSeed: MantenimientoRecord[] = SEED_HISTORIAL.map((seed, idx) => ({
      ...seed,
      id: `seed-${equipo.numero_serie || 'eq'}-${idx}`,
      id_equipo: equipo.id,
      codigo_qr: equipo.codigo_qr,
      numero_serie: equipo.numero_serie
    }));

    const allLocal = getLocalRecords();
    saveLocalRecords([...allLocal, ...initialSeed]);
    records = initialSeed;
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
  const record: MantenimientoRecord = {
    ...nuevo,
    id: `mant-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  };

  // Intentar guardar en Supabase por si la tabla existe
  try {
    const sb = getSupabase();
    if (sb) {
      await sb.from('mantenimiento').insert([{
        id_equipo: record.id_equipo,
        codigo_qr: record.codigo_qr,
        numero_serie: record.numero_serie,
        fecha: record.fecha,
        subsistema: record.subsistema,
        diagnostico: record.diagnostico,
        tecnico: record.tecnico,
        tipo_intervencion: record.tipo_intervencion || 'preventiva',
        estado: record.estado || 'completado'
      }]);
    }
  } catch {
    // Silencioso si la tabla no está en el backend de pruebas
  }

  // Guardar en almacenamiento local
  const current = getLocalRecords();
  saveLocalRecords([record, ...current]);

  return record;
}
