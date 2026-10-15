import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import QRCode from 'react-qr-code';
import RegisterEquipmentScreen from './RegisterEquipmentScreen';

export default function EquiposCatalog({ session, onLogout }: { session: any, onLogout: () => void }) {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [equipoAEditar, setEquipoAEditar] = useState<any>(null);
  const [verQR, setVerQR] = useState<string | null>(null);

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
    setShowForm(true);
  };

  const handleToggleForm = () => {
    if (showForm) setEquipoAEditar(null);
    setShowForm(!showForm);
  };

  useEffect(() => {
    fetchEquipos();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Panel TechCare</h2>
          <p style={styles.subtitle}>{session.user.email}</p>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn}>
          Salir
        </button>
      </div>

      <div style={styles.catalogHeader}>
        <h3 style={styles.sectionTitle}>Catálogo de Equipos</h3>
        <button 
          style={styles.toggleButton} 
          onClick={handleToggleForm}
        >
          {showForm ? 'Volver al Catálogo' : '+ Nuevo Equipo'}
        </button>
      </div>

      {showForm ? (
        <RegisterEquipmentScreen 
          session={session} 
          onEquipoAgregado={() => { fetchEquipos(); setEquipoAEditar(null); setShowForm(false); }} 
          equipoAEditar={equipoAEditar}
          onCancelEdit={() => { setEquipoAEditar(null); setShowForm(false); }}
        />
      ) : (
        <div style={styles.listContainer}>
          {loading ? (
            <p style={{ color: '#94a3b8', textAlign: 'center' }}>Cargando equipos...</p>
          ) : equipos.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: '32px' }}>📭</span>
              <p style={{ color: '#94a3b8', marginTop: '12px' }}>No hay equipos registrados aún.</p>
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
                      <span style={styles.specLabel}>Storage:</span> {equipo.almacenamiento}
                    </div>
                  </div>
                  
                  {verQR === equipo.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'white', padding: '12px', borderRadius: '8px', margin: '12px 0' }}>
                      <QRCode value={equipo.codigo_qr} size={100} />
                      <p style={{ color: 'black', fontSize: '10px', marginTop: '8px' }}>{equipo.codigo_qr}</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button onClick={() => setVerQR(verQR === equipo.id ? null : equipo.id)} style={{...styles.actionBtn, borderColor: 'rgba(167, 139, 250, 0.3)', color: '#c4b5fd'}}>
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
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '24px 20px',
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
    marginBottom: '28px',
    background: 'rgba(30, 58, 138, 0.4)',
    padding: '16px',
    borderRadius: '16px',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  },
  title: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '700',
    margin: '0 0 4px 0'
  },
  subtitle: {
    color: '#93c5fd',
    fontSize: '13px',
    margin: 0
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '8px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px'
  },
  catalogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    padding: '0 4px'
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: '18px',
    margin: 0,
    fontWeight: '600'
  },
  toggleButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    border: '1px solid #3b82f6',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.2s'
  },
  listContainer: {
    flex: 1
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    background: 'rgba(15, 23, 42, 0.4)',
    borderRadius: '16px',
    border: '1px dashed rgba(148, 163, 184, 0.3)'
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(96, 165, 250, 0.25)',
    borderRadius: '16px',
    padding: '18px',
    color: '#e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '12px',
    marginBottom: '14px'
  },
  deviceType: {
    fontWeight: '600',
    color: '#bfdbfe',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    fontSize: '15px'
  },
  serial: {
    fontSize: '12px',
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.05)',
    padding: '4px 8px',
    borderRadius: '6px'
  },
  specs: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  specItem: {
    fontSize: '13px',
    color: '#cbd5e1',
    display: 'flex'
  },
  specLabel: {
    color: '#94a3b8',
    width: '65px',
    fontWeight: '500'
  },
  actionBtn: {
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid rgba(147, 197, 253, 0.3)',
    borderRadius: '6px',
    color: '#93c5fd',
    cursor: 'pointer',
    fontSize: '12px',
    flex: 1
  }
};
