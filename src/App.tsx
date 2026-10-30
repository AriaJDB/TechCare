import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import EquiposCatalog from './components/Equipos/EquiposCatalog';
import {
  isBiometricEnrolled,
  getEnrolledUser,
  enrollBiometric,
  loginWithBiometric,
} from './services/biometricAuthService';

const EyeIcon = ({ visible, size = 18, color = '#94a3b8' }: { visible: boolean; size?: number; color?: string }) => {
  if (visible) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'block' }}
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
};

export default function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [session, setSession] = useState<any>(null);
  const [biometricUser, setBiometricUser] = useState<any>(null);
  const [autoEnrollBiometric, setAutoEnrollBiometric] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleNativeBiometricLogin = async (targetEmailParam?: string) => {
    setErrorMessage('');
    setSuccessMessage('');
    const targetEmail = (targetEmailParam || email.trim() || biometricUser?.email || '').toLowerCase().trim();
    if (!targetEmail) {
      setErrorMessage('Por favor ingresa tu correo para iniciar sesión con huella.');
      return;
    }

    if (!isBiometricEnrolled(targetEmail)) {
      setErrorMessage(`El correo "${targetEmail}" no tiene huella vinculada en este teléfono. Ingresa con contraseña primero.`);
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithBiometric(targetEmail);
      if (res.success) {
        setSuccessMessage('✓ Identidad verificada con éxito');
      } else {
        if (res.error && !res.error.toLowerCase().includes('cancelad')) {
          setErrorMessage(res.error);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error en el sensor biométrico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Cargar usuario biométrico enrolado
    if (isBiometricEnrolled()) {
      const u = getEnrolledUser();
      setBiometricUser(u);
      if (u?.email) {
        setEmail(u.email);
        // Desplegar el diálogo nativo oficial de Samsung/Android como BBVA
        const timer = setTimeout(() => {
          handleNativeBiometricLogin(u.email);
        }, 550);
        return () => {
          clearTimeout(timer);
          subscription.unsubscribe();
        };
      }
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!isLogin && password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message?.toLowerCase().includes('fetch') || error.status === 0) {
          setErrorMessage('Error de conexión con el servidor. Revisa tu conexión a internet.');
        } else if (error.message === 'Invalid login credentials') {
          setErrorMessage('Credenciales inválidas. Verifica tu correo y contraseña.');
        } else {
          setErrorMessage(error.message || 'Error al iniciar sesión.');
        }
      } else if (data?.user && autoEnrollBiometric) {
        // Enrolar huella automáticamente para inicios subsecuentes
        await enrollBiometric(
          {
            id: data.user.id,
            email: data.user.email || email,
            nombre: data.user.user_metadata?.nombre || '',
          },
          password
        );
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nombre, apellidos },
        },
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage('¡Registro exitoso! Ya puedes iniciar sesión.');
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (session) {
    return (
      <div style={styles.phoneContainer}>
        <div style={styles.innerScreen}>
          <EquiposCatalog session={session} onLogout={handleLogout} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.phoneContainer}>
      <div style={styles.innerScreen}>
        <div style={styles.card}>
          <div style={styles.iconContainer}>
            <span style={{ fontSize: '22px' }}>💻</span>
          </div>

          <h2 style={styles.title}>TechCare</h2>
          <p style={styles.subtitle}>Mantenimiento preventivo y trazabilidad técnica</p>

          {errorMessage && <div style={styles.errorAlert}>{errorMessage}</div>}
          {successMessage && <div style={styles.successAlert}>{successMessage}</div>}

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            {!isLogin && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Nombre</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>👤</span>
                    <input
                      type="text"
                      placeholder="Cinthia"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required={!isLogin}
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Apellidos</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>👤</span>
                    <input
                      type="text"
                      placeholder="López Álvarez"
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      required={!isLogin}
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={styles.label}>Correo</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>✉️</span>
                <input
                  type="email"
                  placeholder="tecnico@techcare.mx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={styles.label}>Contraseña</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...styles.input, paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            {!isLogin && (
              <div style={{ marginBottom: '14px' }}>
                <label style={styles.label}>Confirmar contraseña</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                    style={{ ...styles.input, paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                    title={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    <EyeIcon visible={showConfirmPassword} />
                  </button>
                </div>
              </div>
            )}

            {isLogin && (
              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="autoEnroll"
                  checked={autoEnrollBiometric}
                  onChange={(e) => setAutoEnrollBiometric(e.target.checked)}
                  style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
                />
                <label htmlFor="autoEnroll" style={{ fontSize: '11px', color: '#93c5fd', cursor: 'pointer' }}>
                  Vincular huella dactilar automáticamente
                </label>
              </div>
            )}

            <button type="submit" disabled={loading} style={styles.buttonPrimary}>
              {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Crear cuenta'}
            </button>

            {/* Acceso con Huella Dactilar Nativa (Invoca BiometricPrompt oficial de Samsung / Android) */}
            {isLogin && (
              <div style={{ marginTop: '12px', textAlign: 'center', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => handleNativeBiometricLogin()}
                  disabled={loading}
                  style={styles.textBiometricLink}
                >
                  <svg
                    width={15}
                    height={15}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                    <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                    <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
                    <path d="M12 2a10 10 0 0 0-9.95 9" />
                  </svg>
                  <span>Iniciar con huella dactilar</span>
                </button>
              </div>
            )}
          </form>

          <div style={styles.footerText}>
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <span
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              style={styles.link}
            >
              {isLogin ? 'Regístrate' : 'Inicia sesión'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  phoneContainer: {
    backgroundColor: '#070b14',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0px',
    width: '100vw',
    overflow: 'hidden',
  },
  innerScreen: {
    width: '100%',
    height: '100vh',
    background: 'radial-gradient(circle at 50% 20%, #2563eb 0%, #1d4ed8 40%, #0f172a 90%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '360px',
    background: 'rgba(11, 18, 32, 0.55)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '28px',
    padding: '24px 18px',
    border: '1.5px solid rgba(96, 165, 250, 0.3)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconContainer: {
    width: '46px',
    height: '46px',
    backgroundColor: 'rgba(30, 58, 138, 0.6)',
    borderRadius: '14px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '10px',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.2), 0 4px 10px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 4px 0',
    letterSpacing: '0.5px',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  subtitle: {
    fontSize: '11px',
    color: '#93c5fd',
    textAlign: 'center',
    marginBottom: '18px',
    fontWeight: '500',
  },
  label: {
    fontSize: '11px',
    color: '#e2e8f0',
    display: 'block',
    marginBottom: '4px',
    fontWeight: '500',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    fontSize: '13px',
    opacity: '0.8',
  },
  input: {
    width: '100%',
    padding: '10px 10px 10px 36px',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    border: '1.5px solid rgba(96, 165, 250, 0.25)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
  },
  eyeButton: {
    position: 'absolute' as const,
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    outline: 'none',
  },
  textBiometricLink: {
    background: 'transparent',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    color: '#38bdf8',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '10px',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  buttonPrimary: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: '0 10px 20px -5px rgba(29, 78, 216, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
    letterSpacing: '0.3px',
  },
  buttonBiometric: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(180deg, #059669 0%, #047857 100%)',
    color: '#ffffff',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    borderRadius: '14px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 10px 20px -5px rgba(5, 150, 105, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
    transition: 'all 0.2s ease',
  },
  buttonBiometricOutline: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    color: '#34d399',
    border: '1.5px dashed #059669',
    borderRadius: '14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    margin: '12px 0 6px 0',
    gap: '8px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  dividerText: {
    fontSize: '11px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  buttonSecondary: {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  errorAlert: {
    width: '100%',
    padding: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    border: '1px solid #ef4444',
    color: '#fca5a5',
    borderRadius: '8px',
    fontSize: '12px',
    marginBottom: '12px',
    textAlign: 'center',
  },
  successAlert: {
    width: '100%',
    padding: '8px',
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    border: '1px solid #22c55e',
    color: '#86efac',
    borderRadius: '8px',
    fontSize: '12px',
    marginBottom: '12px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#cbd5e1',
    marginTop: '16px',
    textAlign: 'center',
  },
    link: {
    color: '#60a5fa',
    cursor: 'pointer',
    fontWeight: '600',
    textDecoration: 'underline',
  },
};