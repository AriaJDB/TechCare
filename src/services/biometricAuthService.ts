/**
 * Servicio de Autenticación Biométrica Nativa (Android BiometricPrompt / iOS LocalAuthentication)
 * 
 * Invoca el diálogo nativo del sistema operativo (Samsung Knox / BiometricPrompt de Android)
 * a través de @capgo/capacitor-native-biometric para validar físicamente la huella dactilar
 * con el hardware del teléfono (el mismo diseño y seguridad de BBVA, Revolut, Santander, etc.).
 * 
 * Las credenciales se almacenan cifradas en el Keystore seguro de Android aisladas por cada correo.
 */
import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabaseClient';

const BIOMETRIC_USER_PREFIX = 'techcare_bio_user_';
const LAST_BIOMETRIC_EMAIL_KEY = 'techcare_last_biometric_email';

export interface BiometricConfig {
  userId: string;
  email: string;
  nombre?: string;
  enrolledAt: string;
}

/**
 * Comprueba si el hardware físico del teléfono admite biometría (sensor de huella dactilar).
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await NativeBiometric.isAvailable();
      return !!result.isAvailable;
    }

    // Web fallback para desarrollo en navegador
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Obtiene información detallada del hardware biométrico disponible.
 */
export async function getBiometricDetails(): Promise<{
  available: boolean;
  biometryType?: string;
  error?: string;
}> {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await NativeBiometric.isAvailable();
      return {
        available: !!result.isAvailable,
        biometryType: BiometryType[result.biometryType] || 'Huella dactilar',
      };
    }

    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      const avail = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return { available: avail, biometryType: 'WebAuthn' };
    }
    return { available: false };
  } catch (err: any) {
    return { available: false, error: err?.message };
  }
}

/**
 * Obtiene el último correo con huella dactilar vinculada en este teléfono.
 */
export function getLastBiometricEmail(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(LAST_BIOMETRIC_EMAIL_KEY);
  } catch {
    return null;
  }
}

/**
 * Comprueba si ya existe una huella dactilar registrada para un correo específico (o para el último registrado).
 */
export function isBiometricEnrolled(email?: string): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const targetEmail = (email || localStorage.getItem(LAST_BIOMETRIC_EMAIL_KEY) || '').toLowerCase().trim();
    if (!targetEmail) return false;
    return !!localStorage.getItem(BIOMETRIC_USER_PREFIX + targetEmail);
  } catch {
    return false;
  }
}

/**
 * Obtiene los datos del usuario vinculado a la huella dactilar.
 */
export function getEnrolledUser(email?: string): BiometricConfig | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const targetEmail = (email || localStorage.getItem(LAST_BIOMETRIC_EMAIL_KEY) || '').toLowerCase().trim();
    if (!targetEmail) return null;
    const raw = localStorage.getItem(BIOMETRIC_USER_PREFIX + targetEmail);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Registra y vincula la huella dactilar del usuario en el dispositivo físico.
 * Muestra el diálogo oficial de Samsung/Android para validar la huella real antes de vincularla.
 */
export async function enrollBiometric(
  user: { id: string; email: string; nombre?: string },
  passwordForQuickLogin?: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = user.email.toLowerCase().trim();

  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Mostrar diálogo nativo del sistema para confirmar la huella física
      await NativeBiometric.verifyIdentity({
        reason: 'Confirma tu huella digital en el sensor de tu teléfono para vincular tu cuenta',
        title: 'Vincular huella dactilar',
        subtitle: 'Coloca tu dedo en el sensor de tu Samsung',
        negativeButtonText: 'Cancelar',
      });

      // 2. Guardar credenciales de forma segura en Android Keystore asociadas al correo del usuario
      if (passwordForQuickLogin) {
        await NativeBiometric.setCredentials({
          server: `techcare_${normalizedEmail}`,
          username: normalizedEmail,
          password: passwordForQuickLogin,
        });
      }

      // 3. Registrar el perfil vinculado
      const config: BiometricConfig = {
        userId: user.id,
        email: normalizedEmail,
        nombre: user.nombre || normalizedEmail.split('@')[0],
        enrolledAt: new Date().toISOString(),
      };

      localStorage.setItem(BIOMETRIC_USER_PREFIX + normalizedEmail, JSON.stringify(config));
      localStorage.setItem(LAST_BIOMETRIC_EMAIL_KEY, normalizedEmail);

      return { success: true };
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('cancel') || msg.includes('Cancel') || err?.code === 16) {
        return { success: false, error: 'Vinculación de huella cancelada por el usuario.' };
      }
      return { success: false, error: err?.message || 'No se pudo confirmar la huella digital en el dispositivo.' };
    }
  }

  // Fallback para navegador web (desarrollo local)
  try {
    const config: BiometricConfig = {
      userId: user.id,
      email: normalizedEmail,
      nombre: user.nombre,
      enrolledAt: new Date().toISOString(),
    };
    localStorage.setItem(BIOMETRIC_USER_PREFIX + normalizedEmail, JSON.stringify(config));
    localStorage.setItem(LAST_BIOMETRIC_EMAIL_KEY, normalizedEmail);
    if (passwordForQuickLogin) {
      localStorage.setItem(`techcare_session_${normalizedEmail}`, btoa(passwordForQuickLogin));
    }
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo almacenar la credencial biométrica.' };
  }
}

