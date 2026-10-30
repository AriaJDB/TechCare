import React from 'react';
import { type ChecklistItem, TAREAS_INFO } from '../../services/checklistService';

export type EstadoTarea = 'pendiente' | 'completada' | 'guardando' | 'error';

interface ChecklistItemRowProps {
  item: ChecklistItem;
  isGuardando: boolean;
  hasError: boolean;
  onToggle: (idItem: string) => void;
  onOpenDetails?: () => void;
  detailsSummary?: string;
}

export const ChecklistItemRow: React.FC<ChecklistItemRowProps> = ({
  item,
  isGuardando,
  hasError,
  onToggle,
  onOpenDetails,
  detailsSummary,
}) => {
  const info = TAREAS_INFO[item.tarea] || {
    titulo: item.tarea,
    descripcion: 'Verificación técnica del servicio',
    icon: '🔧',
    parte: 1,
  };

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

  const fechaTexto = item.fecha_marcado
    ? new Date(item.fecha_marcado).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      style={{
        ...styles.container,
        ...(item.completado ? styles.containerCompleted : {}),
        ...(hasError ? styles.containerError : {}),
      }}
    >
      {/* Indicador táctil / Checkbox */}
      <div
        role="checkbox"
        aria-checked={item.completado}
        aria-label={`${info.titulo}. Estado: ${estado}`}
        tabIndex={0}
        onClick={() => onToggle(item.id_item)}
        onKeyDown={handleKeyDown}
        style={styles.touchTarget}
      >
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
            onClick={() => onToggle(item.id_item)}
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

        {/* Resumen de telemetría si existe */}
        {detailsSummary && (
          <div style={styles.telemetryTag}>
            <span>📊 {detailsSummary}</span>
          </div>
        )}

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

          {/* Botón de inspección detallada para tareas técnicas de Sprint 6 */}
          {onOpenDetails && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails();
              }}
              style={styles.detailsBtn}
            >
              ⚙️ {item.tarea === 'puertos' ? 'Inspeccionar' : item.tarea === 'temperatura' ? 'Medir' : 'Diagnosticar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 14px',
    minHeight: '64px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    marginBottom: '12px',
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
    minWidth: '40px',
    minHeight: '40px',
    cursor: 'pointer',
    marginTop: '2px',
  },
  checkboxBase: {
    width: '24px',
    height: '24px',
    borderRadius: '7px',
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
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 'bold',
  },
  errorIcon: {
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  spinner: {
    width: '12px',
    height: '12px',
    border: '2px solid #ffffff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
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
    fontSize: '14px',
    fontWeight: 600,
    color: '#f1f5f9',
    cursor: 'pointer',
  },
  titleCompleted: {
    color: '#a7f3d0',
    textDecoration: 'line-through',
    textDecorationColor: '#10b981',
  },
  obligatorioBadge: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  description: {
    margin: 0,
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.4',
  },
  telemetryTag: {
    margin: '4px 0',
    padding: '4px 8px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: '6px',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#7dd3fc',
    fontSize: '11px',
    fontWeight: 500,
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '6px',
    flexWrap: 'wrap',
    gap: '6px',
  },
  statusGuardando: {
    fontSize: '11px',
    color: '#fbbf24',
    fontStyle: 'italic',
  },
  statusError: {
    fontSize: '11px',
    color: '#fca5a5',
    fontWeight: 500,
  },
  statusCompletada: {
    fontSize: '11px',
    color: '#34d399',
    fontWeight: 500,
  },
  statusPendiente: {
    fontSize: '11px',
    color: '#64748b',
  },
  detailsBtn: {
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default ChecklistItemRow;
