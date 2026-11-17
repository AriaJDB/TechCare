function getSupabase() {
  if (typeof window !== 'undefined' && (window as any).__techcare_supabase) {
    return (window as any).__techcare_supabase;
  }
  return null;
}

export type RolUsuario = 'tecnico' | 'administrador';

export interface PerfilIngeniero {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  nombreMostrar: string; // Nombre de usuario / firma técnica, ej: "Ing. Gabriel Flores"
  rol: RolUsuario;
  especialidad: string;
  telefono?: string;
  actualizadoEn: string;
}

const PROFILE_STORAGE_PREFIX = 'techcare_perfil_usuario_';
const ACTIVE_PROFILE_KEY = 'techcare_perfil_activo';
const ENGINEERS_ROSTER_KEY = 'techcare_directorio_ingenieros';

export const INGENIEROS_PREDETERMINADOS: PerfilIngeniero[] = [
  {
    id: 'ing-gabriel',
    email: 'gbfloresarguello@gmail.com',
    nombre: 'Gabriel',
    apellidos: 'Flores Argüello',
    nombreMostrar: 'Ing. Gabriel Flores',
    rol: 'administrador',
    especialidad: 'Arquitectura, Almacenamiento y Diagnóstico S.M.A.R.T.',
    actualizadoEn: '2026-11-01T10:00:00Z',
  },
  {
    id: 'ing-cinthia',
    email: 'cinthia.lopez@techcare.mx',
    nombre: 'Cinthia Jimena',
    apellidos: 'López Álvarez',
    nombreMostrar: 'Ing. Cinthia López',
    rol: 'tecnico',
    especialidad: 'Refrigeración, Disipación Térmica y Mantenimiento Preventivo',
    actualizadoEn: '2026-11-01T10:00:00Z',
  },
  {
    id: 'ing-ariadna',
    email: 'ariadna.juarez@techcare.mx',
    nombre: 'Ariadna Sarahi',
    apellidos: 'Juárez Argüello',
    nombreMostrar: 'Ing. Ariadna Juárez',
    rol: 'administrador',
    especialidad: 'Gestión de Activos, Calidad y Auditoría de Servicio',
    actualizadoEn: '2026-11-01T10:00:00Z',
  },
  {
    id: 'ing-edgar',
    email: 'edgar.alegria@techcare.mx',
    nombre: 'Edgar Maximiliano',
    apellidos: 'Alegría Alcántara',
    nombreMostrar: 'Ing. Edgar Alegría',
    rol: 'tecnico',
    especialidad: 'Electrónica de Placa Base, Puertos y Fuente de Poder',
    actualizadoEn: '2026-11-01T10:00:00Z',
  },
];

let memoryProfile: PerfilIngeniero | null = null;
let memoryRoster: PerfilIngeniero[] = [...INGENIEROS_PREDETERMINADOS];

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

/**
 * Obtiene el directorio completo de ingenieros registrados para asignación en órdenes y mantenimientos.
 */
export function obtenerDirectorioIngenieros(): PerfilIngeniero[] {
  if (!hasLocalStorage()) {
    return memoryRoster;
  }
  try {
    const raw = localStorage.getItem(ENGINEERS_ROSTER_KEY);
    if (!raw) {
      localStorage.setItem(ENGINEERS_ROSTER_KEY, JSON.stringify(INGENIEROS_PREDETERMINADOS));
      return [...INGENIEROS_PREDETERMINADOS];
    }
    const parsed = JSON.parse(raw) as PerfilIngeniero[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INGENIEROS_PREDETERMINADOS];
  } catch {
    return [...INGENIEROS_PREDETERMINADOS];
  }
}

/**
 * Sincroniza un perfil dentro del directorio de ingenieros disponibles.
 */
export function sincronizarIngenieroEnDirectorio(perfil: PerfilIngeniero): PerfilIngeniero[] {
  const actual = obtenerDirectorioIngenieros();
  const emailLower = (perfil.email || '').toLowerCase().trim();
  const idx = actual.findIndex(
    (ing) =>
      (emailLower && ing.email.toLowerCase().trim() === emailLower) ||
      ing.id === perfil.id
  );

  let nuevaLista: PerfilIngeniero[];
  if (idx >= 0) {
    nuevaLista = [...actual];
    nuevaLista[idx] = { ...actual[idx], ...perfil };
  } else {
    nuevaLista = [perfil, ...actual];
  }

  memoryRoster = nuevaLista;
  if (hasLocalStorage()) {
    try {
      localStorage.setItem(ENGINEERS_ROSTER_KEY, JSON.stringify(nuevaLista));
    } catch {
      // Ignorar errores de cuota
    }
  }
  return nuevaLista;
}

/**
 * Construye o recupera el perfil del usuario autenticado.
 */
