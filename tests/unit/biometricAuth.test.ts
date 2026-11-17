import {
  isBiometricAvailable,
  isBiometricEnrolled,
  getEnrolledUser,
  enrollBiometric,
  loginWithBiometric,
  disableBiometric,
} from '../../src/services/biometricAuthService';

// Mock simple de Supabase
jest.mock('../../src/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'fake-token' }, user: { id: 'u1', email: 'tecnico@techcare.mx' } },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'fake-token' } },
        error: null,
      }),
    },
  },
}));

describe('Autenticación Biométrica (Huella Dactilar)', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('isBiometricAvailable', () => {
    it('retorna false si window.PublicKeyCredential no está disponible', async () => {
      const res = await isBiometricAvailable();
      expect(res).toBe(false);
    });

    it('retorna true si window.PublicKeyCredential responde afirmativamente', async () => {
      Object.defineProperty(global, 'window', {
        value: {
          PublicKeyCredential: {
            isUserVerifyingPlatformAuthenticatorAvailable: jest.fn().mockResolvedValue(true),
          },
          location: { hostname: 'localhost' },
        },
        writable: true,
      });

      const res = await isBiometricAvailable();
      expect(res).toBe(true);
    });
  });

  describe('enrollBiometric y getEnrolledUser', () => {
    it('registra correctamente la credencial biométrica del técnico', async () => {
      const usuario = {
        id: 'user-uuid-1234',
        email: 'tecnico@techcare.mx',
        nombre: 'Cinthia López',
      };

      const resultado = await enrollBiometric(usuario, 'ContraseñaSegura123!');
      expect(resultado.success).toBe(true);
      expect(isBiometricEnrolled()).toBe(true);

      const enrolled = getEnrolledUser();
      expect(enrolled).not.toBeNull();
      expect(enrolled?.email).toBe('tecnico@techcare.mx');
      expect(enrolled?.userId).toBe('user-uuid-1234');
    });
  });

  describe('loginWithBiometric', () => {
    it('retorna error si no hay huella dactilar enrolada', async () => {
      const resultado = await loginWithBiometric();
      expect(resultado.success).toBe(false);
      expect(resultado.error).toContain('No hay ninguna huella dactilar');
    });

    it('inicia sesión rápidamente con huella cuando está enrolada', async () => {
      const usuario = {
        id: 'user-uuid-1234',
        email: 'tecnico@techcare.mx',
        nombre: 'Cinthia López',
      };

      await enrollBiometric(usuario, 'ContraseñaSegura123!');
      const loginRes = await loginWithBiometric();

      expect(loginRes.success).toBe(true);
      expect(loginRes.email).toBe('tecnico@techcare.mx');
    });
  });

  describe('disableBiometric', () => {
    it('elimina la huella dactilar registrada al desvincular el dispositivo', async () => {
      const usuario = {
        id: 'user-uuid-1234',
        email: 'tecnico@techcare.mx',
      };

      await enrollBiometric(usuario, 'pass');
      expect(isBiometricEnrolled()).toBe(true);

      disableBiometric();
      expect(isBiometricEnrolled()).toBe(false);
      expect(getEnrolledUser()).toBeNull();
    });
  });
});
