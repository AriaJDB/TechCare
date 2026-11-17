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
    icon: '01',
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
          <span style={styles.taskNumber}>{info.icon}</span>
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
            <span>{detailsSummary}</span>
          </div>
        )}

        {/* Metadatos y badges de estado */}
        <div style={styles.footerRow}>
          {estado === 'guardando' && (
            <span style={styles.statusGuardando}>Sincronizando con base de datos...</span>
          )}
          {estado === 'error' && (
            <span style={styles.statusError}>Error de sincronización. Toca para reintentar.</span>
          )}
          {estado === 'completada' && (
            <span style={styles.statusCompletada}>
              ✓ Verificado {fechaTexto ? `a las ${fechaTexto}` : ''}
            </span>
          )}
          {estado === 'pendiente' && (
            <span style={styles.statusPendiente}>Pendiente de verificación</span>
          )}

          {/* Botón de inspección detallada */}
          {onOpenDetails && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails();
              }}
              style={styles.detailsBtn}
            >
              {item.tarea === 'puertos' ? 'Inspeccionar' : item.tarea === 'temperatura' ? 'Medir' : 'Diagnosticar'}
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
    padding: '14px 16px',
    minHeight: '64px',
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '20px',
    marginBottom: '12px',
    transition: 'all 0.2s ease',
    userSelect: 'none',
    boxShadow: '6px 6px 14px rgba(148, 166, 212, 0.28), inset 0 2px 3px #ffffff',
    color: '#172554',
  },
  containerCompleted: {
    background: 'linear-gradient(145deg, #f0fdf4 0%, #dcfce7 100%)',
    border: '1px solid #86efac',
    boxShadow: '4px 4px 12px rgba(74, 222, 128, 0.22), inset 0 2px 3px #ffffff',
  },
  containerError: {
    background: 'linear-gradient(145deg, #fef2f2 0%, #fee2e2 100%)',
    border: '1px solid #fca5a5',
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
    borderRadius: '8px',
    border: '2px solid #94a3b8',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: 'inset 2px 2px 4px rgba(148, 166, 212, 0.35)',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)',
  },
  checkboxError: {
    borderColor: '#ef4444',
    backgroundColor: '#fee2e2',
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
    border: '2px solid #2563eb',
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
  taskNumber: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#2563eb',
    background: '#dbeafe',
    padding: '2px 7px',
    borderRadius: '8px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#172554',
    cursor: 'pointer',
  },
  titleCompleted: {
    color: '#059669',
    textDecoration: 'line-through',
    textDecorationColor: '#10b981',
  },
  obligatorioBadge: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    padding: '2px 6px',
    borderRadius: '6px',
    textTransform: 'uppercase',
  },
  description: {
    margin: 0,
    fontSize: '12px',
    color: '#475569',
    lineHeight: '1.4',
  },
  telemetryTag: {
    margin: '4px 0',
    padding: '4px 10px',
    backgroundColor: '#e0f2fe',
    borderRadius: '8px',
    border: '1px solid #bae6fd',
    color: '#0284c7',
    fontSize: '11.5px',
    fontWeight: 600,
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
    color: '#d97706',
    fontWeight: 600,
    fontStyle: 'italic',
  },
  statusError: {
    fontSize: '11px',
    color: '#dc2626',
    fontWeight: 700,
  },
  statusCompletada: {
    fontSize: '11px',
    color: '#059669',
    fontWeight: 700,
  },
  statusPendiente: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 600,
  },
  detailsBtn: {
    backgroundColor: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '5px 12px',
    fontSize: '11.5px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 3px 8px rgba(37, 99, 235, 0.3)',
  },
};

export default ChecklistItemRow;
