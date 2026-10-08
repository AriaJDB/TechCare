import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMessage('Credenciales inválidas. Verifica tu correo y contraseña.');
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
          <div style={{ padding: '30px 20px', color: 'white', textAlign: 'center' }}>
            <h2 style={{ color: '#ffffff' }}>Panel Principal</h2>
            <p style={{ color: '#60a5fa', marginTop: '10px' }}>Bienvenido, {session.user.email}</p>
            <button onClick={handleLogout} style={styles.buttonSecondary}>
              Cerrar Sesión
            </button>
          </div>
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
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            {!isLogin && (
              <div style={{ marginBottom: '14px' }}>
                <label style={styles.label}>Confirmar contraseña</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                    style={styles.input}
                  />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} style={styles.buttonPrimary}>
              {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Crear cuenta'}
            </button>
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