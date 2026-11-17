import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import EquiposCatalog from './components/Equipos/EquiposCatalog';
import {
  isBiometricEnrolled,
  getEnrolledUser,
  enrollBiometric,
  loginWithBiometric,
} from './services/biometricAuthService';

const EyeIcon = ({ visible, size = 18, color = '#475569' }: { visible: boolean; size?: number; color?: string }) => {
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

const UserIcon = ({ size = 17, color = '#475569' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MailIcon = ({ size = 18, color = '#475569' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = ({ size = 18, color = '#475569' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

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

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const enrolled = getEnrolledUser();
    if (enrolled) {
      setBiometricUser(enrolled);
      if (enrolled.email && !email) {
        setEmail(enrolled.email);
      }
    }
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

    try {
      if (isLogin) {
        const cleanEmail = email.trim().toLowerCase();
        const prevEnrolled = getEnrolledUser();
        const emailChanged = !prevEnrolled || prevEnrolled.email.toLowerCase().trim() !== cleanEmail;

        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          if (error.message?.toLowerCase().includes('fetch') || (error as any).status === 0) {
            setErrorMessage('Error de conexión con el servidor. Revisa tu conexión a internet.');
          } else if (error.message === 'Invalid login credentials') {
            setErrorMessage('Credenciales inválidas. Verifica tu correo y contraseña.');
          } else {
            setErrorMessage(error.message || 'Error al iniciar sesión.');
          }
        } else if (data?.user) {
          if (autoEnrollBiometric || emailChanged) {
            await enrollBiometric(
              {
                id: data.user.id,
                email: data.user.email || cleanEmail,
                nombre: data.user.user_metadata?.nombre || '',
              },
              password
            );
            setBiometricUser(getEnrolledUser());
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nombre,
              apellidos,
            },
          },
        });

        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage('¡Registro exitoso! Ya puedes iniciar sesión.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error en la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (session) {
    return (
      <div style={styles.phoneContainer}>
        <div style={styles.blobTopLeft} />
        <div style={styles.blobTopRight} />
        <div style={styles.blobBottomRight} />
        <div style={styles.innerScreenCatalog}>
          <EquiposCatalog session={session} onLogout={handleLogout} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.phoneContainer}>
      <div style={styles.blobTopLeft} />
      <div style={styles.blobTopRight} />
      <div style={styles.blobBottomLeft} />
      <div style={styles.blobBottomRight} />

      <div style={styles.innerScreen}>
        <div style={styles.card}>
          <div style={styles.iconContainer}>
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>

          <h2 style={styles.title}>{isLogin ? 'Bienvenido' : 'Crear Cuenta'}</h2>
          <p style={styles.subtitle}>
            {isLogin
              ? 'Ingresa a TechCare para gestionar tus equipos'
              : 'Regístrate como técnico de mantenimiento'}
          </p>

          {errorMessage && (
            <div style={styles.errorAlert}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div style={styles.successAlert}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            {!isLogin && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Nombre</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>
                      <UserIcon size={17} />
                    </span>
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
                    <span style={styles.inputIcon}>
                      <UserIcon size={17} />
                    </span>
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

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Correo</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>
                  <MailIcon size={18} />
                </span>
                <input
                  type="email"
                  placeholder="gbfloresarguello@gmail.com"
                  value={email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEmail(val);
                    setErrorMessage('');
                    setSuccessMessage('');
                    if (biometricUser?.email && val.trim().toLowerCase() !== biometricUser.email.toLowerCase().trim()) {
                      setAutoEnrollBiometric(true);
                    }
                  }}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Contraseña</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>
                  <LockIcon size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...styles.input, paddingRight: '52px' }}
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
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Confirmar contraseña</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>
                    <LockIcon size={18} />
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                    style={{ ...styles.input, paddingRight: '52px' }}
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
              <div onClick={() => setAutoEnrollBiometric(!autoEnrollBiometric)} style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="autoEnroll"
                  checked={autoEnrollBiometric}
                  onChange={(e) => setAutoEnrollBiometric(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <div style={{ ...styles.clayCheckbox, ...(autoEnrollBiometric ? styles.clayCheckboxChecked : {}) }}>
                  {autoEnrollBiometric && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <label htmlFor="autoEnroll" onClick={(e) => e.stopPropagation()} style={styles.checkboxLabel}>
                  Vincular huella dactilar
                  <br />
                  automáticamente
                </label>
              </div>
            )}

            <button type="submit" disabled={loading} style={styles.buttonPrimary}>
              {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Crear cuenta'}
            </button>

            {isLogin && (
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => handleNativeBiometricLogin()}
                  disabled={loading}
                  style={styles.buttonBiometricClay}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.2"
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
    position: 'relative',
    background: 'linear-gradient(145deg, #d7e2ff 0%, #e7eeff 50%, #cedbff 100%)',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0px',
    width: '100%',
    overflowX: 'hidden',
  },
  blobTopLeft: {
    position: 'fixed',
    top: '-60px',
    left: '-60px',
    width: '240px',
    height: '240px',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #eef2ff 0%, #c7d6ff 65%, #b4c6fc 100%)',
    boxShadow: 'inset -10px -10px 25px rgba(148, 163, 218, 0.4), 15px 20px 35px rgba(148, 163, 218, 0.3)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  blobTopRight: {
    position: 'fixed',
    top: '40px',
    right: '-45px',
    width: '130px',
    height: '130px',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 30% 30%, #d1fae5 0%, #86efac 70%, #4ade80 100%)',
    boxShadow: 'inset -8px -8px 18px rgba(22, 163, 74, 0.25), 10px 15px 25px rgba(74, 222, 128, 0.25)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  blobBottomLeft: {
    position: 'fixed',
    bottom: '80px',
    left: '-45px',
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #ffedd5 0%, #fdba74 75%, #fb923c 100%)',
    boxShadow: 'inset -6px -6px 14px rgba(234, 88, 12, 0.2), 8px 12px 24px rgba(251, 146, 60, 0.25)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  blobBottomRight: {
    position: 'fixed',
    bottom: '-70px',
    right: '-50px',
    width: '240px',
    height: '240px',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #e9d5ff 0%, #c084fc 70%, #a855f7 100%)',
    boxShadow: 'inset -12px -12px 24px rgba(126, 34, 206, 0.3), 10px 15px 30px rgba(168, 85, 247, 0.25)',
    opacity: 0.75,
    pointerEvents: 'none',
    zIndex: 0,
  },
  innerScreen: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px 18px',
    boxSizing: 'border-box',
  },
  innerScreenCatalog: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 10px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '370px',
    background: 'linear-gradient(145deg, #f8faff 0%, #edf2ff 100%)',
    borderRadius: '38px',
    padding: '32px 24px 28px 24px',
    border: '1.5px solid rgba(255, 255, 255, 0.85)',
    boxShadow:
      '20px 24px 48px rgba(139, 158, 207, 0.5), -12px -12px 32px rgba(255, 255, 255, 0.95), inset 0 3px 6px rgba(255, 255, 255, 1), inset 0 -5px 10px rgba(191, 206, 245, 0.5)',
    color: '#1e293b',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconContainer: {
    width: '68px',
    height: '68px',
    background: 'linear-gradient(145deg, #5c8df6 0%, #2563eb 100%)',
    borderRadius: '22px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
    boxShadow:
      '0 12px 24px rgba(37, 99, 235, 0.38), inset 0 4px 6px rgba(255, 255, 255, 0.45), inset 0 -5px 8px rgba(29, 78, 216, 0.65)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#172554',
    margin: '0 0 6px 0',
    letterSpacing: '-0.4px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#475569',
    textAlign: 'center',
    marginBottom: '20px',
    fontWeight: 500,
    lineHeight: '1.4',
  },
  errorAlert: {
    width: '100%',
    padding: '12px 14px',
    background: 'linear-gradient(145deg, #ffe4e6 0%, #fecdd3 100%)',
    color: '#be123c',
    borderRadius: '18px',
    fontSize: '12.5px',
    fontWeight: 700,
    marginBottom: '16px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow:
      '6px 8px 16px rgba(225, 150, 165, 0.35), -4px -4px 10px rgba(255, 255, 255, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.85), inset 0 -3px 6px rgba(244, 63, 94, 0.2)',
  },
  successAlert: {
    width: '100%',
    padding: '13px 16px',
    background: 'linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%)',
    color: '#065f46',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 700,
    marginBottom: '18px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow:
      '6px 8px 18px rgba(134, 209, 172, 0.4), -4px -4px 12px rgba(255, 255, 255, 0.85), inset 0 3px 5px rgba(255, 255, 255, 0.9), inset 0 -3px 6px rgba(16, 185, 129, 0.25)',
  },
  label: {
    fontSize: '13px',
    color: '#1e293b',
    display: 'block',
    marginBottom: '8px',
    marginLeft: '4px',
    fontWeight: 700,
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '15px 16px 15px 46px',
    backgroundColor: '#e3eaf8',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '20px',
    color: '#1e293b',
    fontSize: '13.5px',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: 'inset 5px 5px 10px rgba(163, 179, 214, 0.6), inset -5px -5px 10px rgba(255, 255, 255, 0.9)',
  },
  eyeButton: {
    position: 'absolute' as const,
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #ffffff 0%, #eef2ff 100%)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#334155',
    outline: 'none',
    boxShadow:
      '3px 3px 8px rgba(155, 172, 212, 0.45), -2px -2px 6px rgba(255, 255, 255, 0.9), inset 0 1px 2px #ffffff',
  },
  checkboxRow: {
    marginBottom: '18px',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    paddingLeft: '2px',
  },
  clayCheckbox: {
    width: '26px',
    height: '26px',
    borderRadius: '9px',
    background: '#e3eaf8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: 'inset 3px 3px 6px rgba(163, 179, 214, 0.55), inset -3px -3px 6px rgba(255, 255, 255, 0.9)',
  },
  clayCheckboxChecked: {
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    boxShadow:
      '0 5px 10px rgba(37, 99, 235, 0.35), inset 0 2px 3px rgba(255, 255, 255, 0.45), inset 0 -2px 4px rgba(29, 78, 216, 0.6)',
  },
  checkboxLabel: {
    fontSize: '13px',
    color: '#334155',
    fontWeight: 600,
    cursor: 'pointer',
    lineHeight: '1.35',
  },
  buttonPrimary: {
    width: '100%',
    padding: '15px',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '22px',
    fontSize: '16px',
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: '4px',
    boxShadow:
      '0 12px 24px rgba(37, 99, 235, 0.4), -4px -4px 12px rgba(255, 255, 255, 0.8), inset 0 3px 6px rgba(255, 255, 255, 0.45), inset 0 -4px 8px rgba(29, 78, 216, 0.65)',
    letterSpacing: '0.2px',
  },
  buttonBiometricClay: {
    width: '88%',
    padding: '13px 18px',
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    color: '#2563eb',
    border: '1px solid rgba(255, 255, 255, 0.85)',
    borderRadius: '20px',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow:
      '8px 10px 20px rgba(155, 172, 212, 0.42), -6px -6px 14px rgba(255, 255, 255, 0.95), inset 0 2px 4px rgba(255, 255, 255, 1), inset 0 -3px 6px rgba(203, 213, 235, 0.45)',
  },
  footerText: {
    fontSize: '13px',
    color: '#475569',
    marginTop: '20px',
    textAlign: 'center',
    fontWeight: 600,
  },
  link: {
    color: '#1e3a8a',
    cursor: 'pointer',
    fontWeight: 800,
    textDecoration: 'underline',
  },
};
