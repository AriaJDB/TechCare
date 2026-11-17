/**
 * Modelos de dominio centrales de TechCare.
 */

export type TipoDispositivo = 'laptop' | 'desktop' | 'servidor' | string;

export interface Equipo {
  id?: string;
  id_equipo?: string;
  numero_serie: string;
  tipo_dispositivo?: TipoDispositivo;
  procesador?: string;
  ram?: string;
  almacenamiento?: string;
  codigo_qr: string;
  id_usuario_registro?: string;
  created_at?: string;
}

export interface UsuarioSesion {
  id?: string;
  email?: string;
  user_metadata?: {
    nombre?: string;
    apellidos?: string;
    nombreMostrar?: string;
    username?: string;
    rol?: 'tecnico' | 'administrador';
    especialidad?: string;
    telefono?: string;
  };
}

export interface SesionAuth {
  user: UsuarioSesion;
  access_token?: string;
}

export interface TechCareNativeBridge {
  saveLabelImage?: (base64Data: string, fileName: string) => boolean;
  requestNotificationPermission?: () => void;
  sendMaintenanceNotification?: (title: string, body: string, serial: string) => boolean;
}

