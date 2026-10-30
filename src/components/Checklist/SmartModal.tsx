import React, { useState } from 'react';
import {
  type SmartDetalle,
  evaluarSmart,
} from '../../services/checklistService';

interface SmartModalProps {
  initialData?: SmartDetalle | null;
  onSave: (data: SmartDetalle) => Promise<void>;
  onClose: () => void;
}

export const SmartModal: React.FC<SmartModalProps> = ({
  initialData,
  onSave,
  onClose,
}) => {
  const [salud, setSalud] = useState<number>(initialData?.saludPorcentaje ?? 98);
  const [horas, setHoras] = useState<number>(initialData?.horasEncendido ?? 2100);
  const [sectores, setSectores] = useState<number>(initialData?.sectoresReasignados ?? 0);
  const [tempDisco, setTempDisco] = useState<number>(initialData?.temperaturaDisco ?? 36);
  const [guardando, setGuardando] = useState(false);

  // Evaluación automática en vivo
  const evaluacion = evaluarSmart(
    Number(salud),
    Number(horas),
    Number(sectores),
    Number(tempDisco)
  );

  const aplicarPreset = (s: number, h: number, sec: number, t: number) => {
    setSalud(s);
    setHoras(h);
    setSectores(sec);
    setTempDisco(t);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    await onSave(evaluacion);
    setGuardando(false);
    onClose();
  };

  const estadoColor = {
    bueno: '#10b981',
    regular: '#38bdf8',
    riesgo: '#f59e0b',
    critico: '#ef4444',
  }[evaluacion.estado];

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>💾</span>
            <div>
              <h3 style={styles.title}>Diagnóstico Rápido S.M.A.R.T.</h3>
              <p style={styles.subtitle}>Sprint 6 · Tarea 3 (HU5 - Salud del Disco/SSD)</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          {/* Barra de Presets */}
          <div style={styles.presetsBar}>
            <span style={styles.presetsLabel}>Simular estado:</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => aplicarPreset(100, 1200, 0, 34)}
                style={styles.presetBtn}
              >
                SSD Óptimo (100%)
              </button>
              <button
                type="button"
                onClick={() => aplicarPreset(65, 14000, 8, 42)}
                style={styles.presetBtn}
              >
                En Riesgo (65%)
              </button>
              <button
                type="button"
                onClick={() => aplicarPreset(22, 38000, 140, 56)}
                style={styles.presetBtn}
              >
                Crítico (22%)
              </button>
            </div>
          </div>

          {/* Medidor visual de salud */}
          <div style={styles.healthCard}>
            <div style={styles.healthHeader}>
              <span style={styles.healthLabel}>Salud de la Unidad</span>
              <span style={{ ...styles.healthPercent, color: estadoColor }}>
                {salud}%
              </span>
            </div>

            <div style={styles.progressBarTrack}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${salud}%`,
                  backgroundColor: estadoColor,
                }}
              />
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={salud}
              onChange={(e) => setSalud(Number(e.target.value))}
              style={styles.slider}
            />
          </div>

          {/* Grid de parámetros SMART */}
          <div style={styles.paramsGrid}>
            <div style={styles.paramItem}>
              <label style={styles.label}>Horas de uso (POH)</label>
              <input
                type="number"
                min="0"
                value={horas}
                onChange={(e) => setHoras(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={styles.paramItem}>
              <label style={styles.label}>Sectores Reasignados</label>
              <input
                type="number"
                min="0"
                value={sectores}
                onChange={(e) => setSectores(Number(e.target.value))}
                style={{
                  ...styles.input,
                  borderColor: sectores > 0 ? '#ef4444' : '#334155',
                }}
              />
            </div>
            <div style={styles.paramItem}>
              <label style={styles.label}>Temperatura (°C)</label>
              <input
                type="number"
                min="10"
                max="90"
                value={tempDisco}
                onChange={(e) => setTempDisco(Number(e.target.value))}
                style={styles.input}
              />
            </div>
          </div>

          {/* Dictamen / Recomendación Técnica Automática */}
          <div
            style={{
              ...styles.diagCard,
              borderColor: estadoColor,
              backgroundColor: `${estadoColor}1a`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>
                {evaluacion.estado === 'bueno'
                  ? '✅'
                  : evaluacion.estado === 'regular'
                  ? 'ℹ️'
                  : evaluacion.estado === 'riesgo'
                  ? '⚠️'
                  : '🚨'}
              </span>
              <strong style={{ fontSize: '13px', color: estadoColor }}>
                Dictamen SMART: {evaluacion.estado.toUpperCase()}
              </strong>
            </div>
            <p style={styles.diagText}>{evaluacion.diagnostico}</p>
          </div>

          <div style={styles.footer}>
            <button
              type="submit"
              disabled={guardando}
              style={styles.saveBtn}
            >
              {guardando ? 'Guardando...' : '💾 Guardar SMART y Validar'}
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
  healthCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '14px',
    border: '1px solid #334155',
  },
  healthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  healthLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  healthPercent: {
    fontSize: '20px',
    fontWeight: 800,
  },
  progressBarTrack: {
    width: '100%',
    height: '10px',
    backgroundColor: '#0f172a',
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  progressBarFill: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  slider: {
    width: '100%',
    cursor: 'pointer',
    accentColor: '#38bdf8',
  },
  paramsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  paramItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  input: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    textAlign: 'center',
    boxSizing: 'border-box',
    outline: 'none',
  },
  diagCard: {
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid',
  },
  diagText: {
    margin: '6px 0 0 0',
    fontSize: '12px',
    lineHeight: '1.4',
    color: '#f1f5f9',
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

export default SmartModal;
