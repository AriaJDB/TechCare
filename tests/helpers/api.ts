// Utilidades para probar el API REST de TechCare (Supabase: Auth + PostgREST).

const url = process.env.SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';

export const credenciales = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? '',
    password: process.env.TEST_ADMIN_PASSWORD ?? '',
  },
  tecnico: {
    email: process.env.TEST_TECNICO_EMAIL ?? '',
    password: process.env.TEST_TECNICO_PASSWORD ?? '',
  },
};

/** Las pruebas de API se omiten si faltan las variables de entorno. */
export const hasApiEnv = [
  url,
  anonKey,
  credenciales.admin.email,
  credenciales.admin.password,
  credenciales.tecnico.email,
  credenciales.tecnico.password,
].every((valor) => valor.length > 0);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

async function leerCuerpo(res: Response) {
  const texto = await res.text();
  try {
    return texto ? JSON.parse(texto) : null;
  } catch {
    return texto;
  }
}

export async function login(
  email: string,
  password: string,
): Promise<ApiResponse> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return { status: res.status, body: await leerCuerpo(res) };
}

export async function rest(
  ruta: string,
  token: string,
  init: RequestInit = {},
): Promise<ApiResponse> {
  const res = await fetch(`${url}/rest/v1/${ruta}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers as Record<string, string>),
    },
  });
  return { status: res.status, body: await leerCuerpo(res) };
}

export async function sesion(rol: 'admin' | 'tecnico') {
  const { email, password } = credenciales[rol];
  const r = await login(email, password);
  if (r.status !== 200) {
    throw new Error(`No se pudo iniciar sesión como ${rol}: HTTP ${r.status}`);
  }
  return {
    token: r.body.access_token as string,
    userId: r.body.user.id as string,
  };
}

export const unico = (prefijo: string) =>
  `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

/** Cuerpo válido para POST /equipo (según el diccionario de datos). */
export function nuevoEquipo(idUsuario: string, serie = unico('SN-TEST')) {
  return {
    id_usuario_registro: idUsuario,
    numero_serie: serie,
    tipo_dispositivo: 'laptop',
    procesador: 'Intel i5',
    ram: '8GB',
    almacenamiento: '512GB SSD',
    codigo_qr: `QR-${serie}`,
  };
}
