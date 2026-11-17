import React, { useState } from 'react';
import type { ChecklistItem, OrdenServicio } from '../../services/checklistService';
import { TAREAS_INFO } from '../../services/checklistService';
import { calcularProximaFecha, type CicloMeses } from '../../utils/mantenimiento';
import { obtenerDirectorioIngenieros, obtenerPerfilUsuario } from '../../services/perfilService';
import { ordenServicioBus } from '../../services/ordenServicioObserver';

interface CierreOrdenModalProps {
  items: ChecklistItem[];
  isCompleto: boolean;
  equipo?: any;
  idOrden?: string;
  onCerrarOrden: (params: {
    cicloMeses?: CicloMeses;
    diagnostico?: string;
    causaRaiz?: string;
    subsistemaAtendido?: string;
    tipoIntervencion?: 'preventiva' | 'correctiva';
    tecnicoResponsable?: string;
  }) => Promise<OrdenServicio>;
  onClose: () => void;
  onSuccess: () => void;
}

const CAUSAS_RAIZ_SUGERIDAS = [
  'Ventilador con rodamiento trabado / obstruido',
  'Thermal pad o pasta térmica degradada',
  'Fuente de poder inestable o variación de voltaje',
  'Sectores reasignados / desgaste NAND en SSD',
  'Soldadura fría o sulfatación en puerto físico',
];

