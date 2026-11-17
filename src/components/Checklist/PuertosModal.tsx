import React, { useState } from 'react';
import type { PuertosDetalle, EstadoPuerto } from '../../services/checklistService';

interface PuertosModalProps {
  initialData?: PuertosDetalle;
  onSave: (data: PuertosDetalle) => Promise<void>;
  onClose: () => void;
}

const PUERTOS_LIST = [
  { id: 'usb_a', label: 'Puertos USB-A (3.0 / 2.0)' },
  { id: 'usb_c', label: 'Puerto USB-C / Thunderbolt' },
  { id: 'hdmi', label: 'Salida HDMI / DisplayPort' },
  { id: 'audio', label: 'Jack de Audio 3.5mm' },
  { id: 'rj45', label: 'Puerto Ethernet RJ45' },
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
          <div>
            <h3 style={styles.title}>Inspección de Puertos Físicos</h3>
            <p style={styles.subtitle}>Verificación de conectividad física</p>
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
              Marcar todos Operativos (OK)
            </button>
          </div>

          <div style={styles.portList}>
            {PUERTOS_LIST.map((p) => {
              const currentVal = getValorPuerto(p.id);
              return (
                <div key={p.id} style={styles.portRow}>
                  <div style={styles.portLabelWrap}>
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
                        {st === 'ok' && 'OK'}
                        {st === 'falla' && 'Falla'}
                        {st === 'danado' && 'Dañado'}
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
              {guardando ? 'Guardando...' : 'Guardar y Validar Tarea'}
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
    backgroundColor: 'rgba(180, 196, 238, 0.72)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '16px',
    backdropFilter: 'blur(8px)',
  },
  modalCard: {
    background: 'linear-gradient(145deg, #f8faff 0%, #edf2ff 100%)',
    borderRadius: '28px',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    width: '100%',
    maxWidth: '460px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '22px 20px',
    color: '#172554',
    boxShadow: '18px 22px 42px rgba(130, 150, 200, 0.45), inset 0 3px 5px #ffffff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid #cbd5e1',
    paddingBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 800,
    color: '#172554',
  },
  subtitle: {
    margin: '3px 0 0 0',
    fontSize: '12px',
    color: '#475569',
  },
  closeBtn: {
    background: '#ffffff',
    border: 'none',
    color: '#1e293b',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 800,
    boxShadow: '3px 3px 8px rgba(148, 166, 212, 0.35)',
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
    background: '#e2e8f0',
    padding: '8px 12px',
    borderRadius: '12px',
  },
  quickBarText: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#475569',
  },
  quickActionBtn: {
    background: '#ffffff',
    border: 'none',
    color: '#059669',
    fontSize: '11.5px',
    fontWeight: 700,
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
  },
  portList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  portRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#ffffff',
    padding: '10px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    boxShadow: '4px 4px 10px rgba(148, 166, 212, 0.25)',
  },
  portLabelWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  portLabel: {
    fontSize: '12.5px',
    fontWeight: 700,
    color: '#172554',
  },
  selectorGroup: {
    display: 'flex',
    gap: '4px',
  },
  statusBtn: {
    padding: '5px 8px',
    fontSize: '10.5px',
    fontWeight: 700,
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    color: '#64748b',
    cursor: 'pointer',
  },
  statusBtnSelected: {
    ok: {
      background: '#dcfce7',
      color: '#065f46',
      borderColor: '#16a34a',
      fontWeight: 800,
    },
    falla: {
      background: '#fef9c3',
      color: '#854d0e',
      borderColor: '#ca8a04',
      fontWeight: 800,
    },
    danado: {
      background: '#fee2e2',
      color: '#991b1b',
      borderColor: '#dc2626',
      fontWeight: 800,
    },
    no_aplica: {
      background: '#f1f5f9',
      color: '#475569',
      borderColor: '#94a3b8',
      fontWeight: 800,
    },
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: '#172554',
    marginBottom: '6px',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#e3eaf8',
    color: '#172554',
    fontSize: '12px',
    fontWeight: 500,
    outline: 'none',
    boxShadow: 'inset 2px 2px 6px rgba(160, 176, 212, 0.45)',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  footer: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  saveBtn: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: '14px',
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
  },
  cancelBtn: {
    padding: '12px 18px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '14px',
    color: '#475569',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export default PuertosModal;
