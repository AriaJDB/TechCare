import React from 'react';
import { type ChecklistItem, TAREAS_INFO } from '../../services/checklistService';

export type EstadoTarea = 'pendiente' | 'completada' | 'guardando' | 'error';

interface ChecklistItemRowProps {
  item: ChecklistItem;
  isGuardando: boolean;
  hasError: boolean;
  onToggle: (idItem: string) => void;
}

export const ChecklistItemRow: React.FC<ChecklistItemRowProps> = ({
  item,
  isGuardando,
  hasError,
  onToggle,
}) => {
  const info = TAREAS_INFO[item.tarea] || {
    titulo: item.tarea,
    descripcion: 'Verificación técnica del servicio',
    icon: '🔧',
  };

  // Determinar estado actual de la tarea
  let estado: EstadoTarea = 'pendiente';
  if (isGuardando) {
    estado = 'guardando';
  } else if (hasError) {
    estado = 'error';
  } else if (item.completado) {
    estado = 'completada';
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle(item.id_item);
    }
  };

  // Formato legible de fecha de marcado
  const fechaTexto = item.fecha_marcado
    ? new Date(item.fecha_marcado).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      role="checkbox"
      aria-checked={item.completado}
      aria-label={`${info.titulo}. Estado: ${estado}`}
      tabIndex={0}
      onClick={() => onToggle(item.id_item)}
      onKeyDown={handleKeyDown}
      style={{
        ...styles.container,
        ...(item.completado ? styles.containerCompleted : {}),
        ...(hasError ? styles.containerError : {}),
      }}
    >
      {/* Indicador táctil / Checkbox estilizado (mínimo 48x48px área efectiva) */}
      <div style={styles.touchTarget}>
        <div
          style={{
            ...styles.checkboxBase,
            ...(item.completado ? styles.checkboxChecked : {}),
            ...(hasError ? styles.checkboxError : {}),
          }}
        >
          {isGuardando ? (
            <span style={styles.spinner} title="Guardando..." />
          ) : item.completado ? (
            <span style={styles.checkIcon}>✓</span>
          ) : hasError ? (
            <span style={styles.errorIcon}>!</span>
          ) : null}
        </div>
      </div>

      {/* Contenido descriptivo de la tarea */}
      <div style={styles.content}>
        <div style={styles.titleRow}>
          <span style={styles.taskIcon}>{info.icon}</span>
          <span
            style={{
              ...styles.title,
              ...(item.completado ? styles.titleCompleted : {}),
            }}
          >
            {info.titulo}
          </span>
          {item.obligatorio && <span style={styles.obligatorioBadge}>Obligatorio</span>}
        </div>

        <p style={styles.description}>{info.descripcion}</p>

        {/* Metadatos y badges de estado */}
        <div style={styles.footerRow}>
          {estado === 'guardando' && (
            <span style={styles.statusGuardando}>⏳ Sincronizando con base de datos...</span>
          )}
          {estado === 'error' && (
            <span style={styles.statusError}>⚠️ Error de red. Toca para reintentar.</span>
          )}
          {estado === 'completada' && (
            <span style={styles.statusCompletada}>
              ✓ Verificado {fechaTexto ? `a las ${fechaTexto}` : ''}
            </span>
          )}
          {estado === 'pendiente' && (
            <span style={styles.statusPendiente}>○ Pendiente de verificación</span>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    minHeight: '64px', // Excede el requisito mínimo táctil de 48px
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
  },
  containerCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: '#059669',
  },
  containerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: '#ef4444',
  },
  touchTarget: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '48px',
    minHeight: '48px',
  },
  checkboxBase: {
    width: '26px',
    height: '26px',
    borderRadius: '8px',
    border: '2px solid #64748b',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkboxError: {
    borderColor: '#ef4444',
    backgroundColor: '#7f1d1d',
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 'bold',
  },
  errorIcon: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#38bdf8',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  taskIcon: {
    fontSize: '16px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  titleCompleted: {
    color: '#cbd5e1',
  },
  obligatorioBadge: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  description: {
    margin: 0,
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.4',
  },
  footerRow: {
    marginTop: '2px',
    fontSize: '11px',
  },
  statusGuardando: {
    color: '#38bdf8',
    fontStyle: 'italic',
  },
  statusError: {
    color: '#f87171',
    fontWeight: 500,
  },
  statusCompletada: {
    color: '#34d399',
    fontWeight: 500,
  },
  statusPendiente: {
    color: '#64748b',
  },
};

export default ChecklistItemRow;
