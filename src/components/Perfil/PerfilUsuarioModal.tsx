import React, { useState, useEffect } from 'react';
import {
  obtenerPerfilUsuario,
  actualizarPerfilUsuario,
  obtenerDirectorioIngenieros,
  sincronizarIngenieroEnDirectorio,
  type PerfilIngeniero,
  type RolUsuario,
} from '../../services/perfilService';
import {
  inicializarPermisosNotificacion,
  dispararNotificacionVencimiento,
} from '../../services/notificationService';

interface PerfilUsuarioModalProps {
  session: any;
  onClose: () => void;
  onPerfilActualizado: (perfil: PerfilIngeniero) => void;
}

export default function PerfilUsuarioModal({
  session,
  onClose,
  onPerfilActualizado,
}: PerfilUsuarioModalProps) {
  const inicial = obtenerPerfilUsuario(session);

  const [nombreMostrar, setNombreMostrar] = useState(inicial.nombreMostrar);
  const [nombre, setNombre] = useState(inicial.nombre);
  const [apellidos, setApellidos] = useState(inicial.apellidos);
  const [rol, setRol] = useState<RolUsuario>(inicial.rol);
  const [especialidad, setEspecialidad] = useState(inicial.especialidad);
  const [directorio, setDirectorio] = useState<PerfilIngeniero[]>([]);
  const [nuevoIngNombre, setNuevoIngNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [permisoNotif, setPermisoNotif] = useState<string>('default');

  useEffect(() => {
    setDirectorio(obtenerDirectorioIngenieros());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermisoNotif(Notification.permission);
    }
  }, []);

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensajeExito('');

    try {
      const actualizado = await actualizarPerfilUsuario({
        id: session?.user?.id || inicial.id,
        email: session?.user?.email || inicial.email,
        nombreMostrar: nombreMostrar.trim() || `Ing. ${nombre.trim()}`,
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        rol,
        especialidad: especialidad.trim(),
      });
      setDirectorio(obtenerDirectorioIngenieros());
      onPerfilActualizado(actualizado);
      setMensajeExito('✓ Perfil de ingeniero actualizado y sincronizado.');
      setTimeout(() => setMensajeExito(''), 3500);
    } finally {
      setGuardando(false);
    }
  };

  const handleAgregarIngenieroPlantilla = () => {
    const limpio = nuevoIngNombre.trim();
    if (!limpio) return;
    const formateado =
      limpio.toLowerCase().startsWith('ing.') || limpio.toLowerCase().startsWith('téc.')
        ? limpio
        : `Ing. ${limpio}`;

    const nuevo: PerfilIngeniero = {
      id: `ing-${Date.now()}`,
      email: `${limpio.toLowerCase().replace(/[^a-z0-9]/g, '.')}@techcare.mx`,
      nombre: limpio,
      apellidos: '',
      nombreMostrar: formateado,
      rol: 'tecnico',
      especialidad: especialidad || 'Soporte y Mantenimiento Preventivo',
      actualizadoEn: new Date().toISOString(),
    };
    const lista = sincronizarIngenieroEnDirectorio(nuevo);
    setDirectorio(lista);
    setNuevoIngNombre('');
    setMensajeExito(`✓ ${formateado} agregado a la plantilla de asignación.`);
    setTimeout(() => setMensajeExito(''), 3000);
  };

  const handleProbarNotificacion = async () => {
    const perm = await inicializarPermisosNotificacion();
    setPermisoNotif(perm);
    await dispararNotificacionVencimiento({
      idEquipo: 'demo-perfil',
      numeroSerie: 'SN-DEMO-01',
      tipoDispositivo: 'Laptop',
      ultimoIngeniero: nombreMostrar.trim() || inicial.nombreMostrar,
      proximaFecha: new Date().toISOString().substring(0, 10),
      estadoSemaforo: 'rojo',
    });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitleWrap}>
            <div style={styles.avatarBox}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h2 style={styles.title}>Perfil de Usuario e Ingenieros</h2>
              <p style={styles.subtitle}>{session?.user?.email || inicial.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div style={styles.headerDivider} />

        {mensajeExito && <div style={styles.successBanner}>{mensajeExito}</div>}

        <div style={styles.scrollBody}>
          {/* Formulario de edición de perfil */}
          <form onSubmit={handleGuardarPerfil} style={styles.sectionCard}>
            <div style={styles.sectionHeaderRow}>
              <span style={styles.badgeRol}>
                {rol === 'administrador' ? '🛡️ ADMINISTRADOR TI' : '🔧 INGENIERO SOPORTE'}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                Firma activa en órdenes
              </span>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Nombre de Usuario / Firma de Ingeniero (para asignación):
              </label>
              <input
                type="text"
                value={nombreMostrar}
                onChange={(e) => setNombreMostrar(e.target.value)}
                placeholder="Ej. Ing. Gabriel Flores"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.row2}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Nombre(s):</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Gabriel"
                  required
                  style={styles.input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Apellidos:</label>
                <input
                  type="text"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="Flores Argüello"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.row2}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Rol del Usuario (HU1):</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as RolUsuario)}
                  style={styles.input}
                >
                  <option value="tecnico">Técnico / Ingeniero de Soporte</option>
                  <option value="administrador">Administrador de TI</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Especialidad Técnica:</label>
                <select
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  style={styles.input}
                >
                  <option value="Arquitectura, Almacenamiento y Diagnóstico S.M.A.R.T.">
                    Almacenamiento y S.M.A.R.T.
                  </option>
                  <option value="Refrigeración, Disipación Térmica y Mantenimiento Preventivo">
                    Refrigeración y Térmico
                  </option>
                  <option value="Electrónica de Placa Base, Puertos y Fuente de Poder">
                    Placa Base y Fuente de Poder
                  </option>
                  <option value="Gestión de Activos, Calidad y Auditoría de Servicio">
                    Auditoría y Gestión de Activos
                  </option>
                  <option value="Soporte Técnico y Mantenimiento Preventivo">
                    Soporte General Integral
                  </option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={guardando} style={styles.primaryBtn}>
              {guardando ? 'Guardando cambios...' : 'Guardar mi Nombre y Perfil'}
            </button>
          </form>

          {/* Plantilla de Ingenieros para Asignación */}
          <div style={styles.sectionCard}>
            <h3 style={styles.cardHeading}>Plantilla de Ingenieros para Asignación</h3>
            <p style={styles.cardSub}>
              Toca un ingeniero para usar su firma rápidamente o registra un nuevo integrante en la plantilla.
            </p>

            <div style={styles.rosterList}>
              {directorio.map((ing) => {
                const esActivo = ing.nombreMostrar.toLowerCase() === nombreMostrar.trim().toLowerCase();
                return (
                  <div
                    key={ing.id}
                    onClick={() => {
                      setNombreMostrar(ing.nombreMostrar);
                      setNombre(ing.nombre);
                      setApellidos(ing.apellidos);
                      setRol(ing.rol);
                      setEspecialidad(ing.especialidad);
                    }}
                    style={{
                      ...styles.rosterItem,
                      ...(esActivo ? styles.rosterItemActive : {}),
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '13px', color: '#172554', display: 'block' }}>
                        {ing.nombreMostrar}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#475569' }}>{ing.especialidad}</span>
                    </div>
                    <span style={esActivo ? styles.activeTag : styles.selectTag}>
                      {esActivo ? 'Seleccionado' : 'Usar'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input
                type="text"
                value={nuevoIngNombre}
                onChange={(e) => setNuevoIngNombre(e.target.value)}
                placeholder="Nuevo ingeniero (ej. Ing. Roberto Díaz)"
                style={{ ...styles.input, flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAgregarIngenieroPlantilla}
                style={styles.secondaryBtn}
              >
                + Agregar
              </button>
            </div>
          </div>

          {/* Configuración de Notificaciones de Vencimiento en Teléfono */}
          <div style={styles.sectionCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={styles.cardHeading}>Notificaciones en Teléfono (HU8)</h3>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: permisoNotif === 'granted' ? '#dcfce7' : '#fef9c3',
                  color: permisoNotif === 'granted' ? '#065f46' : '#854d0e',
                }}
              >
                {permisoNotif === 'granted' ? '✓ Activas' : 'Permiso requerido'}
              </span>
            </div>
            <p style={styles.cardSub}>
              Cuando el semáforo de un equipo cambie a ROJO, el sistema envía una alerta directa a la pantalla de bloqueo para el último ingeniero que atendió el equipo.
            </p>
            <button type="button" onClick={handleProbarNotificacion} style={styles.testNotifBtn}>
              🔔 Activar y Probar Notificación en Pantalla de Bloqueo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(180, 196, 238, 0.65)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: '12px',
    boxSizing: 'border-box',
  },
  modalCard: {
    width: '100%',
    maxWidth: '430px',
    maxHeight: '94vh',
    background: 'linear-gradient(145deg, #f5f8ff 0%, #eaefff 100%)',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '36px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow:
      '20px 24px 48px rgba(130, 150, 200, 0.5), -10px -10px 28px rgba(255, 255, 255, 0.95), inset 0 3px 6px rgba(255, 255, 255, 1)',
    color: '#172554',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 22px 14px 22px',
  },
  headerTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatarBox: {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(145deg, #5c8df6 0%, #2563eb 100%)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 18px rgba(37, 99, 235, 0.35), inset 0 3px 5px rgba(255, 255, 255, 0.45)',
  },
  title: {
    fontSize: '17px',
    fontWeight: 800,
    margin: 0,
    color: '#172554',
  },
  subtitle: {
    fontSize: '12px',
    color: '#475569',
    margin: '2px 0 0 0',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    color: '#1e293b',
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '4px 4px 10px rgba(148, 166, 212, 0.45), inset 0 2px 3px #ffffff',
  },
  headerDivider: {
    height: '1.5px',
    margin: '0 22px',
    background: 'rgba(203, 213, 225, 0.65)',
  },
  successBanner: {
    background: 'linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%)',
    color: '#065f46',
    padding: '10px 16px',
    textAlign: 'center',
    fontSize: '12.5px',
    fontWeight: 800,
    margin: '10px 20px 0 20px',
    borderRadius: '16px',
  },
  scrollBody: {
    padding: '16px 20px 24px 20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionCard: {
    background: 'linear-gradient(145deg, #f8faff 0%, #edf2ff 100%)',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '26px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '10px 12px 24px rgba(148, 166, 212, 0.38), -6px -6px 16px rgba(255, 255, 255, 0.95)',
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
  },
  badgeRol: {
    fontSize: '10.5px',
    fontWeight: 800,
    color: '#1e40af',
    background: '#dbeafe',
    padding: '4px 10px',
    borderRadius: '10px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  row2: {
    display: 'flex',
    gap: '10px',
  },
  label: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '3px',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#e4ebf8',
    border: '1px solid rgba(255, 255, 255, 0.7)',
    borderRadius: '14px',
    color: '#172554',
    fontSize: '12.5px',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: 'inset 3px 3px 7px rgba(160, 176, 212, 0.55), inset -3px -3px 7px rgba(255, 255, 255, 0.9)',
  },
  primaryBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '18px',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: '4px',
    boxShadow: '0 8px 18px rgba(37, 99, 235, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.45)',
  },
  secondaryBtn: {
    padding: '10px 14px',
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    color: '#2563eb',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '14px',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '4px 4px 10px rgba(148, 166, 212, 0.38), inset 0 2px 3px #ffffff',
  },
  cardHeading: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#172554',
    margin: 0,
  },
  cardSub: {
    fontSize: '11.5px',
    color: '#475569',
    margin: 0,
    lineHeight: '1.35',
  },
  rosterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
  },
  rosterItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: '#e5ecf9',
    borderRadius: '16px',
    cursor: 'pointer',
    border: '1.5px solid transparent',
    boxShadow: 'inset 3px 3px 6px rgba(160, 176, 212, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.85)',
  },
  rosterItemActive: {
    background: 'linear-gradient(145deg, #ffffff 0%, #e0eaff 100%)',
    border: '1.5px solid #60a5fa',
    boxShadow: '4px 6px 12px rgba(148, 166, 212, 0.38)',
  },
  activeTag: {
    fontSize: '10.5px',
    fontWeight: 800,
    color: '#ffffff',
    background: '#2563eb',
    padding: '4px 9px',
    borderRadius: '10px',
  },
  selectTag: {
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#2563eb',
    background: '#ffffff',
    padding: '4px 9px',
    borderRadius: '10px',
  },
  testNotifBtn: {
    width: '100%',
    padding: '11px 14px',
    background: 'linear-gradient(145deg, #ffe4e6 0%, #fecdd3 100%)',
    color: '#be123c',
    border: '1px solid rgba(255, 255, 255, 0.85)',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '6px 6px 14px rgba(225, 150, 165, 0.38), inset 0 2px 3px #ffffff',
  },
};
