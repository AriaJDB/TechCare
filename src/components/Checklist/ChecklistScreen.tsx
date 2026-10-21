import React, { useState } from 'react';
import { useChecklist } from '../../hooks/useChecklist';
import { ProgressBar } from './ProgressBar';
import { ChecklistItemRow } from './ChecklistItemRow';
import { TAREAS_PARTE_1 } from '../../services/checklistService';

interface ChecklistScreenProps {
  idOrden: string;
  equipo: {
    id_equipo?: string;
    id?: string;
    numero_serie?: string;
    tipo_dispositivo?: string;
    procesador?: string;
    ram?: string;
    codigo_qr?: string;
  };
  onBack: () => void;
}

export const ChecklistScreen: React.FC<ChecklistScreenProps> = ({
  idOrden,
  equipo,
  onBack,
}) => {
  const {
    items,
    loading,
    error,
    isOffline,
    progreso,
    parte1Completa,
    guardandoMap,
    errorMap,
    toggleTarea,
    guardarAvance,
    recargar,
  } = useChecklist(idOrden);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleGuardarAvance = async () => {
    await guardarAvance();
    setToastMessage('¡Avance guardado correctamente!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtrar exclusivamente los ítems de la Parte 1
  const itemsParte1 = items.filter((item) => TAREAS_PARTE_1.includes(item.tarea));

  return (
    <div style={styles.screenContainer}>
      {/* Encabezado de la Orden */}
      <div style={styles.header}>
        <button
          onClick={onBack}
          style={styles.backBtn}
          aria-label="Volver a la ficha del equipo"
        >
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <h2 style={styles.headerTitle}>Checklist de Servicio</h2>
          <span style={styles.orderBadge}>Orden #{idOrden.slice(0, 8)}</span>
        </div>
      </div>

      {/* Tarjeta de Resumen del Equipo */}
      <div style={styles.equipmentCard}>
        <div style={styles.equipmentIcon}>
          {equipo.tipo_dispositivo === 'desktop' ? '🖥️' : '💻'}
        </div>
        <div style={styles.equipmentDetails}>
          <div style={styles.equipmentSerial}>
            SN: {equipo.numero_serie || 'SN-DESCONOCIDO'}
          </div>
          <div style={styles.equipmentSpecs}>
            {equipo.procesador || 'CPU'} · {equipo.ram || 'RAM'}
          </div>
        </div>
      </div>

      {/* Banner de Modo Sin Conexión */}
      {isOffline && (
        <div style={styles.offlineBanner}>
          <span style={styles.bannerIcon}>📡</span>
          <div>
            <strong style={styles.bannerTitle}>Modo sin conexión activo</strong>
            <p style={styles.bannerText}>
              Los cambios se guardan localmente y se sincronizarán al recuperar la red.
            </p>
          </div>
        </div>
      )}

      {/* Alerta de Error Genérico */}
      {error && (
        <div style={styles.errorAlert}>
          <span>⚠️ {error}</span>
          <button onClick={recargar} style={styles.retryBtn}>
            Reintentar
          </button>
        </div>
      )}

      {/* Toast flotante de confirmación */}
      {toastMessage && (
        <div style={styles.toast}>
          <span>✓ {toastMessage}</span>
        </div>
      )}

      {/* Barra de Progreso */}
      <ProgressBar
        completadas={progreso.completadas}
        total={progreso.total}
        porcentaje={progreso.porcentaje}
      />

      {/* Sección Parte 1 */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Parte 1: Inspección Física y Térmica</h3>
        <span style={styles.sectionBadge}>Sprint 5 · HU4</span>
      </div>

      {/* Lista de Tareas */}
      <div style={styles.tasksList}>
        {loading && items.length === 0 ? (
          <div style={styles.loadingState}>
            <div style={styles.spinnerLarge} />
            <p style={styles.loadingText}>Cargando verificaciones...</p>
          </div>
        ) : itemsParte1.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              No se encontraron verificaciones asignadas para esta orden.
            </p>
            <button onClick={recargar} style={styles.secondaryBtn}>
              Actualizar
            </button>
          </div>
        ) : (
          itemsParte1.map((item) => (
            <ChecklistItemRow
              key={item.id_item}
              item={item}
              isGuardando={!!guardandoMap[item.id_item]}
              hasError={!!errorMap[item.id_item]}
              onToggle={toggleTarea}
            />
          ))
        )}
      </div>

      {/* Mensaje de finalización de Parte 1 */}
      {parte1Completa && (
        <div style={styles.completionBanner}>
          <span style={{ fontSize: '20px' }}>🎉</span>
          <div>
            <strong style={styles.completionTitle}>¡Parte 1 completada!</strong>
            <p style={styles.completionText}>
              Se verificaron limpieza, ventiladores y compuesto térmico. El avance ha sido
              asegurado.
            </p>
          </div>
        </div>
      )}

      {/* Botonera de Acción */}
      <div style={styles.actionBar}>
        <button
          onClick={handleGuardarAvance}
          style={styles.primaryBtn}
          disabled={loading}
        >
          💾 Guardar avance
        </button>
        <button onClick={onBack} style={styles.secondaryBtn}>
          Cerrar y continuar luego
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  screenContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '560px',
    margin: '0 auto',
    padding: '16px',
    boxSizing: 'border-box',
    color: '#f8fafc',
    minHeight: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#38bdf8',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '8px 4px',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  headerTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffffff',
  },
  orderBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#94a3b8',
    backgroundColor: '#334155',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  equipmentCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: '#0f172a',
    borderRadius: '10px',
    border: '1px solid #1e293b',
    marginBottom: '16px',
  },
  equipmentIcon: {
    fontSize: '24px',
  },
  equipmentDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  equipmentSerial: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  equipmentSpecs: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  offlineBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#422006',
    border: '1px solid #ca8a04',
    borderRadius: '10px',
    marginBottom: '14px',
    color: '#fef08a',
  },
  bannerIcon: {
    fontSize: '18px',
  },
  bannerTitle: {
    fontSize: '13px',
    display: 'block',
  },
  bannerText: {
    margin: 0,
    fontSize: '11px',
    color: '#fef9c3',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid #ef4444',
    borderRadius: '10px',
    marginBottom: '14px',
    fontSize: '13px',
    color: '#fca5a5',
  },
  retryBtn: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  toast: {
    position: 'sticky',
    top: '12px',
    zIndex: 100,
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: '10px 16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  sectionBadge: {
    fontSize: '11px',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  tasksList: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '16px',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px',
    gap: '12px',
  },
  spinnerLarge: {
    width: '28px',
    height: '28px',
    border: '3px solid rgba(255, 255, 255, 0.2)',
    borderTopColor: '#38bdf8',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px',
    backgroundColor: '#1e293b',
    borderRadius: '10px',
  },
  emptyText: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '12px',
  },
  completionBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid #10b981',
    borderRadius: '10px',
    marginBottom: '16px',
    color: '#6ee7b7',
  },
  completionTitle: {
    fontSize: '13px',
    display: 'block',
    color: '#a7f3d0',
  },
  completionText: {
    margin: 0,
    fontSize: '12px',
    color: '#d1fae5',
  },
  actionBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: 'auto',
    paddingTop: '8px',
  },
  primaryBtn: {
    width: '100%',
    minHeight: '48px', // Requisito táctil móvil
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
    transition: 'background 0.2s ease',
  },
  secondaryBtn: {
    width: '100%',
    minHeight: '44px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default ChecklistScreen;
