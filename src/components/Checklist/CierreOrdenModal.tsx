import React, { useState } from 'react';
import type { ChecklistItem, OrdenServicio } from '../../services/checklistService';
import { TAREAS_INFO } from '../../services/checklistService';
import type { CicloMeses } from '../../utils/mantenimiento';

interface CierreOrdenModalProps {
  items: ChecklistItem[];
  isCompleto: boolean;
  onCerrarOrden: (params: {
    cicloMeses?: CicloMeses;
    diagnostico?: string;
    causaRaiz?: string;
    subsistemaAtendido?: string;
    tipoIntervencion?: 'preventiva' | 'correctiva';
  }) => Promise<OrdenServicio>;
  onClose: () => void;
  onSuccess: () => void;
}

export const CierreOrdenModal: React.FC<CierreOrdenModalProps> = ({
  items,
  isCompleto,
  onCerrarOrden,
  onClose,
  onSuccess,
}) => {
  const [ciclo, setCiclo] = useState<CicloMeses>(6);
  const [tipoIntervencion, setTipoIntervencion] = useState<'preventiva' | 'correctiva'>('preventiva');
  const [subsistema, setSubsistema] = useState('Refrigeración / Térmico');
  const [diagnostico, setDiagnostico] = useState('Mantenimiento integral preventivo realizado con éxito.');
  const [causaRaiz, setCausaRaiz] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pendientes = items.filter((it) => it.obligatorio && !it.completado);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCompleto) {
      setErrorMsg('No es posible cerrar la orden: faltan tareas obligatorias por completar.');
      return;
    }

    setGuardando(true);
    setErrorMsg(null);
    try {
      await onCerrarOrden({
        cicloMeses: ciclo,
        tipoIntervencion,
        subsistemaAtendido: subsistema,
        diagnostico,
        causaRaiz,
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cerrar la orden de servicio.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🔒</span>
            <div>
              <h3 style={styles.title}>Cierre de Orden de Servicio</h3>
              <p style={styles.subtitle}>Sprint 6 · Validación HU4 / HU5 (TC06) & HU7 / HU8</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} type="button">✕</button>
        </div>

        {/* REGLA TC06 / HU4/HU5: Si el checklist está incompleto, bloquear el cierre */}
        {!isCompleto ? (
          <div style={styles.blockedBody}>
            <div style={styles.errorAlert}>
              <span style={{ fontSize: '20px' }}>⛔</span>
              <div>
                <strong style={{ fontSize: '13px', display: 'block' }}>
                  Cierre de orden bloqueado (TC06)
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                  Para garantizar la calidad del servicio, el sistema no permite cerrar la
                  orden hasta que todas las verificaciones obligatorias estén completadas.
                </p>
              </div>
            </div>

            <div style={styles.pendingSection}>
              <h4 style={styles.pendingTitle}>
                Verificaciones pendientes ({pendientes.length}):
              </h4>
              <div style={styles.pendingList}>
                {pendientes.map((p) => {
                  const info = TAREAS_INFO[p.tarea];
                  return (
                    <div key={p.id_item} style={styles.pendingItem}>
                      <span>{info?.icon || '⚠️'}</span>
                      <span style={{ fontWeight: 600 }}>{info?.titulo || p.tarea}</span>
                      <span style={styles.tagPending}>Pendiente</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={styles.backToChecklistBtn}
            >
              ➔ Volver al checklist y completar tareas
            </button>
          </div>
        ) : (
          /* FORMULARIO DE CIERRE CUANDO ESTÁ 100% COMPLETO */
          <form onSubmit={handleSubmit} style={styles.body}>
            <div style={styles.successAlert}>
              <span style={{ fontSize: '20px' }}>🎉</span>
              <div>
                <strong style={{ fontSize: '13px', display: 'block' }}>
                  ¡Checklist 100% Completo!
                </strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
                  Todas las verificaciones técnicas (físicas, térmicas, puertos y SMART) han sido validadas.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div style={styles.errorBanner}>
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Ciclo para próximo mantenimiento (HU7):
              </label>
              <div style={styles.cycleGrid}>
                {([3, 6, 12] as CicloMeses[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCiclo(c)}
                    style={{
                      ...styles.cycleBtn,
                      ...(ciclo === c ? styles.cycleBtnActive : {}),
                    }}
                  >
                    {c} meses {c === 6 ? '(Estándar)' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Tipo de Intervención:</label>
                <select
                  value={tipoIntervencion}
                  onChange={(e) => setTipoIntervencion(e.target.value as any)}
                  style={styles.select}
                >
                  <option value="preventiva">Preventiva (Programada)</option>
                  <option value="correctiva">Correctiva (Por falla)</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>Subsistema Atendido:</label>
                <select
                  value={subsistema}
                  onChange={(e) => setSubsistema(e.target.value)}
                  style={styles.select}
                >
                  <option value="Refrigeración / Térmico">Refrigeración / Térmico</option>
                  <option value="Almacenamiento (SSD / Disco)">Almacenamiento (SSD / Disco)</option>
                  <option value="Placa / Puertos">Placa / Puertos</option>
                  <option value="Alimentación / Batería">Alimentación / Batería</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div>
              <label style={styles.label}>Diagnóstico y Dictamen Final:</label>
              <textarea
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                rows={2}
                required
                style={styles.textarea}
              />
            </div>

            <div>
              <label style={styles.label}>Causa Raíz Identificada (HU9):</label>
              <input
                type="text"
                value={causaRaiz}
                onChange={(e) => setCausaRaiz(e.target.value)}
                placeholder="Ej. Acumulación de polvo en rodamiento o pasta térmica seca"
                style={styles.input}
              />
            </div>

            <div style={styles.footer}>
              <button
                type="submit"
                disabled={guardando}
                style={styles.closeOrderBtn}
              >
                {guardando ? 'Cerrando orden...' : '🔒 Cerrar Orden y Actualizar Semáforo'}
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
        )}
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
    maxWidth: '500px',
    maxHeight: '92vh',
    overflowY: 'auto',
    padding: '20px',
    color: '#ffffff',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
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
  blockedBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  errorAlert: {
    display: 'flex',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid #ef4444',
    borderRadius: '10px',
    color: '#fca5a5',
  },
  successAlert: {
    display: 'flex',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid #10b981',
    borderRadius: '10px',
    color: '#6ee7b7',
  },
  errorBanner: {
    padding: '8px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '12px',
  },
  pendingSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  pendingTitle: {
    margin: 0,
    fontSize: '13px',
    color: '#e2e8f0',
  },
  pendingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  pendingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    fontSize: '12px',
  },
  tagPending: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
  },
  backToChecklistBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '6px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 500,
    display: 'block',
    marginBottom: '4px',
  },
  cycleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  cycleBtn: {
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '8px 4px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cycleBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#38bdf8',
    color: '#ffffff',
  },
  row: {
    display: 'flex',
    gap: '10px',
  },
  select: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '12px',
    outline: 'none',
  },
  input: {
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
    marginTop: '8px',
  },
  closeOrderBtn: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
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

export default CierreOrdenModal;