/**
 * Inicia sesión utilizando la huella dactilar nativa del sistema.
 * 
 * Invoca el diálogo nativo de Samsung Knox / Android BiometricPrompt:
 * - Valida la huella contra el enclave de seguridad del teléfono.
 * - Rechaza huellas de otras personas que no coincidan.
 * - Aísla las credenciales por correo: si se cambia de correo, no permite entrar con otra cuenta.
 */
export async function loginWithBiometric(requestedEmail?: string): Promise<{
  success: boolean;
  email?: string;
  error?: string;
}> {
  const normalizedEmail = (requestedEmail || localStorage.getItem(LAST_BIOMETRIC_EMAIL_KEY) || '').toLowerCase().trim();

  if (!normalizedEmail) {
    return {
      success: false,
      error: 'No hay ninguna huella dactilar registrada en este dispositivo. Por favor ingresa tu correo.',
    };
  }

  // Verificar que este correo específico tenga huella vinculada en este teléfono
  const config = getEnrolledUser(normalizedEmail);
  if (!config) {
    return {
      success: false,
      error: `No hay ninguna huella dactilar registrada para "${normalizedEmail}" en este dispositivo. Ingresa con tu contraseña primero para activarla.`,
    };
  }

  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Desplegar el BiometricPrompt NATIVO del sistema operativo (Samsung / Android)
      // Este es el diálogo real de Samsung Knox (el mismo de BBVA, Revolut, etc.)
      await NativeBiometric.verifyIdentity({
        reason: 'Verifica tu huella digital para acceder a tu cuenta de TechCare',
        title: 'Iniciar sesión con huella',
        subtitle: 'Coloca tu huella digital en el sensor de tu teléfono',
        description: `Acceso para ${normalizedEmail}`,
        negativeButtonText: 'Cancelar',
      });

      // 2. Obtener la contraseña cifrada almacenada en el Keystore de Android para este correo
      let password = '';
      try {
        const creds = await NativeBiometric.getCredentials({
          server: `techcare_${normalizedEmail}`,
        });
        password = creds.password;
      } catch (credErr) {
        console.warn('No se encontraron credenciales en Keystore, verificando sesión activa:', credErr);
      }

      if (password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          return {
            success: false,
            error: 'La contraseña de tu cuenta cambió. Ingresa con contraseña para reactivar la huella.',
          };
        }

        if (data.session) {
          localStorage.setItem(LAST_BIOMETRIC_EMAIL_KEY, normalizedEmail);
          return { success: true, email: normalizedEmail };
        }
      }

      // Si Supabase ya tenía una sesión válida para este usuario
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.email?.toLowerCase() === normalizedEmail) {
        localStorage.setItem(LAST_BIOMETRIC_EMAIL_KEY, normalizedEmail);
        return { success: true, email: normalizedEmail };
      }

      return {
        success: false,
        error: 'Sesión expirada. Por favor ingresa tu contraseña una vez para reactivar la huella.',
      };
    } catch (err: any) {
      const msg = err?.message || '';
      // Si el usuario presionó Cancelar en el diálogo nativo de Samsung
      if (msg.includes('cancel') || msg.includes('Cancel') || err?.code === 16) {
        return { success: false, error: 'Autenticación biométrica cancelada.' };
      }
      // Si la huella no coincide (otra persona o dedo no registrado)
      if (err?.code === 10 || msg.includes('failed') || msg.includes('No coincide') || msg.includes('not recognized')) {
        return { success: false, error: 'Huella digital no reconocida por el dispositivo.' };
      }
      return { success: false, error: err?.message || 'Error al validar la huella en el teléfono.' };
    }
  }

  // Web fallback (navegador)
  try {
    const rawPass = localStorage.getItem(`techcare_session_${normalizedEmail}`);
    if (rawPass) {
      const password = atob(rawPass);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return { success: false, error: 'Contraseña incorrecta o sesión expirada.' };
      }

      if (data.session) {
        return { success: true, email: normalizedEmail };
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.email?.toLowerCase() === normalizedEmail) {
      return { success: true, email: normalizedEmail };
    }

    return {
      success: false,
      error: 'Sesión expirada. Ingresa tu contraseña para reactivar.',
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error en autenticación.' };
  }
}

/**
 * Desvincula la huella dactilar de un correo en este dispositivo.
 */
export async function disableBiometric(email?: string): Promise<void> {
  try {
    const targetEmail = (email || localStorage.getItem(LAST_BIOMETRIC_EMAIL_KEY) || '').toLowerCase().trim();
    if (!targetEmail) return;

    if (Capacitor.isNativePlatform()) {
      try {
        await NativeBiometric.deleteCredentials({
          server: `techcare_${targetEmail}`,
        });
      } catch {
        // Ignorar si no existía en Keystore
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(BIOMETRIC_USER_PREFIX + targetEmail);
      localStorage.removeItem(`techcare_session_${targetEmail}`);
      if (localStorage.getItem(LAST_BIOMETRIC_EMAIL_KEY) === targetEmail) {
        localStorage.removeItem(LAST_BIOMETRIC_EMAIL_KEY);
      }
    }
  } catch {
    // Ignorar errores al limpiar
  }
}
