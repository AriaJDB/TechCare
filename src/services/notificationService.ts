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
 * Muestra un banner visual de notificación estilo sistema móvil (Heads-Up / Lock Screen Preview)
 * en la parte superior de la pantalla para confirmar visualmente la recepción de la alerta.
 */
function mostrarBannerNotificacionMovil(notificacion: NotificacionVencimientoPayload): void {
  if (typeof document === 'undefined' || !document.body) return;

  try {
    const prev = document.getElementById('techcare-lockscreen-notification-banner');
    if (prev) prev.remove();

    const banner = document.createElement('div');
    banner.id = 'techcare-lockscreen-notification-banner';
    Object.assign(banner.style, {
      position: 'fixed',
      top: '14px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 24px)',
      maxWidth: '410px',
      background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.96) 100%)',
      color: '#ffffff',
      borderRadius: '24px',
      padding: '14px 16px',
      zIndex: '30000',
      boxShadow: '0 20px 45px rgba(15, 23, 42, 0.55), 0 0 0 1.5px rgba(248, 113, 113, 0.55)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      cursor: 'pointer',
      transition: 'all 0.25s ease',
    });

    const topMeta = document.createElement('div');
    Object.assign(topMeta.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '11px',
      color: '#cbd5e1',
      fontWeight: '700',
    });

    const appBrand = document.createElement('div');
    Object.assign(appBrand.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    });

    const dot = document.createElement('span');
    Object.assign(dot.style, {
      width: '9px',
      height: '9px',
      borderRadius: '50%',
      backgroundColor: '#ef4444',
      boxShadow: '0 0 8px #ef4444',
      display: 'inline-block',
    });

    const brandText = document.createElement('span');
    brandText.textContent = 'TECHCARE · ALERTA DE SISTEMA';
    Object.assign(brandText.style, {
      letterSpacing: '0.5px',
      color: '#fca5a5',
      fontWeight: '800',
    });

    appBrand.appendChild(dot);
    appBrand.appendChild(brandText);

    const timeTag = document.createElement('span');
    timeTag.textContent = 'ahora · Pantalla de bloqueo';
    Object.assign(timeTag.style, {
      fontSize: '10.5px',
      color: '#94a3b8',
    });

    topMeta.appendChild(appBrand);
    topMeta.appendChild(timeTag);

    const titleEl = document.createElement('div');
    titleEl.textContent = notificacion.titulo || '';
    Object.assign(titleEl.style, {
      fontSize: '13.5px',
      fontWeight: '800',
      color: '#ffffff',
      lineHeight: '1.3',
    });

    const bodyEl = document.createElement('div');
    bodyEl.textContent = notificacion.mensaje || '';
    Object.assign(bodyEl.style, {
      fontSize: '12px',
      color: '#e2e8f0',
      lineHeight: '1.4',
      fontWeight: '500',
    });

    const footerRow = document.createElement('div');
    Object.assign(footerRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '4px',
      paddingTop: '6px',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      fontSize: '11px',
    });

    const engBadge = document.createElement('span');
    engBadge.textContent = `👷 Asignado a: ${notificacion.ultimoIngeniero}`;
    Object.assign(engBadge.style, {
      color: '#93c5fd',
      fontWeight: '700',
    });

    const closeHint = document.createElement('span');
    closeHint.textContent = 'Toca para descartar ✕';
    Object.assign(closeHint.style, {
      color: '#94a3b8',
      fontWeight: '600',
    });

    footerRow.appendChild(engBadge);
    footerRow.appendChild(closeHint);

    banner.appendChild(topMeta);
    banner.appendChild(titleEl);
    banner.appendChild(bodyEl);
    banner.appendChild(footerRow);

    banner.onclick = () => banner.remove();
    document.body.appendChild(banner);

    setTimeout(() => {
      if (banner.parentNode) {
        banner.remove();
      }
    }, 8500);
  } catch {
    // Ignorar errores de DOM en entornos sin navegador
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
    `🚨 Mantenimiento Urgente · ${tipo} (${serie})`;

  const mensaje =
    payload.mensaje ||
    `Atención ${ingeniero}: El equipo ${tipo} con serie ${serie} tiene su semáforo en ROJO (vencimiento: ${payload.proximaFecha}). Se requiere realizar el mantenimiento o reparación correspondiente.`;

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

  // Reproducir alerta y mostrar banner estilo sistema móvil
  reproducirAlertaSonoraYVibracion();
  mostrarBannerNotificacionMovil(registro);

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

