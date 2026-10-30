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
                : 'linear-gradient(90deg, #3b82f6, #6366f1)',
          }}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: '14px 16px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    marginBottom: '16px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '13px',
  },
  labelTitle: {
    color: '#94a3b8',
    fontWeight: 500,
  },
  labelCount: {
    color: '#e2e8f0',
    fontSize: '13px',
  },
  highlight: {
    color: '#38bdf8',
    fontWeight: 700,
  },
  track: {
    width: '100%',
    height: '10px',
    backgroundColor: '#0f172a',
    borderRadius: '999px',
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export default ProgressBar;