export const CierreOrdenModal: React.FC<CierreOrdenModalProps> = ({
  items,
  isCompleto,
  equipo,
  idOrden,
  onCerrarOrden,
  onClose,
  onSuccess,
}) => {
  const perfilActual = obtenerPerfilUsuario();
  const directorioIngenieros = obtenerDirectorioIngenieros();

  const [ciclo, setCiclo] = useState<CicloMeses>(6);
  const [tipoIntervencion, setTipoIntervencion] = useState<'preventiva' | 'correctiva'>('preventiva');
  const [subsistema, setSubsistema] = useState('Refrigeración / Térmico');
  const [tecnico, setTecnico] = useState(perfilActual.nombreMostrar || 'Ing. Gabriel Flores');
  const [diagnostico, setDiagnostico] = useState('Mantenimiento integral preventivo realizado con éxito.');
  const [causaRaiz, setCausaRaiz] = useState('Degradación natural de compuesto térmico por ciclo operativo');
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pendientes = items.filter((it) => it.obligatorio && !it.completado);
  const proximaCalculada = calcularProximaFecha(new Date(), ciclo).toISOString().substring(0, 10);

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
        tecnicoResponsable: tecnico,
      });

      // Emitir evento al bus Observer por si el cierre fue en modo offline/local
      if (equipo) {
        await ordenServicioBus.emitirOrdenCerrada({
          idOrden: idOrden || `ord-${Date.now()}`,
          idEquipo: equipo.id || equipo.id_equipo || 'eq-local',
          numeroSerie: equipo.numero_serie,
          tipoDispositivo: equipo.tipo_dispositivo,
          codigoQr: equipo.codigo_qr,
          fechaCierre: new Date(),
          cicloMeses: ciclo,
          tipoIntervencion,
          subsistemaAtendido: subsistema,
          diagnostico,
          causaRaiz,
          tecnicoResponsable: tecnico,
        });
      }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🔒</span>
            <div>
              <h3 style={styles.title}>Cierre de Orden de Servicio</h3>
              <p style={styles.subtitle}>Programación (HU7), Semáforo (HU8) y Causa Raíz (HU9)</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} type="button">
            ✕
          </button>
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
                      <span style={{ fontWeight: 700, flex: 1 }}>{info?.titulo || p.tarea}</span>
                      <span style={styles.tagPending}>Pendiente</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button type="button" onClick={onClose} style={styles.backToChecklistBtn}>
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
                  Próxima fecha calculada ({ciclo} meses): <strong>{proximaCalculada}</strong>
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
                Ciclo para próximo mantenimiento (HU7) — Próxima fecha: {proximaCalculada}
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
                <label style={styles.label}>Ingeniero Responsable:</label>
                <select
                  value={tecnico}
                  onChange={(e) => setTecnico(e.target.value)}
                  style={styles.select}
                >
                  {directorioIngenieros.map((ing) => (
                    <option key={ing.id} value={ing.nombreMostrar}>
                      {ing.nombreMostrar}
                    </option>
                  ))}
                </select>
              </div>

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
            </div>

            <div>
              <label style={styles.label}>Subsistema Atendido:</label>
              <select
                value={subsistema}
                onChange={(e) => setSubsistema(e.target.value)}
                style={styles.select}
              >
                <option value="Refrigeración / Térmico">Refrigeración / Térmico</option>
                <option value="Almacenamiento (SSD / Disco)">Almacenamiento (SSD / Disco)</option>
                <option value="Placa Base y Conectores">Placa Base y Conectores</option>
                <option value="Fuente de poder y Batería">Fuente de poder y Batería</option>
                <option value="Pantalla y Video">Pantalla y Video</option>
                <option value="Sistema Operativo y Firmware">Sistema Operativo y Firmware</option>
              </select>
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
                placeholder="Ej. Ventilador con rodamiento trabado o pasta térmica seca"
                style={styles.input}
              />
              <div style={styles.chipsRow}>
                {CAUSAS_RAIZ_SUGERIDAS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setCausaRaiz(sug)}
                    style={styles.chipBtn}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.footer}>
              <button type="submit" disabled={guardando} style={styles.closeOrderBtn}>
                {guardando ? 'Cerrando orden...' : '🔒 Cerrar Orden y Actualizar Semáforo'}
              </button>
              <button type="button" onClick={onClose} style={styles.cancelBtn}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
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
    padding: '14px',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  modalCard: {
    background: 'linear-gradient(145deg, #f8faff 0%, #edf2ff 100%)',
    borderRadius: '32px',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    width: '100%',
    maxWidth: '430px',
    maxHeight: '92vh',
    overflowY: 'auto',
    padding: '20px 18px',
    color: '#172554',
    boxShadow: '20px 24px 48px rgba(130, 150, 200, 0.5), inset 0 3px 6px #ffffff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    borderBottom: '1.5px solid rgba(203, 213, 225, 0.65)',
    paddingBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 800,
    color: '#172554',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '11.5px',
    color: '#475569',
    fontWeight: 600,
  },
  closeBtn: {
    background: '#ffffff',
    border: 'none',
    color: '#1e293b',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '4px 4px 10px rgba(148, 166, 212, 0.45)',
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
    background: 'linear-gradient(145deg, #ffe4e6 0%, #fecdd3 100%)',
    borderRadius: '18px',
    padding: '12px',
    color: '#be123c',
  },
  successAlert: {
    display: 'flex',
    gap: '10px',
    background: 'linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%)',
    borderRadius: '18px',
    padding: '12px',
    color: '#065f46',
  },
  errorBanner: {
    background: '#ffe4e6',
    color: '#be123c',
    padding: '10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 700,
  },
  pendingSection: {
    background: '#e4ebf8',
    borderRadius: '18px',
    padding: '12px',
    boxShadow: 'inset 3px 3px 7px rgba(160, 176, 212, 0.55)',
  },
  pendingTitle: {
    margin: '0 0 8px 0',
    fontSize: '12.5px',
    color: '#172554',
    fontWeight: 800,
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
    padding: '8px 10px',
    background: '#ffffff',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#1e293b',
  },
  tagPending: {
    fontSize: '10px',
    fontWeight: 800,
    background: '#ffe4e6',
    color: '#be123c',
    padding: '3px 8px',
    borderRadius: '8px',
  },
  backToChecklistBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '18px',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#1e293b',
    display: 'block',
    marginBottom: '4px',
  },
  cycleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  cycleBtn: {
    padding: '9px 6px',
    background: '#e4ebf8',
    border: 'none',
    borderRadius: '14px',
    color: '#334155',
    fontSize: '11.5px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: 'inset 3px 3px 6px rgba(160, 176, 212, 0.5)',
  },
  cycleBtnActive: {
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    boxShadow: '0 6px 14px rgba(37, 99, 235, 0.35)',
  },
  row: {
    display: 'flex',
    gap: '10px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    background: '#e4ebf8',
    border: 'none',
    borderRadius: '14px',
    color: '#172554',
    fontSize: '12px',
    fontWeight: 600,
    boxShadow: 'inset 3px 3px 6px rgba(160, 176, 212, 0.55)',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    background: '#e4ebf8',
    border: 'none',
    borderRadius: '14px',
    color: '#172554',
    fontSize: '12px',
    fontWeight: 600,
    boxSizing: 'border-box',
    boxShadow: 'inset 3px 3px 6px rgba(160, 176, 212, 0.55)',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: '#e4ebf8',
    border: 'none',
    borderRadius: '14px',
    color: '#172554',
    fontSize: '12px',
    fontWeight: 600,
    boxSizing: 'border-box',
    boxShadow: 'inset 3px 3px 6px rgba(160, 176, 212, 0.55)',
  },
  chipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '6px',
  },
  chipBtn: {
    padding: '4px 8px',
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#1e40af',
    background: '#dbeafe',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '6px',
  },
  closeOrderBtn: {
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(145deg, #34d399 0%, #10b981 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '18px',
    fontSize: '13.5px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 8px 18px rgba(16, 185, 129, 0.35)',
  },
  cancelBtn: {
    width: '100%',
    padding: '10px',
    background: '#ffffff',
    color: '#475569',
    border: 'none',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
