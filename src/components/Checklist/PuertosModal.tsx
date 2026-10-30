import React, { useState } from 'react';
import type { PuertosDetalle, EstadoPuerto } from '../../services/checklistService';

interface PuertosModalProps {
  initialData?: PuertosDetalle;
  onSave: (data: PuertosDetalle) => Promise<void>;
  onClose: () => void;
}

const PUERTOS_LIST = [
  { id: 'usb_a', label: 'Puertos USB-A (3.0 / 2.0)', icon: '🔌' },
  { id: 'usb_c', label: 'Puerto USB-C / Thunderbolt', icon: '⚡' },
  { id: 'hdmi', label: 'Salida HDMI / DisplayPort', icon: '🖥️' },
  { id: 'audio', label: 'Jack de Audio 3.5mm', icon: '🎧' },
  { id: 'rj45', label: 'Puerto Ethernet RJ45', icon: '🌐' },
] as const;

export const PuertosModal: React.FC<PuertosModalProps> = ({
  initialData,
  onSave,
  onClose,
}) => {
  const [usbA, setUsbA] = useState<EstadoPuerto>(initialData?.usb_a || 'ok');
  const [usbC, setUsbC] = useState<EstadoPuerto>(initialData?.usb_c || 'ok');
  const [hdmi, setHdmi] = useState<EstadoPuerto>(initialData?.hdmi || 'ok');
  const [audio, setAudio] = useState<EstadoPuerto>(initialData?.audio || 'ok');
  const [rj45, setRj45] = useState<EstadoPuerto>(initialData?.rj45 || 'ok');
  const [observaciones, setObservaciones] = useState(initialData?.observaciones || '');
  const [guardando, setGuardando] = useState(false);

  const getValorPuerto = (id: string): EstadoPuerto => {
    switch (id) {
      case 'usb_a': return usbA;
      case 'usb_c': return usbC;
      case 'hdmi': return hdmi;
      case 'audio': return audio;
      case 'rj45': return rj45;
      default: return 'ok';
    }
  };

  const setValorPuerto = (id: string, val: EstadoPuerto) => {
    switch (id) {
      case 'usb_a': setUsbA(val); break;
      case 'usb_c': setUsbC(val); break;
      case 'hdmi': setHdmi(val); break;
      case 'audio': setAudio(val); break;
      case 'rj45': setRj45(val); break;
    }
  };

  const handleMarcarTodosOk = () => {
    setUsbA('ok');
    setUsbC('ok');
    setHdmi('ok');
    setAudio('ok');
    setRj45('ok');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    await onSave({
      usb_a: usbA,
      usb_c: usbC,
      hdmi,
      audio,
      rj45,
      observaciones,
    });
    setGuardando(false);
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🔌</span>
            <div>
              <h3 style={styles.title}>Inspección de Puertos Físicos</h3>
              <p style={styles.subtitle}>Sprint 6 · Tarea 1 (HU5 - Módulo 4)</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          <div style={styles.quickBar}>
            <span style={styles.quickBarText}>Acción rápida:</span>
            <button
              type="button"
              onClick={handleMarcarTodosOk}
              style={styles.quickActionBtn}
            >
              ✓ Marcar todos Operativos (OK)
            </button>
          </div>

          <div style={styles.portList}>
            {PUERTOS_LIST.map((p) => {
              const currentVal = getValorPuerto(p.id);
              return (
                <div key={p.id} style={styles.portRow}>
                  <div style={styles.portLabelWrap}>
                    <span style={{ fontSize: '18px' }}>{p.icon}</span>
                    <span style={styles.portLabel}>{p.label}</span>
                  </div>

                  <div style={styles.selectorGroup}>
                    {(['ok', 'falla', 'danado', 'no_aplica'] as EstadoPuerto[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setValorPuerto(p.id, st)}
                        style={{
                          ...styles.statusBtn,
                          ...(currentVal === st ? styles.statusBtnSelected[st] : {}),
                        }}
                      >
                        {st === 'ok' && '✓ OK'}
                        {st === 'falla' && '⚠️ Falla'}
                        {st === 'danado' && '❌ Dañado'}
                        {st === 'no_aplica' && 'N/A'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '14px' }}>
            <label style={styles.label}>Observaciones o detalles de puertos:</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. Puerto USB lateral derecho presenta falso contacto..."
              rows={2}
              style={styles.textarea}
            />
          </div>

          <div style={styles.footer}>
            <button
              type="submit"
              disabled={guardando}
              style={styles.saveBtn}
            >
              {guardando ? 'Guardando...' : '💾 Guardar y Validar Tarea'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, any> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '16px',
    backdropFilter: 'blur(4px)',
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: '16px',
    border: '1px solid #1e293b',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '20px',
    color: '#ffffff',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: '#f8fafc',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '11px',
    color: '#38bdf8',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  quickBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
  },
  quickBarText: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  quickActionBtn: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  portList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  portRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  portLabelWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  portLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  selectorGroup: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
  },
  statusBtn: {
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '6px 2px',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'center',
  },
  statusBtnSelected: {
    ok: {
      backgroundColor: '#10b981',
      borderColor: '#10b981',
      color: '#ffffff',
      fontWeight: 700,
    },
    falla: {
      backgroundColor: '#f59e0b',
      borderColor: '#f59e0b',
      color: '#000000',
      fontWeight: 700,
    },
    danado: {
      backgroundColor: '#ef4444',
      borderColor: '#ef4444',
      color: '#ffffff',
      fontWeight: 700,
    },
    no_aplica: {
      backgroundColor: '#475569',
      borderColor: '#475569',
      color: '#ffffff',
      fontWeight: 700,
    },
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#94a3b8',
    display: 'block',
    marginBottom: '4px',
  },
  textarea: {
    width: '100%',
    padding: '8px 10px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '12px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '10px',
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '10px',
    fontSize: '13px',
    cursor: 'pointer',
  },
};

export default PuertosModal;