export function obtenerPerfilUsuario(session?: any): PerfilIngeniero {
  const user = session?.user;
  const email = (user?.email || '').toLowerCase().trim();

  // 1. Buscar perfil guardado específicamente para este correo
  if (email && hasLocalStorage()) {
    try {
      const savedRaw = localStorage.getItem(`${PROFILE_STORAGE_PREFIX}${email}`);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw) as PerfilIngeniero;
        if (saved && saved.nombreMostrar) {
          return saved;
        }
      }
    } catch {
      // Continuar
    }
  }

  // 2. Buscar perfil activo general si no se pasó sesión
  if (!email && hasLocalStorage()) {
    try {
      const activeRaw = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (activeRaw) {
        return JSON.parse(activeRaw) as PerfilIngeniero;
      }
    } catch {
      // Continuar
    }
  }

  if (!email && memoryProfile) {
    return memoryProfile;
  }

  // 3. Verificar si coincide con alguno de los ingenieros predeterminados
  const predefinido = obtenerDirectorioIngenieros().find(
    (ing) => ing.email.toLowerCase().trim() === email
  );
  if (predefinido) {
    const metaNombre = user?.user_metadata?.nombreMostrar || user?.user_metadata?.username;
    const merged: PerfilIngeniero = {
      ...predefinido,
      id: user?.id || predefinido.id,
      nombre: user?.user_metadata?.nombre || predefinido.nombre,
      apellidos: user?.user_metadata?.apellidos || predefinido.apellidos,
      nombreMostrar: metaNombre || predefinido.nombreMostrar,
      rol: (user?.user_metadata?.rol as RolUsuario) || predefinido.rol,
      especialidad: user?.user_metadata?.especialidad || predefinido.especialidad,
    };
    return merged;
  }

  // 4. Construir perfil a partir de metadata de Supabase Auth o el correo
  const meta = user?.user_metadata || {};
  const nombre = meta.nombre || (email ? email.split('@')[0] : 'Ingeniero');
  const apellidos = meta.apellidos || '';
  const nombreCompleto = `${nombre} ${apellidos}`.trim();
  const nombreMostrar =
    meta.nombreMostrar ||
    meta.username ||
    (nombreCompleto.toLowerCase().startsWith('ing.') || nombreCompleto.toLowerCase().startsWith('téc.')
      ? nombreCompleto
      : `Ing. ${nombreCompleto}`);

  return {
    id: user?.id || `usr-${Date.now()}`,
    email: email || 'ingeniero@techcare.mx',
    nombre,
    apellidos,
    nombreMostrar,
    rol: (meta.rol as RolUsuario) || 'tecnico',
    especialidad: meta.especialidad || 'Soporte Técnico y Mantenimiento Preventivo',
    telefono: meta.telefono || '',
    actualizadoEn: new Date().toISOString(),
  };
}

/**
 * Actualiza el perfil del usuario (nombre de usuario/ingeniero, nombre, apellidos, rol y especialidad)
 * tanto en almacenamiento local como en Supabase Auth y en el directorio de ingenieros.
 */
export async function actualizarPerfilUsuario(
  datos: Partial<PerfilIngeniero> & { email?: string; id?: string }
): Promise<PerfilIngeniero> {
  const actual = obtenerPerfilUsuario(
    datos.email ? { user: { id: datos.id, email: datos.email } } : undefined
  );

  const nombre = (datos.nombre !== undefined ? datos.nombre : actual.nombre).trim();
  const apellidos = (datos.apellidos !== undefined ? datos.apellidos : actual.apellidos).trim();
  let nombreMostrar = (datos.nombreMostrar !== undefined ? datos.nombreMostrar : actual.nombreMostrar).trim();

  if (!nombreMostrar) {
    const base = `${nombre} ${apellidos}`.trim() || 'Ingeniero TechCare';
    nombreMostrar = base.startsWith('Ing.') || base.startsWith('Téc.') ? base : `Ing. ${base}`;
  }

  const perfilActualizado: PerfilIngeniero = {
    ...actual,
    ...datos,
    nombre: nombre || actual.nombre,
    apellidos,
    nombreMostrar,
    rol: datos.rol || actual.rol || 'tecnico',
    especialidad: datos.especialidad !== undefined ? datos.especialidad : actual.especialidad,
    actualizadoEn: new Date().toISOString(),
  };

  memoryProfile = perfilActualizado;

  if (hasLocalStorage()) {
    try {
      const emailKey = perfilActualizado.email.toLowerCase().trim();
      if (emailKey) {
        localStorage.setItem(`${PROFILE_STORAGE_PREFIX}${emailKey}`, JSON.stringify(perfilActualizado));
      }
      localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(perfilActualizado));
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  // Sincronizar con el directorio de ingenieros para que aparezca en los selectores de asignación
  sincronizarIngenieroEnDirectorio(perfilActualizado);

  // Intentar sincronizar con Supabase Auth y tabla usuario
  try {
    const sb = getSupabase();
    if (sb) {
      if (sb.auth && typeof sb.auth.updateUser === 'function') {
        await sb.auth.updateUser({
          data: {
            nombre: perfilActualizado.nombre,
            apellidos: perfilActualizado.apellidos,
            nombreMostrar: perfilActualizado.nombreMostrar,
            username: perfilActualizado.nombreMostrar,
            rol: perfilActualizado.rol,
            especialidad: perfilActualizado.especialidad,
          },
        });
      }
      if (typeof sb.from === 'function' && perfilActualizado.id) {
        await sb.from('usuario').upsert([
          {
            id_usuario: perfilActualizado.id,
            nombre: perfilActualizado.nombreMostrar,
            correo: perfilActualizado.email,
            rol: perfilActualizado.rol,
          },
        ]);
      }
    }
  } catch {
    // Continúa usando almacenamiento local si no hay red o la tabla no existe
  }

  return perfilActualizado;
}

