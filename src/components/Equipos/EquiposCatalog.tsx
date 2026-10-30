import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import QRCode from 'react-qr-code';
import RegisterEquipmentScreen from './RegisterEquipmentScreen';
import QRScannerScreen from './QRScannerScreen';
import FichaTecnicaModal from './FichaTecnicaModal';
import { descargarEtiquetaQR, imprimirEtiquetaQR } from '../../utils/qrExporter';
import {
  isBiometricEnrolled,
  enrollBiometric,
  disableBiometric,
} from '../../services/biometricAuthService';

type VistaActual = 'catalogo' | 'nuevo' | 'escanear';

export default function EquiposCatalog({ session, onLogout }: { session: any, onLogout: () => void }) {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [vista, setVista] = useState<VistaActual>('catalogo');
  const [loading, setLoading] = useState(true);
  const [equipoAEditar, setEquipoAEditar] = useState<any>(null);
  const [verQR, setVerQR] = useState<string | null>(null);
  const [equipoFicha, setEquipoFicha] = useState<any | null>(null);
  const [huellaActiva, setHuellaActiva] = useState(isBiometricEnrolled());

  const fetchEquipos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('equipo')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setEquipos(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Seguro que deseas eliminar este equipo?")) {
      const { error } = await supabase.from('equipo').delete().eq('id', id);
      if (error) {
        if (error.code === '42501') alert("Error HTTP 403: Acceso denegado. No tienes permisos de administrador para eliminar.");
        else alert(error.message);
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
    const cardEl = document.querySelector(`[data-card-qr="${equipo.id}"] svg`) as SVGSVGElement | null;
    descargarEtiquetaQR({
      tipo_dispositivo: equipo.tipo_dispositivo || 'laptop',
      numero_serie: equipo.numero_serie,
      procesador: equipo.procesador,
      ram: equipo.ram,
      almacenamiento: equipo.almacenamiento,
      codigo_qr: equipo.codigo_qr
    }, cardEl);
  };

  const handleImprimirCardQR = (equipo: any) => {
    const cardEl = document.querySelector(`[data-card-qr="${equipo.id}"] svg`) as SVGSVGElement | null;
    imprimirEtiquetaQR({
      tipo_dispositivo: equipo.tipo_dispositivo || 'laptop',
      numero_serie: equipo.numero_serie,
      procesador: equipo.procesador,
      ram: equipo.ram,
      almacenamiento: equipo.almacenamiento,
      codigo_qr: equipo.codigo_qr
    }, cardEl);
  };

  useEffect(() => {
    fetchEquipos();
  }, []);

  return (
    <div style={styles.container}>
      {/* Encabezado Principal */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Panel TechCare</h2>
          <p style={styles.subtitle}>{session.user.email}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={async () => {
              if (huellaActiva) {
                if (window.confirm('¿Deseas desvincular el inicio de sesión con huella de este dispositivo?')) {
                  disableBiometric();
                  setHuellaActiva(false);
                }
              } else {
                const res = await enrollBiometric({
                  id: session.user.id,
                  email: session.user.email,
                  nombre: session.user.user_metadata?.nombre,
                });
                if (res.success) {
                  setHuellaActiva(true);
                  alert('¡Huella dactilar activada para este dispositivo! Ahora podrás iniciar sesión con 1 toque.');
                } else {
                  alert(res.error || 'No se pudo activar la huella.');
                }
              }
            }}
            style={{
              ...styles.biometricBtn,
              backgroundColor: huellaActiva ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              borderColor: huellaActiva ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
              color: huellaActiva ? '#6ee7b7' : '#94a3b8',
            }}
            title={huellaActiva ? 'Huella activada para login rápido' : 'Activar huella dactilar'}
          >
            <span>👆</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>
              {huellaActiva ? 'Huella Activa' : 'Activar Huella'}
            </span>
          </button>
          <button onClick={onLogout} style={styles.logoutBtn}>
            Salir
          </button>
        </div>
      </div>

      {/* Barra de Navegación / Pestañas de Sprint 4 */}
      <div style={styles.navigationTabs}>
        <button
          onClick={() => { setVista('catalogo'); setEquipoAEditar(null); }}
          style={{
            ...styles.navTab,
            ...(vista === 'catalogo' ? styles.navTabActive : {})
          }}
        >
          📋 Catálogo ({equipos.length})
        </button>
        <button
          onClick={() => { setVista('escanear'); setEquipoAEditar(null); }}
          style={{
            ...styles.navTab,
            ...(vista === 'escanear' ? styles.navTabActive : {})
          }}
        >
          📷 Escanear QR
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
            ...(vista === 'nuevo' ? styles.navTabActive : {})
          }}
        >
          {vista === 'nuevo' ? 'Cancelar Alta' : '+ Nuevo Equipo'}
        </button>
      </div>

      {/* VISTA 1: Escáner QR de Cámara (Sprint 4: HU3 / TC04 / TC05) */}
      {vista === 'escanear' && (
        <QRScannerScreen
          onBack={() => setVista('catalogo')}
          onEquipoEncontrado={(eq) => {
            setEquipoFicha(eq);
          }}
          equiposDisponibles={equipos}
        />
      )}

      {/* VISTA 2: Formulario de Registro o Edición */}
      {vista === 'nuevo' && (
        <RegisterEquipmentScreen 
          session={session} 
          onEquipoAgregado={() => { fetchEquipos(); setEquipoAEditar(null); setVista('catalogo'); }} 
          equipoAEditar={equipoAEditar}
          onCancelEdit={() => { setEquipoAEditar(null); setVista('catalogo'); }}
        />
      )}

      {/* VISTA 3: Catálogo General de Equipos */}
      {vista === 'catalogo' && (
        <div style={styles.listContainer}>
          <div style={styles.catalogHeader}>
            <h3 style={styles.sectionTitle}>Equipos Registrados</h3>
            <button
              onClick={() => setVista('escanear')}
              style={styles.quickScanBtn}
            >
              📷 Abrir Escáner QR
            </button>
          </div>

          {loading ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>
              Cargando equipos...
            </p>
          ) : equipos.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: '36px' }}>📭</span>
              <p style={{ color: '#ffffff', fontWeight: '600', marginTop: '12px', fontSize: '15px' }}>
                No hay equipos registrados aún
              </p>
              <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                Da de alta un equipo con "+ Nuevo Equipo" para generar su código QR o prueba el escáner.
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={() => setVista('nuevo')}
                  style={{ ...styles.actionBtn, backgroundColor: '#2563eb', color: '#fff', border: 'none' }}
                >
                  + Registrar primer equipo
                </button>
                <button
                  onClick={() => setVista('escanear')}
                  style={{ ...styles.actionBtn, backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
                >
                  📷 Probar Escáner QR
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.grid}>
              {equipos.map((equipo) => (
                <div key={equipo.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={styles.deviceType}>
                      {equipo.tipo_dispositivo === 'laptop' ? '💻' : equipo.tipo_dispositivo === 'desktop' ? '🖥️' : '🗄️'}
                      <span style={{textTransform: 'capitalize'}}>{equipo.tipo_dispositivo}</span>
                    </span>
                    <span style={styles.serial}>SN: {equipo.numero_serie}</span>
                  </div>

                  <div style={styles.specs}>
                    <div style={styles.specItem}>
                      <span style={styles.specLabel}>CPU:</span> {equipo.procesador}
                    </div>
                    <div style={styles.specItem}>
                      <span style={styles.specLabel}>RAM:</span> {equipo.ram}
                    </div>
                    <div style={styles.specItem}>
                      <span style={styles.specLabel}>Disco:</span> {equipo.almacenamiento}
                    </div>
                  </div>
                  
                  {/* Vista expandida de QR con opciones de impresión y descarga */}
                  {verQR === equipo.id && (
                    <div
                      data-card-qr={equipo.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: 'white',
                        padding: '14px',
                        borderRadius: '12px',
                        margin: '14px 0',
                        color: '#0f172a'
                      }}
                    >
                      <QRCode value={equipo.codigo_qr} size={110} />
                      <p style={{ color: '#0f172a', fontSize: '11px', fontWeight: 'bold', margin: '8px 0 2px 0' }}>
                        SN: {equipo.numero_serie}
                      </p>
                      <p style={{ color: '#64748b', fontSize: '10px', margin: '0 0 10px 0', wordBreak: 'break-all' }}>
                        {equipo.codigo_qr}
                      </p>

                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <button
                          onClick={() => handleDescargarCardQR(equipo)}
                          style={styles.cardDownloadBtn}
                        >
                          📥 Descargar QR (PNG)
                        </button>
                        <button
                          onClick={() => handleImprimirCardQR(equipo)}
                          style={styles.cardPrintBtn}
                        >
                          🖨️ Imprimir Etiqueta
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div style={styles.cardFooterActions}>
                    <button
                      onClick={() => setEquipoFicha(equipo)}
                      style={{ ...styles.actionBtn, backgroundColor: 'rgba(59, 130, 246, 0.25)', borderColor: '#3b82f6', color: '#93c5fd', fontWeight: '600' }}
                    >
                      📋 Ficha e Historial
                    </button>
                    <button
                      onClick={() => setVerQR(verQR === equipo.id ? null : equipo.id)}
                      style={{...styles.actionBtn, borderColor: 'rgba(167, 139, 250, 0.4)', color: '#c4b5fd'}}
                    >
                      {verQR === equipo.id ? 'Ocultar QR' : 'Ver QR'}
                    </button>
                    <button onClick={() => handleEdit(equipo)} style={styles.actionBtn}>
                      Editar
                    </button>
                    <button onClick={() => handleDelete(equipo.id)} style={{...styles.actionBtn, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)'}}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Ficha Técnica e Historial (TC04 / TC11) */}
      {equipoFicha && (
        <FichaTecnicaModal
          equipo={equipoFicha}
          onClose={() => setEquipoFicha(null)}
          onScanAnother={() => {
            setEquipoFicha(null);
            setVista('escanear');
          }}
          currentUserEmail={session.user.email}
        />
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    maxWidth: '560px',
    margin: '0 auto',
    padding: '16px 12px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    background: 'rgba(30, 58, 138, 0.4)',
    padding: '14px 16px',
    borderRadius: '16px',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  },
  title: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 2px 0'
  },
  subtitle: {
    color: '#93c5fd',
    fontSize: '12px',
    margin: 0
  },
  biometricBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    border: '1px solid',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '12px'
  },
  navigationTabs: {
    display: 'flex',
    gap: '6px',
    marginBottom: '16px',
    background: 'rgba(15, 23, 42, 0.7)',
    padding: '4px',
    borderRadius: '12px',
    border: '1px solid rgba(96, 165, 250, 0.2)'
  },
  navTab: {
    flex: 1,
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s',
    textAlign: 'center'
  },
  navTabActive: {
    background: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(29, 78, 216, 0.5)'
  },
  catalogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    padding: '0 4px'
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: '16px',
    margin: 0,
    fontWeight: '600'
  },
  quickScanBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    border: '1px solid #3b82f6',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '12px'
  },
  listContainer: {
    flex: 1
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '36px 20px',
    background: 'rgba(15, 23, 42, 0.45)',
    borderRadius: '16px',
    border: '1px dashed rgba(148, 163, 184, 0.3)'
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    border: '1px solid rgba(96, 165, 250, 0.25)',
    borderRadius: '16px',
    padding: '16px',
    color: '#e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.15)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '10px',
    marginBottom: '12px'
  },
  deviceType: {
    fontWeight: '600',
    color: '#bfdbfe',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    fontSize: '14px'
  },
  serial: {
    fontSize: '12px',
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.06)',
    padding: '3px 8px',
    borderRadius: '6px'
  },
  specs: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  specItem: {
    fontSize: '12px',
    color: '#cbd5e1',
    display: 'flex'
  },
  specLabel: {
    color: '#94a3b8',
    width: '60px',
    fontWeight: '500'
  },
  cardFooterActions: {
    display: 'flex',
    gap: '6px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    flexWrap: 'wrap'
  },
  actionBtn: {
    padding: '6px 10px',
    background: 'transparent',
    border: '1px solid rgba(147, 197, 253, 0.3)',
    borderRadius: '6px',
    color: '#93c5fd',
    cursor: 'pointer',
    fontSize: '11px',
    flex: 1,
    minWidth: '65px',
    textAlign: 'center'
  },
  cardDownloadBtn: {
    flex: 1,
    padding: '6px 8px',
    backgroundColor: '#1e3a8a',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cardPrintBtn: {
    flex: 1,
    padding: '6px 8px',
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
