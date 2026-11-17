import React, { useState } from 'react';
import {
  type TemperaturaDetalle,
  evaluarTemperatura,
} from '../../services/checklistService';

interface TemperaturaModalProps {
  initialData?: TemperaturaDetalle | null;
  onSave: (data: TemperaturaDetalle) => Promise<void>;
  onClose: () => void;
}

export const TemperaturaModal: React.FC<TemperaturaModalProps> = ({
  initialData,
  onSave,
  onClose,
}) => {
  const [tempCpuPre, setTempCpuPre] = useState<number>(initialData?.tempCpuPre || 82);
  const [tempGpuPre, setTempGpuPre] = useState<number>(initialData?.tempGpuPre || 78);
  const [tempCpuPost, setTempCpuPost] = useState<number>(initialData?.tempCpuPost || 61);
  const [tempGpuPost, setTempGpuPost] = useState<number>(initialData?.tempGpuPost || 58);
  const [guardando, setGuardando] = useState(false);

  const evaluacion = evaluarTemperatura(
    Number(tempCpuPre),
    Number(tempCpuPost),
    Number(tempGpuPre),
    Number(tempGpuPost)
  );

  const aplicarPreset = (cpuPre: number, gpuPre: number, cpuPost: number, gpuPost: number) => {
    setTempCpuPre(cpuPre);
    setTempGpuPre(gpuPre);
    setTempCpuPost(cpuPost);
    setTempGpuPost(gpuPost);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    await onSave(evaluacion);
    setGuardando(false);
    onClose();
  };

  const alertaColor = {
    normal: '#16a34a',
    advertencia: '#d97706',
    critica: '#dc2626',
  }[evaluacion.alerta];

  const alertaTexto = {
    normal: 'Temperaturas óptimas dentro de los límites de diseño.',
    advertencia: 'Temperaturas algo elevadas (> 76°C). Verificar flujo de aire.',
    critica: 'TEMPERATURA CRÍTICA (> 88°C). Riesgo de estrangulamiento térmico.',
  }[evaluacion.alerta];

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>Medición de Temperaturas</h3>
            <p style={styles.subtitle}>Comparativa térmica Pre vs Post Servicio</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          {/* Presets rápidos */}
          <div style={styles.presetsBar}>
            <span style={styles.presetsLabel}>Valores rápidos:</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => aplicarPreset(84, 80, 62, 59)}
                style={styles.presetBtn}
              >
                Carga Alta (84°→62°)
              </button>
              <button
                type="button"
                onClick={() => aplicarPreset(60, 56, 44, 42)}
                style={styles.presetBtn}
              >
                Reposo (60°→44°)
              </button>
              <button
                type="button"
                onClick={() => aplicarPreset(95, 91, 68, 65)}
                style={styles.presetBtn}
              >
                Sobrecalentado (95°→68°)
              </button>
            </div>
          </div>

          {/* Grilla de Entradas Pre vs Post */}
          <div style={styles.inputsGrid}>
            <div style={styles.columnBox}>
              <h4 style={styles.columnTitle}>Pre-Servicio (Inicial)</h4>
              <div style={styles.field}>
                <label style={styles.label}>CPU Pre (°C):</label>
                <input
                  type="number"
                  min="20"
                  max="115"
                  value={tempCpuPre}
                  onChange={(e) => setTempCpuPre(Number(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>GPU Pre (°C):</label>
                <input
                  type="number"
                  min="20"
                  max="115"
                  value={tempGpuPre}
                  onChange={(e) => setTempGpuPre(Number(e.target.value))}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.columnBox}>
              <h4 style={styles.columnTitle}>Post-Servicio (Final)</h4>
              <div style={styles.field}>
                <label style={styles.label}>CPU Post (°C):</label>
                <input
                  type="number"
                  min="20"
                  max="115"
                  value={tempCpuPost}
                  onChange={(e) => setTempCpuPost(Number(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>GPU Post (°C):</label>
                <input
                  type="number"
                  min="20"
                  max="115"
                  value={tempGpuPost}
                  onChange={(e) => setTempGpuPost(Number(e.target.value))}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Tarjeta de Delta y Evaluación */}
          <div style={{ ...styles.evalCard, borderColor: alertaColor }}>
            <div style={styles.evalRow}>
              <div>
                <span style={styles.evalLabel}>Delta Térmico CPU:</span>
                <strong style={{ ...styles.evalVal, color: evaluacion.deltaCpu >= 10 ? '#16a34a' : '#d97706' }}>
                  {evaluacion.deltaCpu > 0 ? `-${evaluacion.deltaCpu}°C` : `${evaluacion.deltaCpu}°C`}
                </strong>
              </div>
              <div>
                <span style={styles.evalLabel}>Delta Térmico GPU:</span>
                <strong style={{ ...styles.evalVal, color: (evaluacion.deltaGpu ?? 0) >= 10 ? '#16a34a' : '#d97706' }}>
                  {typeof evaluacion.deltaGpu === 'number'
                    ? evaluacion.deltaGpu > 0
                      ? `-${evaluacion.deltaGpu}°C`
                      : `${evaluacion.deltaGpu}°C`
                    : 'N/A'}
                </strong>
              </div>
            </div>
            <p style={{ ...styles.evalText, color: alertaColor }}>{alertaTexto}</p>
          </div>

          <div style={styles.footer}>
            <button
              type="submit"
              disabled={guardando}
              style={styles.saveBtn}
            >
              {guardando ? 'Guardando...' : 'Guardar Temperaturas'}
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
  presetsBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    background: '#e2e8f0',
    padding: '8px 12px',
    borderRadius: '12px',
  },
  presetsLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#475569',
  },
  presetBtn: {
    background: '#ffffff',
    border: 'none',
    color: '#2563eb',
    fontSize: '11px',
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
  },
  inputsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  columnBox: {
    background: '#ffffff',
    padding: '12px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    boxShadow: '4px 4px 10px rgba(148, 166, 212, 0.25)',
  },
  columnTitle: {
    margin: '0 0 10px 0',
    fontSize: '12px',
    fontWeight: 800,
    color: '#172554',
  },
  field: {
    marginBottom: '8px',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: '#475569',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#e3eaf8',
    color: '#172554',
    fontSize: '13px',
    fontWeight: 700,
    outline: 'none',
    boxShadow: 'inset 2px 2px 5px rgba(160, 176, 212, 0.45)',
    boxSizing: 'border-box',
  },
  evalCard: {
    background: '#ffffff',
    padding: '12px',
    borderRadius: '14px',
    border: '1.5px solid #cbd5e1',
    boxShadow: '4px 4px 10px rgba(148, 166, 212, 0.25)',
  },
  evalRow: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '6px',
  },
  evalLabel: {
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#475569',
    display: 'block',
  },
  evalVal: {
    fontSize: '15px',
    fontWeight: 800,
  },
  evalText: {
    margin: '6px 0 0 0',
    fontSize: '11.5px',
    fontWeight: 700,
    textAlign: 'center',
  },
  footer: {
    display: 'flex',
    gap: '10px',
    marginTop: '6px',
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

export default TemperaturaModal;
