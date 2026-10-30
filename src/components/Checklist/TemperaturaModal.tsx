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

  // Evaluación en tiempo real
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
    normal: '#10b981',
    advertencia: '#f59e0b',
    critica: '#ef4444',
  }[evaluacion.alerta];

  const alertaTexto = {
    normal: '✓ Temperaturas óptimas dentro de los límites de diseño.',
    advertencia: '⚠️ Temperaturas algo elevadas (> 76°C). Verificar flujo de aire.',
    critica: '🚨 TEMPERATURA CRÍTICA (> 88°C). Riesgo de thermal throttling.',
  }[evaluacion.alerta];

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🌡️</span>
            <div>
              <h3 style={styles.title}>Medición de Temperaturas</h3>
              <p style={styles.subtitle}>Sprint 6 · Tarea 2 (HU5 - Pre vs Post Servicio)</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          {/* Presets rápidos de prueba */}
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

          {/* Comparador Térmico Visual */}
          <div style={styles.comparisonCard}>
            <div style={styles.tempColumn}>
              <span style={styles.columnBadgePre}>PRE-SERVICIO (Inicial)</span>
              <div style={styles.inputGroup}>
                <label style={styles.label}>CPU (°C)</label>
                <input
                  type="number"
                  min="20"
                  max="120"
                  value={tempCpuPre}
                  onChange={(e) => setTempCpuPre(Number(e.target.value))}
                  required
                  style={styles.tempInput}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>GPU (°C)</label>
                <input
                  type="number"
                  min="20"
                  max="120"
                  value={tempGpuPre}
                  onChange={(e) => setTempGpuPre(Number(e.target.value))}
                  style={styles.tempInput}
                />
              </div>
            </div>

            <div style={styles.arrowWrap}>
              <span style={{ fontSize: '20px' }}>➔</span>
              <span style={styles.deltaLabel}>Delta:</span>
              <span
                style={{
                  ...styles.deltaBadge,
                  backgroundColor: evaluacion.deltaCpu <= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: evaluacion.deltaCpu <= 0 ? '#10b981' : '#ef4444',
                }}
              >
                {evaluacion.deltaCpu > 0 ? `+${evaluacion.deltaCpu}` : evaluacion.deltaCpu}°C
              </span>
            </div>

            <div style={styles.tempColumn}>
              <span style={styles.columnBadgePost}>POST-SERVICIO (Final)</span>
              <div style={styles.inputGroup}>
                <label style={styles.label}>CPU (°C)</label>
                <input
                  type="number"
                  min="20"
                  max="120"
                  value={tempCpuPost}
                  onChange={(e) => setTempCpuPost(Number(e.target.value))}
                  required
                  style={{ ...styles.tempInput, borderColor: alertaColor }}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>GPU (°C)</label>
                <input
                  type="number"
                  min="20"
                  max="120"
                  value={tempGpuPost}
                  onChange={(e) => setTempGpuPost(Number(e.target.value))}
                  style={{ ...styles.tempInput, borderColor: alertaColor }}
                />
              </div>
            </div>
          </div>

          {/* Banner de Estado Térmico */}
          <div
            style={{
              ...styles.statusBanner,
              borderColor: alertaColor,
              backgroundColor: `${alertaColor}1a`,
              color: alertaColor,
            }}
          >
            <span style={{ fontSize: '18px' }}>
              {evaluacion.alerta === 'normal' ? '❄️' : evaluacion.alerta === 'advertencia' ? '⚠️' : '🔥'}
            </span>
            <div style={{ flex: 1, fontSize: '12px' }}>
              <strong>Estado Térmico: {evaluacion.alerta.toUpperCase()}</strong>
              <p style={{ margin: '2px 0 0 0' }}>{alertaTexto}</p>
            </div>
          </div>

          <div style={styles.footer}>
            <button
              type="submit"
              disabled={guardando}
              style={styles.saveBtn}
            >
              {guardando ? 'Guardando...' : '💾 Guardar Medición y Validar'}
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
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  presetsBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px 10px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
  },
  presetsLabel: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  presetBtn: {
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  comparisonCard: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '10px',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '14px',
    border: '1px solid #334155',
  },
  tempColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  columnBadgePre: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#fbbf24',
    textAlign: 'center',
  },
  columnBadgePost: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#38bdf8',
    textAlign: 'center',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  label: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  tempInput: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#0f172a',
    border: '1.5px solid #334155',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 700,
    textAlign: 'center',
    boxSizing: 'border-box',
    outline: 'none',
  },
  arrowWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '0 4px',
  },
  deltaLabel: {
    fontSize: '10px',
    color: '#94a3b8',
  },
  deltaBadge: {
    fontSize: '12px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '6px',
  },
  statusBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid',
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '6px',
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

export default TemperaturaModal;
