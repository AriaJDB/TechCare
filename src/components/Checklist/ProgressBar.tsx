import React from 'react';

interface ProgressBarProps {
  completadas: number;
  total: number;
  porcentaje: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  completadas,
  total,
  porcentaje,
}) => {
  return (
    <div style={styles.container}>
      <div style={styles.labelRow}>
        <span style={styles.labelTitle}>Progreso de Verificación</span>
        <span style={styles.labelCount}>
          <strong style={styles.highlight}>{completadas}</strong> de {total} completadas ({porcentaje}%)
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso del checklist"
        style={styles.track}
      >
        <div
          style={{
            ...styles.fill,
            width: `${Math.min(100, Math.max(0, porcentaje))}%`,
            background:
              porcentaje === 100
                ? 'linear-gradient(90deg, #10b981, #059669)'
                : 'linear-gradient(90deg, #3b82f6, #2563eb)',
          }}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: '14px 18px',
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    boxShadow: '6px 6px 16px rgba(148, 166, 212, 0.3), inset 0 2px 3px #ffffff',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '13px',
  },
  labelTitle: {
    color: '#172554',
    fontWeight: 700,
  },
  labelCount: {
    color: '#475569',
    fontSize: '12.5px',
    fontWeight: 600,
  },
  highlight: {
    color: '#2563eb',
    fontWeight: 800,
  },
  track: {
    width: '100%',
    height: '10px',
    backgroundColor: '#dbeafe',
    borderRadius: '999px',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: 'inset 2px 2px 4px rgba(148, 166, 212, 0.4)',
  },
  fill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export default ProgressBar;
