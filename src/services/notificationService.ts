import type { EstadoSemaforo } from '../utils/mantenimiento';

export interface NotificacionVencimientoPayload {
  id?: string;
  idEquipo: string;
  numeroSerie: string;
  tipoDispositivo: string;
  ultimoIngeniero: string;
  proximaFecha: string;
  estadoSemaforo: EstadoSemaforo;
  titulo?: string;
  mensaje?: string;
  creadaEn?: string;
  enviadaSistema?: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = 'techcare_notificaciones_vencimiento';
const memoryNotifications: NotificacionVencimientoPayload[] = [];

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

/**
 * Inicializa el Service Worker y solicita permisos de notificación del sistema operativo
 * para poder mostrar alertas en la barra de estado y pantalla de bloqueo del teléfono.
 */
export async function inicializarPermisosNotificacion(): Promise<NotificationPermission | 'unsupported'> {
  try {
    // 1. Si existe puente nativo Android de TechCare, solicitar permiso POST_NOTIFICATIONS
    if (typeof window !== 'undefined' && (window as any).TechCareNative?.requestNotificationPermission) {
      try {
        (window as any).TechCareNative.requestNotificationPermission();
      } catch {
        // Ignorar
      }
    }

    // 2. Registrar Service Worker para notificaciones nativas en segundo plano / pantalla de bloqueo
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch {
        // En entorno de pruebas o sin HTTPS, continuar con Notification API directa
      }
    }

    // 3. Solicitar permiso en la API estándar de Notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        return await Notification.requestPermission();
      }
      return Notification.permission;
    }
  } catch {
    // Continuar
  }
  return 'unsupported';
}

/**
 * Reproduce un tono corto de alerta de sistema usando Web Audio API (si está disponible)
 * y activa la vibración háptica del teléfono.
 */
function reproducirAlertaSonoraYVibracion(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([250, 120, 250, 120, 400]);
    }
  } catch {
    // Ignorar si el navegador no soporta vibración
  }

  try {
    if (typeof window !== 'undefined') {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1174.66, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    }
  } catch {
    // Ignorar si el contexto de audio requiere interacción previa
  }
}



/**
 * HU8 & TC09 — Dispara una notificación push / local al teléfono (visible en pantalla de bloqueo)
 * dirigida al último ingeniero que realizó el mantenimiento del equipo cuando el semáforo está en ROJO.
 */
export async function dispararNotificacionVencimiento(
  payload: NotificacionVencimientoPayload
): Promise<NotificacionVencimientoPayload> {
  const ingeniero = (payload.ultimoIngeniero || 'Ing. Cinthia López').trim();
  const tipo = (payload.tipoDispositivo || 'Equipo').toUpperCase();
  const serie = payload.numeroSerie || 'SN-0000';

  const titulo =
    payload.titulo ||
    `Mantenimiento Urgente: ${tipo} (${serie})`;

  const mensaje =
    payload.mensaje ||
    `Atención ${ingeniero}: El equipo ${tipo} con serie ${serie} tiene su semáforo en ROJO (vencimiento: ${payload.proximaFecha}). Se requiere realizar el mantenimiento o revisión técnica correspondiente.`;

  let enviadaSistema = false;

  // 1. Puente nativo Android (APK con NotificationChannel IMPORTANCE_HIGH y VISIBILITY_PUBLIC en pantalla de bloqueo)
  try {
    if (typeof window !== 'undefined' && (window as any).TechCareNative?.sendMaintenanceNotification) {
      const ok = (window as any).TechCareNative.sendMaintenanceNotification(titulo, mensaje, serie);
      if (ok) {
        enviadaSistema = true;
      }
    }
  } catch {
    // Continuar con Web Notification / Service Worker
  }

  // 2. Notificación del Sistema vía Service Worker (aparece en barra de estado y pantalla de bloqueo en Android/Chrome)
  if (!enviadaSistema && typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted') {
        const notifOptions: any = {
          body: mensaje,
          icon: '/icono_techcar.jpg',
          badge: '/icono_techcar.jpg',
          tag: `techcare-rojo-${serie}-${Date.now()}`,
          renotify: true,
          requireInteraction: true,
          vibrate: [250, 120, 250, 120, 400],
          data: {
            idEquipo: payload.idEquipo,
            numeroSerie: serie,
            ultimoIngeniero: ingeniero,
          },
        };

        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && typeof reg.showNotification === 'function') {
            await reg.showNotification(titulo, notifOptions);
            enviadaSistema = true;
          }
        }

        if (!enviadaSistema) {
          new Notification(titulo, notifOptions);
          enviadaSistema = true;
        }
      }
    } catch {
      // Fallback visual
    }
  }

  const registro: NotificacionVencimientoPayload = {
    ...payload,
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ultimoIngeniero: ingeniero,
    titulo,
    mensaje,
    creadaEn: new Date().toISOString(),
    enviadaSistema,
  };

  // Guardar en bitácora de notificaciones
  memoryNotifications.unshift(registro);
  if (hasLocalStorage()) {
    try {
      const prevRaw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      const prevList = prevRaw ? JSON.parse(prevRaw) : [];
      const updated = [registro, ...prevList].slice(0, 50);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignorar
    }
  }

  // Alerta sonora y vibración háptica
  reproducirAlertaSonoraYVibracion();
  // Se omite el banner interno redundante para que solo se muestre la notificación en la pantalla de bloqueo y barra de estado

  return registro;
}

/**
 * Obtiene el historial de notificaciones de vencimiento disparadas.
 */
export function obtenerNotificacionesDisparadas(): NotificacionVencimientoPayload[] {
  if (!hasLocalStorage()) {
    return [...memoryNotifications];
  }
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [...memoryNotifications];
    return JSON.parse(raw);
  } catch {
    return [...memoryNotifications];
  }
}

export function limpiarNotificacionesDisparadas(): void {
  memoryNotifications.length = 0;
  if (hasLocalStorage()) {
    try {
      localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    } catch {
      // Ignorar
    }
  }
}

