import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import QRCode from 'react-qr-code';
import RegisterEquipmentScreen from './RegisterEquipmentScreen';
import QRScannerScreen from './QRScannerScreen';
import FichaTecnicaModal from './FichaTecnicaModal';
import PerfilUsuarioModal from '../Perfil/PerfilUsuarioModal';
import { descargarEtiquetaQR, imprimirEtiquetaQR } from '../../utils/qrExporter';
import {
  getHistorialEquipo,
  calcularResumenSemaforoEquipo,
  establecerOverrideSemaforo,
  type ResumenSemaforoEquipo,
} from '../../utils/historialService';
import { obtenerPerfilUsuario, type PerfilIngeniero } from '../../services/perfilService';
import {
  inicializarPermisosNotificacion,
  dispararNotificacionVencimiento,
} from '../../services/notificationService';
import type { EstadoSemaforo } from '../../utils/mantenimiento';

type VistaActual = 'catalogo' | 'nuevo' | 'escanear';

export const DeviceIcon = ({ tipo }: { tipo?: string }) => {
  const t = (tipo || 'laptop').toLowerCase();

  if (t === 'desktop') {
    return (
      <div
        style={{
          ...styles.deviceIconBox,
          background: 'linear-gradient(145deg, #5c8df6 0%, #2563eb 100%)',
          boxShadow:
            '0 8px 16px rgba(37, 99, 235, 0.35), inset 0 3px 5px rgba(255, 255, 255, 0.45), inset 0 -4px 6px rgba(29, 78, 216, 0.65)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </div>
    );
  }

  if (t === 'servidor') {
    return (
      <div
        style={{
          ...styles.deviceIconBox,
          background: 'linear-gradient(145deg, #a78bfa 0%, #7c3aed 100%)',
          boxShadow:
            '0 8px 16px rgba(124, 58, 237, 0.35), inset 0 3px 5px rgba(255, 255, 255, 0.45), inset 0 -4px 6px rgba(91, 33, 182, 0.65)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      </div>
    );
  }

  // Default: laptop
  return (
    <div
      style={{
        ...styles.deviceIconBox,
        background: 'linear-gradient(145deg, #34d399 0%, #10b981 100%)',
        boxShadow:
          '0 8px 16px rgba(16, 185, 129, 0.35), inset 0 3px 5px rgba(255, 255, 255, 0.45), inset 0 -4px 6px rgba(5, 150, 105, 0.65)',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="12" rx="2" ry="2" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    </div>
  );
};

export default function EquiposCatalog({
  session,
  onLogout,
}: {
  session: any;
  onLogout: () => void;
}) {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [resumenMap, setResumenMap] = useState<Record<string, ResumenSemaforoEquipo>>({});
  const [vista, setVista] = useState<VistaActual>('catalogo');
  const [loading, setLoading] = useState(true);
  const [equipoAEditar, setEquipoAEditar] = useState<any>(null);
  const [verQR, setVerQR] = useState<string | null>(null);
  const [equipoFicha, setEquipoFicha] = useState<any | null>(null);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [perfilUsuario, setPerfilUsuario] = useState<PerfilIngeniero>(() =>
    obtenerPerfilUsuario(session)
  );
  const [filtroSemaforo, setFiltroSemaforo] = useState<EstadoSemaforo | 'todos'>('todos');

  const calcularResumenesParaEquipos = async (listaEquipos: any[]) => {
    const nuevoMapa: Record<string, ResumenSemaforoEquipo> = {};
    for (const eq of listaEquipos) {
      const clave = eq.id || eq.id_equipo || eq.numero_serie || eq.codigo_qr;
      const hist = await getHistorialEquipo(eq);
      nuevoMapa[clave] = calcularResumenSemaforoEquipo(eq, hist);
    }
    setResumenMap(nuevoMapa);
  };

  const fetchEquipos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('equipo')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEquipos(data);
      await calcularResumenesParaEquipos(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este equipo?')) {
      const { error } = await supabase.from('equipo').delete().eq('id', id);
      if (error) {
        if (error.code === '42501') {
          alert('Error HTTP 403: Acceso denegado. No tienes permisos de administrador para eliminar.');
        } else {
          alert(error.message);
        }
      } else {
        fetchEquipos();
      }
    }
  };

  const handleEdit = (equipo: any) => {
    setEquipoAEditar(equipo);
    setVista('nuevo');
  };

  const handleDescargarCardQR = (equipo: any) => {
    const cardEl = document.querySelector(`[data-card-qr="${equipo.id || equipo.id_equipo}"] svg`) as SVGSVGElement | null;
    descargarEtiquetaQR(
      {
        tipo_dispositivo: equipo.tipo_dispositivo || 'laptop',
        numero_serie: equipo.numero_serie,
        procesador: equipo.procesador,
        ram: equipo.ram,
        almacenamiento: equipo.almacenamiento,
        codigo_qr: equipo.codigo_qr,
      },
      cardEl
    );
  };

  const handleImprimirCardQR = (equipo: any) => {
    const cardEl = document.querySelector(`[data-card-qr="${equipo.id || equipo.id_equipo}"] svg`) as SVGSVGElement | null;
    imprimirEtiquetaQR(
      {
        tipo_dispositivo: equipo.tipo_dispositivo || 'laptop',
        numero_serie: equipo.numero_serie,
        procesador: equipo.procesador,
        ram: equipo.ram,
        almacenamiento: equipo.almacenamiento,
        codigo_qr: equipo.codigo_qr,
      },
      cardEl
    );
  };

  const handleCambiarSemaforoDirecto = async (equipo: any, nuevoEstado: EstadoSemaforo) => {
    const clave = equipo.id || equipo.id_equipo || equipo.numero_serie || equipo.codigo_qr;
    establecerOverrideSemaforo(clave, nuevoEstado);
    await calcularResumenesParaEquipos(equipos);

    const resumenActual = resumenMap[clave];
    const ultimoIng = resumenActual?.ultimoIngeniero || perfilUsuario.nombreMostrar || 'Ing. Cinthia López';
    const proxFecha = resumenActual?.proximaFecha || '2027-03-18';

    if (nuevoEstado === 'rojo') {
      await dispararNotificacionVencimiento({
        idEquipo: clave,
        numeroSerie: equipo.numero_serie || 'SN-EQUIPO',
        tipoDispositivo: equipo.tipo_dispositivo || 'Equipo',
        ultimoIngeniero: ultimoIng,
        proximaFecha: proxFecha,
        estadoSemaforo: 'rojo',
      });
    }
  };

  useEffect(() => {
    fetchEquipos();
    inicializarPermisosNotificacion();
  }, []);

  const conteoSemaforo = {
    verde: 0,
    amarillo: 0,
    rojo: 0,
  };
  for (const eq of equipos) {
    const clave = eq.id || eq.id_equipo || eq.numero_serie || eq.codigo_qr;
    const est = resumenMap[clave]?.estadoSemaforo || 'verde';
    conteoSemaforo[est] += 1;
  }

  const equiposFiltrados =
    filtroSemaforo === 'todos'
      ? equipos
      : equipos.filter((eq) => {
          const clave = eq.id || eq.id_equipo || eq.numero_serie || eq.codigo_qr;
          return (resumenMap[clave]?.estadoSemaforo || 'verde') === filtroSemaforo;
        });

  return (
    <div style={styles.container}>
      {/* Encabezado Principal con Acceso a Perfil de Ingeniero */}
      <div style={styles.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={styles.title}>Panel TechCare</h2>
          <p style={styles.subtitle}>
            {perfilUsuario.nombreMostrar} · <span style={{ opacity: 0.8 }}>{session.user.email}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowPerfilModal(true)}
            style={styles.profileBtn}
            title="Editar perfil de usuario y asignación de ingenieros"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Perfil</span>
          </button>

          <button onClick={onLogout} style={styles.logoutBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#be123c" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Barra de Navegación / Pestañas Claymorphism */}
      <div style={styles.navigationTabs}>
        <button
          onClick={() => {
            setVista('catalogo');
            setEquipoAEditar(null);
          }}
          style={{
            ...styles.navTab,
            ...(vista === 'catalogo' ? styles.navTabActive : {}),
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={vista === 'catalogo' ? '#ffffff' : '#334155'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <line x1="8" y1="11" x2="16" y2="11" />
            <line x1="8" y1="16" x2="13" y2="16" />
          </svg>
          <span>Catálogo ({equipos.length})</span>
        </button>

        <button
          onClick={() => {
            setVista('escanear');
            setEquipoAEditar(null);
          }}
          style={{
            ...styles.navTab,
            ...(vista === 'escanear' ? styles.navTabActive : {}),
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={vista === 'escanear' ? '#ffffff' : '#334155'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
          <span>Escanear QR</span>
        </button>

        <button
          onClick={() => {
            if (vista === 'nuevo') {
              setVista('catalogo');
              setEquipoAEditar(null);
            } else {
              setEquipoAEditar(null);
              setVista('nuevo');
            }
          }}
          style={{
            ...styles.navTab,
            ...(vista === 'nuevo' ? styles.navTabActive : {}),
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={vista === 'nuevo' ? '#ffffff' : '#334155'}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{vista === 'nuevo' ? 'Cancelar Alta' : 'Nuevo Equipo'}</span>
        </button>
      </div>

      {vista === 'escanear' && (
        <QRScannerScreen
          onBack={() => setVista('catalogo')}
          onEquipoEncontrado={(equipo) => {
            setEquipoFicha(equipo);
          }}
          equiposDisponibles={equipos}
        />
      )}

      {vista === 'nuevo' && (
        <RegisterEquipmentScreen
          session={session}
          onEquipoAgregado={() => {
            fetchEquipos();
            setEquipoAEditar(null);
            setVista('catalogo');
          }}
          equipoAEditar={equipoAEditar}
          onCancelEdit={() => {
            setEquipoAEditar(null);
            setVista('catalogo');
          }}
        />
      )}

      {vista === 'catalogo' && (
        <div style={styles.listContainer}>
          <div style={styles.catalogHeader}>
            <h3 style={styles.sectionTitle}>
              Equipos
              <br />
              Registrados
            </h3>
            <button onClick={() => setVista('escanear')} style={styles.quickScanBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <line x1="7" y1="12" x2="17" y2="12" />
              </svg>
              <span>Abrir Escáner QR</span>
            </button>
          </div>

          {/* Barra Resumen de Semáforo del Panel Principal (Sprint 8 - HU8) */}
          {equipos.length > 0 && (
            <div style={styles.semaforoSummaryBar}>
              <button
                type="button"
                onClick={() => setFiltroSemaforo('todos')}
                style={{
                  ...styles.semaforoFilterChip,
                  ...(filtroSemaforo === 'todos' ? styles.semaforoFilterChipActive : {}),
                }}
              >
                Todos ({equipos.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroSemaforo(filtroSemaforo === 'verde' ? 'todos' : 'verde')}
                style={{
                  ...styles.semaforoFilterChip,
                  background: filtroSemaforo === 'verde' ? '#dcfce7' : '#ffffff',
                  color: '#065f46',
                }}
              >
                <span style={{ ...styles.miniDot, backgroundColor: '#16a34a' }} />
                Al día ({conteoSemaforo.verde})
              </button>
              <button
                type="button"
                onClick={() => setFiltroSemaforo(filtroSemaforo === 'amarillo' ? 'todos' : 'amarillo')}
                style={{
                  ...styles.semaforoFilterChip,
                  background: filtroSemaforo === 'amarillo' ? '#fef9c3' : '#ffffff',
                  color: '#854d0e',
                }}
              >
                <span style={{ ...styles.miniDot, backgroundColor: '#ca8a04' }} />
                Por vencer ({conteoSemaforo.amarillo})
              </button>
              <button
                type="button"
                onClick={() => setFiltroSemaforo(filtroSemaforo === 'rojo' ? 'todos' : 'rojo')}
                style={{
                  ...styles.semaforoFilterChip,
                  background: filtroSemaforo === 'rojo' ? '#ffe4e6' : '#ffffff',
                  color: '#9f1239',
                }}
              >
                <span style={{ ...styles.miniDot, backgroundColor: '#e11d48' }} />
                Vencidos ({conteoSemaforo.rojo})
              </button>
            </div>
          )}

          {loading ? (
            <div style={styles.emptyState}>
              <p style={{ color: '#475569', fontWeight: 700, fontSize: '14px' }}>Cargando catálogo de equipos...</p>
            </div>
          ) : equiposFiltrados.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ color: '#172554', fontWeight: 800, marginTop: '4px', fontSize: '16px' }}>
                {equipos.length === 0 ? 'No hay equipos registrados aún' : 'No hay equipos en este estado del semáforo'}
              </p>
              <p style={{ color: '#64748b', fontSize: '12.5px', textAlign: 'center', maxWidth: '300px', marginTop: '4px' }}>
                {equipos.length === 0
                  ? 'Da de alta un equipo con "Nuevo Equipo" para generar su código QR o prueba el escáner.'
                  : 'Selecciona "Todos" para volver a ver el inventario completo.'}
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                {equipos.length === 0 ? (
                  <>
                    <button onClick={() => setVista('nuevo')} style={styles.fichaPrimaryBtn}>
                      + Registrar primer equipo
                    </button>
                    <button onClick={() => setVista('escanear')} style={styles.whiteClayActionBtn}>
                      Probar Escáner QR
                    </button>
                  </>
                ) : (
                  <button onClick={() => setFiltroSemaforo('todos')} style={styles.fichaPrimaryBtn}>
                    Ver todos los equipos
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={styles.grid}>
              {equiposFiltrados.map((equipo) => {
                const idVal = equipo.id || equipo.id_equipo || equipo.numero_serie || equipo.codigo_qr;
                const isQRExpanded = verQR === idVal;
                const resumen = resumenMap[idVal];
                const estadoSem: EstadoSemaforo = resumen?.estadoSemaforo || 'verde';
                const proxFecha = resumen?.proximaFecha || '2027-03-18';
                const ultimoIng = resumen?.ultimoIngeniero || 'Ing. Cinthia López';

                const semStyle = {
                  verde: {
                    bg: 'linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%)',
                    text: '#065f46',
                    dot: '#16a34a',
                    label: 'AL DÍA',
                  },
                  amarillo: {
                    bg: 'linear-gradient(145deg, #fef9c3 0%, #fde047 100%)',
                    text: '#854d0e',
                    dot: '#ca8a04',
                    label: 'POR VENCER',
                  },
                  rojo: {
                    bg: 'linear-gradient(145deg, #ffe4e6 0%, #fecdd3 100%)',
                    text: '#9f1239',
                    dot: '#e11d48',
                    label: 'VENCIDO',
                  },
                }[estadoSem];

                return (
                  <div key={idVal} style={styles.card}>
                    {/* Header: Device Icon, Name, and Serial Pill */}
                    <div style={styles.cardHeader}>
                      <div style={styles.deviceTypeWrap}>
                        <DeviceIcon tipo={equipo.tipo_dispositivo} />
                        <div>
                          <span style={styles.deviceTypeTitle}>{equipo.tipo_dispositivo || 'Equipo'}</span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                            SN: {equipo.numero_serie}
                          </span>
                        </div>
                      </div>

                      {/* Semáforo interactivo en tarjeta */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                        <span
                          style={{
                            ...styles.cardSemaforoPill,
                            background: semStyle.bg,
                            color: semStyle.text,
                          }}
                        >
                          <span style={{ ...styles.miniDot, backgroundColor: semStyle.dot }} />
                          {semStyle.label}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {(['verde', 'amarillo', 'rojo'] as EstadoSemaforo[]).map((st) => {
                            const dotColor = st === 'verde' ? '#16a34a' : st === 'amarillo' ? '#ca8a04' : '#e11d48';
                            const isSelected = estadoSem === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleCambiarSemaforoDirecto(equipo, st)}
                                title={`Cambiar semáforo a ${st.toUpperCase()}`}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  border: isSelected ? '2px solid #172554' : '1.5px solid #ffffff',
                                  backgroundColor: dotColor,
                                  cursor: 'pointer',
                                  padding: 0,
                                  opacity: isSelected ? 1 : 0.45,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Recessed Specs Box + Próxima Fecha e Ingeniero */}
                    <div style={styles.specsRecessedBox}>
                      <div style={styles.specRow}>
                        <span style={styles.specLabel}>CPU</span>
                        <span style={styles.specVal}>{equipo.procesador || 'No especificado'}</span>
                      </div>
                      <div style={styles.specRow}>
                        <span style={styles.specLabel}>RAM</span>
                        <span style={styles.specVal}>{equipo.ram || 'No especificado'}</span>
                      </div>
                      <div style={styles.specRow}>
                        <span style={styles.specLabel}>Disco</span>
                        <span style={styles.specVal}>{equipo.almacenamiento || 'No especificado'}</span>
                      </div>
                      <div
                        style={{
                          ...styles.specRow,
                          paddingTop: '6px',
                          borderTop: '1px dashed rgba(148, 163, 184, 0.45)',
                        }}
                      >
                        <span style={{ ...styles.specLabel, width: '92px' }}>Próx. Mant.</span>
                        <span style={{ ...styles.specVal, color: estadoSem === 'rojo' ? '#be123c' : '#1e40af' }}>
                          {proxFecha} ({resumen?.cicloMeses || 6}m)
                        </span>
                      </div>
                      <div style={styles.specRow}>
                        <span style={{ ...styles.specLabel, width: '92px' }}>Último Ing.</span>
                        <span style={styles.specVal}>{ultimoIng}</span>
                      </div>
                    </div>

                    {/* QR Code Expanded */}
                    {isQRExpanded && (
                      <div data-card-qr={idVal} style={styles.qrExpandedCard}>
                        <div style={styles.qrWhiteFrame}>
                          <QRCode value={equipo.codigo_qr} size={115} />
                        </div>
                        <p style={{ color: '#172554', fontSize: '12px', fontWeight: 800, margin: '8px 0 2px 0' }}>
                          SN: {equipo.numero_serie}
                        </p>
                        <p style={{ color: '#64748b', fontSize: '10.5px', margin: '0 0 12px 0', wordBreak: 'break-all', textAlign: 'center' }}>
                          {equipo.codigo_qr}
                        </p>
                        <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                          <button onClick={() => handleDescargarCardQR(equipo)} style={styles.cardDownloadBtn}>
                            Descargar Etiqueta
                          </button>
                          <button onClick={() => handleImprimirCardQR(equipo)} style={styles.cardPrintBtn}>
                            Imprimir
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={styles.cardFooterActions}>
                      <button onClick={() => setEquipoFicha(equipo)} style={styles.fichaPrimaryBtn}>
                        Ficha e Historial
                      </button>
                      <button onClick={() => setVerQR(isQRExpanded ? null : idVal)} style={styles.whiteClayActionBtn}>
                        {isQRExpanded ? 'Ocultar QR' : 'Ver QR'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Ficha Técnica Completa */}
      {equipoFicha && (
        <FichaTecnicaModal
          equipo={equipoFicha}
          onClose={() => {
            setEquipoFicha(null);
            calcularResumenesParaEquipos(equipos);
          }}
          onEdit={(eq) => {
            setEquipoFicha(null);
            handleEdit(eq);
          }}
          onDelete={async (id) => {
            await handleDelete(id);
            setEquipoFicha(null);
          }}
          onSemaforoChange={() => calcularResumenesParaEquipos(equipos)}
          currentUserEmail={session.user.email}
        />
      )}

      {/* Modal Perfil de Usuario e Ingenieros */}
      {showPerfilModal && (
        <PerfilUsuarioModal
          session={session}
          onClose={() => setShowPerfilModal(false)}
          onPerfilActualizado={(nuevoPerfil) => {
            setPerfilUsuario(nuevoPerfil);
          }}
        />
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    maxWidth: '420px',
    margin: '0 auto',
    padding: '8px 6px 28px 6px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    background: 'linear-gradient(145deg, #f8faff 0%, #edf2ff 100%)',
    padding: '16px 16px',
    borderRadius: '28px',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    boxShadow:
      '14px 16px 32px rgba(145, 165, 210, 0.45), -8px -8px 22px rgba(255, 255, 255, 0.95), inset 0 2px 5px rgba(255, 255, 255, 1), inset 0 -4px 8px rgba(195, 209, 245, 0.5)',
  },
  title: {
    color: '#172554',
    fontSize: '20px',
    fontWeight: 800,
    margin: '0 0 2px 0',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    color: '#475569',
    fontSize: '11.5px',
    fontWeight: 700,
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  profileBtn: {
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    color: '#2563eb',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    padding: '9px 12px',
    borderRadius: '16px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    boxShadow: '5px 6px 12px rgba(148, 166, 212, 0.4), inset 0 2px 3px #ffffff',
  },
  logoutBtn: {
    background: 'linear-gradient(145deg, #ffe4e6 0%, #fecdd3 100%)',
    color: '#be123c',
    border: '1px solid rgba(255, 255, 255, 0.7)',
    padding: '9px 12px',
    borderRadius: '16px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    boxShadow:
      '6px 8px 16px rgba(225, 150, 165, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.85), inset 0 2px 4px rgba(255, 255, 255, 0.8), inset 0 -3px 6px rgba(244, 63, 94, 0.2)',
  },
  navigationTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '18px',
    background: '#e3eaf8',
    padding: '7px',
    borderRadius: '26px',
    border: '1px solid rgba(255, 255, 255, 0.7)',
    boxShadow:
      'inset 5px 5px 10px rgba(158, 175, 214, 0.55), inset -5px -5px 10px rgba(255, 255, 255, 0.9), 8px 10px 24px rgba(145, 165, 210, 0.3)',
  },
  navTab: {
    flex: 1,
    padding: '11px 6px',
    background: 'transparent',
    border: 'none',
    color: '#1e293b',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
  },
  navTabActive: {
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    boxShadow:
      '0 8px 18px rgba(37, 99, 235, 0.4), inset 0 3px 5px rgba(255, 255, 255, 0.45), inset 0 -3px 6px rgba(29, 78, 216, 0.65)',
  },
  catalogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    padding: '0 4px',
  },
  sectionTitle: {
    color: '#172554',
    fontSize: '20px',
    lineHeight: '1.2',
    margin: 0,
    fontWeight: 800,
  },
  quickScanBtn: {
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    color: '#2563eb',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    padding: '11px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '12.5px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    boxShadow:
      '8px 10px 20px rgba(148, 166, 212, 0.42), -5px -5px 14px rgba(255, 255, 255, 0.95), inset 0 2px 4px #ffffff, inset 0 -3px 5px rgba(199, 210, 245, 0.45)',
  },
  semaforoSummaryBar: {
    display: 'flex',
    gap: '6px',
    marginBottom: '16px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  semaforoFilterChip: {
    padding: '7px 11px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    background: '#ffffff',
    color: '#334155',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    whiteSpace: 'nowrap',
    boxShadow: '4px 4px 10px rgba(148, 166, 212, 0.35)',
  },
  semaforoFilterChipActive: {
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
  },
  miniDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  listContainer: {
    flex: 1,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '36px 20px',
    background: 'linear-gradient(145deg, #f8faff 0%, #edf2ff 100%)',
    borderRadius: '30px',
    border: '1.5px solid rgba(255, 255, 255, 0.85)',
    boxShadow: '14px 16px 32px rgba(145, 165, 210, 0.4), -8px -8px 20px rgba(255, 255, 255, 0.95)',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    background: 'linear-gradient(145deg, #f8faff 0%, #edf2ff 100%)',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '32px',
    padding: '20px 18px',
    color: '#1e293b',
    boxShadow:
      '16px 18px 36px rgba(142, 162, 210, 0.48), -10px -10px 24px rgba(255, 255, 255, 0.95), inset 0 3px 5px rgba(255, 255, 255, 1), inset 0 -4px 8px rgba(195, 209, 245, 0.45)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    gap: '8px',
  },
  deviceTypeWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  deviceIconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deviceTypeTitle: {
    fontWeight: 800,
    color: '#172554',
    fontSize: '18px',
    textTransform: 'capitalize',
  },
  cardSemaforoPill: {
    fontSize: '10.5px',
    fontWeight: 800,
    padding: '5px 11px',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    boxShadow: '3px 4px 10px rgba(148, 166, 212, 0.35), inset 0 1px 2px #ffffff',
  },
  specsRecessedBox: {
    background: '#e4ebf8',
    borderRadius: '22px',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
    boxShadow: 'inset 5px 5px 10px rgba(160, 176, 212, 0.55), inset -5px -5px 10px rgba(255, 255, 255, 0.9)',
  },
  specRow: {
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: '12.5px',
    lineHeight: '1.35',
  },
  specLabel: {
    color: '#475569',
    width: '56px',
    fontWeight: 600,
    flexShrink: 0,
  },
  specVal: {
    color: '#172554',
    fontWeight: 700,
    flex: 1,
  },
  qrExpandedCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'linear-gradient(145deg, #ffffff 0%, #f1f5ff 100%)',
    padding: '16px',
    borderRadius: '22px',
    marginBottom: '16px',
    boxShadow: '8px 8px 18px rgba(155, 172, 212, 0.38), -4px -4px 12px rgba(255, 255, 255, 0.95), inset 0 2px 4px #ffffff',
  },
  qrWhiteFrame: {
    background: '#ffffff',
    padding: '10px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(148, 163, 209, 0.3)',
  },
  cardFooterActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    alignItems: 'stretch',
  },
  fichaPrimaryBtn: {
    padding: '10px 8px',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 800,
    lineHeight: '1.2',
    textAlign: 'center',
    boxShadow:
      '0 8px 16px rgba(37, 99, 235, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.45), inset 0 -3px 5px rgba(29, 78, 216, 0.65)',
  },
  whiteClayActionBtn: {
    padding: '10px 6px',
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    color: '#1e3a8a',
    border: '1px solid rgba(255, 255, 255, 0.85)',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
    textAlign: 'center',
    boxShadow:
      '6px 6px 14px rgba(155, 172, 212, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.95), inset 0 2px 3px #ffffff, inset 0 -2px 4px rgba(203, 213, 235, 0.45)',
  },
  cardDownloadBtn: {
    flex: 1,
    padding: '9px 10px',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    fontSize: '11.5px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 6px 14px rgba(37, 99, 235, 0.3), inset 0 2px 3px rgba(255,255,255,0.4)',
  },
  cardPrintBtn: {
    flex: 1,
    padding: '9px 10px',
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    color: '#2563eb',
    border: 'none',
    borderRadius: '14px',
    fontSize: '11.5px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '4px 4px 10px rgba(155, 172, 212, 0.4), inset 0 2px 3px #ffffff',
  },
};
