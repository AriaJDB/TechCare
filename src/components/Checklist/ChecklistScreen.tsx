import React, { useState } from 'react';
import { useChecklist } from '../../hooks/useChecklist';
import { ProgressBar } from './ProgressBar';
import { ChecklistItemRow } from './ChecklistItemRow';
import { PuertosModal } from './PuertosModal';
import { TemperaturaModal } from './TemperaturaModal';
import { SmartModal } from './SmartModal';
import { CierreOrdenModal } from './CierreOrdenModal';

interface ChecklistScreenProps {
  idOrden: string;
  equipo: {
    id?: string;
    numero_serie?: string;
    tipo_dispositivo?: string;
    procesador?: string;
    ram?: string;
    almacenamiento?: string;
  };
  onBack: () => void;
  onOrdenCerrada?: () => void;
}

export const ChecklistScreen: React.FC<ChecklistScreenProps> = ({
  idOrden,
  equipo,
  onBack,
  onOrdenCerrada,
}) => {
  const {
    items,
    itemsParte1,
    itemsParte2,
    loading,
    error,
    isOffline,
    progreso,
    progresoParte1,
    progresoParte2,
    parte1Completa,
    isChecklistCompleto,
    puertosData,
    temperaturaData,
    smartData,
    guardandoMap,
    errorMap,
    toggleTarea,
    guardarAvance,
    guardarPuertos,
    guardarTemperatura,
    guardarSmart,
    cerrarOrden,
    recargar,
  } = useChecklist(idOrden);

  const [activeTab, setActiveTab] = useState<'todas' | 'parte1' | 'parte2'>('todas');
  const [activeModal, setActiveModal] = useState<
    'puertos' | 'temperatura' | 'smart' | 'cierre' | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleGuardarAvance = async () => {
    await guardarAvance();
    showToast('Avance del checklist asegurado correctamente');
  };

  const handleCierreExitoso = () => {
    showToast('¡Orden de servicio cerrada y semáforo actualizado a VERDE!');
    setTimeout(() => {
      if (onOrdenCerrada) {
        onOrdenCerrada();
      } else {
        onBack();
      }
    }, 1500);
  };

  const itemsAMostrar =
    activeTab === 'parte1'
      ? itemsParte1
      : activeTab === 'parte2'
      ? itemsParte2
      : items;

  return (
    <div style={styles.screenContainer}>
      {/* Cabecera */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn} aria-label="Volver">
          ← Volver
        </button>
        <div style={styles.headerInfo}>
          <h2 style={styles.headerTitle}>Checklist de Servicio</h2>
          <span style={styles.orderBadge}>
            Sprint 6 · {isChecklistCompleto ? '100% Completo' : `${progreso.porcentaje}%`}
          </span>
        </div>
      </div>

      {/* Tarjeta de Resumen del Activo */}
      <div style={styles.equipmentCard}>
        <div style={styles.equipmentIcon}>
          {equipo.tipo_dispositivo === 'laptop'
            ? '💻'
            : equipo.tipo_dispositivo === 'desktop'
            ? '🖥️'
            : '🗄️'}
        </div>
        <div style={styles.equipmentDetails}>
          <span style={styles.equipmentSerial}>SN: {equipo.numero_serie}</span>
          <span style={styles.equipmentSpecs}>
            {[equipo.procesador, equipo.ram, equipo.almacenamiento]
              .filter(Boolean)
              .join(' · ') || 'Especificaciones estándar'}
          </span>
        </div>
      </div>

      {/* Banner de Modo Desconectado */}
      {isOffline && (
        <div style={styles.offlineBanner}>
          <span style={styles.bannerIcon}>📡</span>
          <div>
            <strong style={styles.bannerTitle}>Sin conexión a Internet</strong>
            <p style={styles.bannerText}>
              Los cambios se guardan localmente y se sincronizarán al recuperar la red.
            </p>
          </div>
        </div>
      )}

      {/* Alerta de Error */}
      {error && (
        <div style={styles.errorAlert}>
          <span>⚠️ {error}</span>
          <button onClick={recargar} style={styles.retryBtn}>
            Reintentar
          </button>
        </div>
      )}

      {/* Toast Flotante */}
      {toastMessage && (
        <div style={styles.toast}>
          <span>✓ {toastMessage}</span>
        </div>
      )}

      {/* Barra de Progreso Global */}
      <ProgressBar
        completadas={progreso.completadas}
        total={progreso.total}
        porcentaje={progreso.porcentaje}
      />

      {/* Pestañas de Navegación por Parte */}
      <div style={styles.tabsNav}>
        <button
          type="button"
          onClick={() => setActiveTab('todas')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'todas' ? styles.tabBtnActive : {}),
          }}
        >
          Todas ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('parte1')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'parte1' ? styles.tabBtnActive : {}),
          }}
        >
          Parte 1: Física ({progresoParte1.porcentaje}%)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('parte2')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'parte2' ? styles.tabBtnActive : {}),
          }}
        >
          Parte 2: Lógica ({progresoParte2.porcentaje}%)
        </button>
      </div>

      {/* Lista de Tareas */}
      <div style={styles.tasksList}>
        {loading && items.length === 0 ? (
          <div style={styles.loadingState}>
            <div style={styles.spinnerLarge} />
            <p style={styles.loadingText}>Cargando verificaciones técnicas...</p>
          </div>
        ) : itemsAMostrar.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              No se encontraron verificaciones asignadas para este filtro.
            </p>
            <button onClick={recargar} style={styles.secondaryBtn}>
              Actualizar
            </button>
          </div>
        ) : (
          itemsAMostrar.map((item) => {
            let detailsSummary: string | undefined;
            let onOpenDetails: (() => void) | undefined;

            if (item.tarea === 'puertos') {
              onOpenDetails = () => setActiveModal('puertos');
              detailsSummary = `USB: ${puertosData.usb_a.toUpperCase()}, HDMI: ${puertosData.hdmi.toUpperCase()}, Audio: ${puertosData.audio.toUpperCase()}`;
            } else if (item.tarea === 'temperatura') {
              onOpenDetails = () => setActiveModal('temperatura');
              if (temperaturaData) {
                detailsSummary = `Pre: ${temperaturaData.tempCpuPre}°C ➔ Post: ${temperaturaData.tempCpuPost}°C (Δ ${temperaturaData.deltaCpu}°C)`;
              }
            } else if (item.tarea === 'smart') {
              onOpenDetails = () => setActiveModal('smart');
              if (smartData) {
                detailsSummary = `Salud: ${smartData.saludPorcentaje}% · ${smartData.horasEncendido}h · ${smartData.estado.toUpperCase()}`;
              }
            }

            return (
              <ChecklistItemRow
                key={item.id_item}
                item={item}
                isGuardando={!!guardandoMap[item.id_item]}
                hasError={!!errorMap[item.id_item]}
                onToggle={toggleTarea}
                onOpenDetails={onOpenDetails}
                detailsSummary={detailsSummary}
              />
            );
          })
        )}
      </div>

      {/* Banners de finalización */}
      {parte1Completa && !isChecklistCompleto && (
        <div style={styles.completionBanner}>
          <span style={{ fontSize: '20px' }}>⚡</span>
          <div>
            <strong style={styles.completionTitle}>Parte 1 completada</strong>
            <p style={styles.completionText}>
              Continúa con la Parte 2: puertos, temperaturas y diagnóstico SMART.
            </p>
          </div>
        </div>
      )}

      {isChecklistCompleto && (
        <div style={{ ...styles.completionBanner, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
          <span style={{ fontSize: '20px' }}>🏆</span>
          <div>
            <strong style={{ ...styles.completionTitle, color: '#a7f3d0' }}>
              ¡Checklist 100% Completado!
            </strong>
            <p style={{ ...styles.completionText, color: '#d1fae5' }}>
              Todas las 6 tareas obligatorias están verificadas. Ya puedes cerrar la orden de servicio.
            </p>
          </div>
        </div>
      )}

      {/* Botonera de Acción */}
      <div style={styles.actionBar}>
        {/* Botón de Cierre de Orden (TC06 / HU4/HU5 / HU7 / HU8) */}
        <button
          onClick={() => setActiveModal('cierre')}
          style={{
            ...styles.closeOrderBtn,
            backgroundColor: isChecklistCompleto ? '#10b981' : '#334155',
            color: isChecklistCompleto ? '#ffffff' : '#94a3b8',
          }}
        >
          {isChecklistCompleto ? '🔒 Concluir y Cerrar Orden' : '🔒 Intentar Cerrar Orden'}
        </button>

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

      {/* Modales de Sprint 6 */}
      {activeModal === 'puertos' && (
        <PuertosModal
          initialData={puertosData}
          onSave={guardarPuertos}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'temperatura' && (
        <TemperaturaModal
          initialData={temperaturaData}
          onSave={guardarTemperatura}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'smart' && (
        <SmartModal
          initialData={smartData}
          onSave={guardarSmart}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'cierre' && (
        <CierreOrdenModal
          items={items}
          isCompleto={isChecklistCompleto}
          onCerrarOrden={cerrarOrden}
          onClose={() => setActiveModal(null)}
          onSuccess={handleCierreExitoso}
        />
      )}
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
    padding: '16px 16px 36px 16px',
    boxSizing: 'border-box',
    color: '#f8fafc',
    height: '100%',
    maxHeight: '100%',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
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
    color: '#38bdf8',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
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
  tabsNav: {
    display: 'flex',
    gap: '6px',
    marginBottom: '14px',
    backgroundColor: '#0f172a',
    padding: '4px',
    borderRadius: '10px',
    border: '1px solid #1e293b',
  },
  tabBtn: {
    flex: 1,
    padding: '8px 4px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
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
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid #38bdf8',
    borderRadius: '10px',
    marginBottom: '16px',
    color: '#7dd3fc',
  },
  completionTitle: {
    fontSize: '13px',
    display: 'block',
    color: '#bae6fd',
  },
  completionText: {
    margin: 0,
    fontSize: '12px',
    color: '#e0f2fe',
  },
  actionBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: 'auto',
    paddingTop: '16px',
    paddingBottom: '24px',
  },
  closeOrderBtn: {
    width: '100%',
    minHeight: '48px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.2s ease',
  },
  primaryBtn: {
    width: '100%',
    minHeight: '44px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
  },
  secondaryBtn: {
    width: '100%',
    minHeight: '40px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default ChecklistScreen;
