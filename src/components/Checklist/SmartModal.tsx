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
    bueno: '#16a34a',
    regular: '#0284c7',
    riesgo: '#d97706',
    critico: '#dc2626',
  }[evaluacion.estado];

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>Diagnóstico Rápido S.M.A.R.T.</h3>
            <p style={styles.subtitle}>Diagnóstico de salud del Disco / SSD</p>
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
              <span style={{ ...styles.healthValue, color: estadoColor }}>
                {salud}% ({evaluacion.estado.toUpperCase()})
              </span>
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

          {/* Grilla de parámetros SMART */}
          <div style={styles.paramsGrid}>
            <div style={styles.paramItem}>
              <label style={styles.label}>Horas Encendido</label>
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
                  borderColor: sectores > 0 ? '#ef4444' : '#cbd5e1',
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
              backgroundColor: `${estadoColor}15`,
            }}
          >
            <div>
              <strong style={{ fontSize: '13px', color: estadoColor, display: 'block' }}>
                Dictamen Técnico ({evaluacion.estado.toUpperCase()}):
              </strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#172554' }}>
                {evaluacion.diagnostico}
              </p>
            </div>
          </div>

          <div style={styles.footer}>
            <button
              type="submit"
              disabled={guardando}
              style={styles.saveBtn}
            >
              {guardando ? 'Guardando...' : 'Guardar Diagnóstico SMART'}
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
  healthCard: {
    background: '#ffffff',
    padding: '12px 14px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    boxShadow: '4px 4px 10px rgba(148, 166, 212, 0.25)',
  },
  healthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  healthLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#172554',
  },
  healthValue: {
    fontSize: '13px',
    fontWeight: 800,
  },
  slider: {
    width: '100%',
    cursor: 'pointer',
    accentColor: '#2563eb',
  },
  paramsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  paramItem: {
    background: '#ffffff',
    padding: '10px 8px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    boxShadow: '3px 3px 8px rgba(148, 166, 212, 0.2)',
  },
  label: {
    display: 'block',
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#475569',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  input: {
    width: '100%',
    padding: '6px 8px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#e3eaf8',
    color: '#172554',
    fontSize: '12px',
    fontWeight: 700,
    outline: 'none',
    boxSizing: 'border-box',
  },
  diagCard: {
    padding: '12px',
    borderRadius: '14px',
    border: '1.5px solid #cbd5e1',
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

export default SmartModal;
