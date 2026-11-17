import React, { useState } from 'react';
import { useChecklist } from '../../hooks/useChecklist';
import { ProgressBar } from './ProgressBar';
import { ChecklistItemRow } from './ChecklistItemRow';
import { PuertosModal } from './PuertosModal';
import { TemperaturaModal } from './TemperaturaModal';
import { SmartModal } from './SmartModal';
import { CierreOrdenModal } from './CierreOrdenModal';
import EvidenciaFotografica from './EvidenciaFotografica';
import type { EvidenciaItem } from '../../services/evidenciasService';

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

  const [activeTab, setActiveTab] = useState<'todas' | 'parte1' | 'parte2' | 'fotos'>('todas');
  const [activeModal, setActiveModal] = useState<
    'puertos' | 'temperatura' | 'smart' | 'cierre' | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [evidencias, setEvidencias] = useState<EvidenciaItem[]>([]);

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
            Sprint 7 · {isChecklistCompleto ? '100% Completo' : `${progreso.porcentaje}%`}
          </span>
        </div>
      </div>

      {/* Tarjeta de Equipo */}
      <div style={styles.equipmentCard}>
        <div style={styles.equipmentIcon}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <div style={styles.equipmentDetails}>
          <span style={styles.equipmentSerial}>SN: {equipo.numero_serie || 'N/A'}</span>
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
            <strong style={styles.bannerTitle}>Modo Local / Sin conexión</strong>
            <p style={styles.bannerText}>
              Los cambios y fotografías se guardan localmente y se sincronizarán al recuperar la red.
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

      {/* Pestañas de Navegación */}
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
          Física ({progresoParte1.porcentaje}%)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('parte2')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'parte2' ? styles.tabBtnActive : {}),
          }}
        >
          Lógica ({progresoParte2.porcentaje}%)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fotos')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'fotos' ? styles.tabBtnActive : {}),
          }}
        >
          Fotos ({evidencias.length}/3)
        </button>
      </div>

      {/* Lista de Tareas (oculta si se selecciona la pestaña exclusiva de fotos) */}
      {activeTab !== 'fotos' && (
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
      )}

      {/* Bitácora de Evidencias Fotográficas (visible en tab 'todas' o 'fotos') */}
      {(activeTab === 'todas' || activeTab === 'fotos') && (
        <EvidenciaFotografica
          idOrden={idOrden}
          idEquipo={equipo.id}
          onEvidenciasChange={(evs) => setEvidencias(evs)}
        />
      )}

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
        <div
          style={{
            ...styles.completionBanner,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
          }}
        >
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
        <button
          onClick={() => setActiveModal('cierre')}
          style={{
            ...styles.closeOrderBtn,
            background: isChecklistCompleto
              ? 'linear-gradient(145deg, #34d399 0%, #10b981 100%)'
              : 'linear-gradient(145deg, #ffffff 0%, #e2e8f0 100%)',
            color: isChecklistCompleto ? '#ffffff' : '#475569',
          }}
        >
          {isChecklistCompleto ? 'Concluir y Cerrar Orden' : 'Cerrar Orden de Servicio'}
        </button>

        <button
          onClick={handleGuardarAvance}
          style={styles.primaryBtn}
          disabled={loading}
        >
          Guardar avance
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
          equipo={equipo}
          idOrden={idOrden}
          onCerrarOrden={cerrarOrden}
          onClose={() => setActiveModal(null)}
          onSuccess={handleCierreExitoso}
        />
      )}
    </div>
  );
};

export default ChecklistScreen;

const styles: Record<string, React.CSSProperties> = {
  screenContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '520px',
    margin: '0 auto',
    padding: '18px 18px 32px 18px',
    boxSizing: 'border-box',
    color: '#172554',
    height: '100%',
    maxHeight: '100%',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '16px',
  },
  backBtn: {
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    color: '#2563eb',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    padding: '8px 14px',
    borderRadius: '14px',
    boxShadow: '4px 4px 10px rgba(148, 166, 212, 0.38), inset 0 2px 3px #ffffff',
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
    fontWeight: 800,
    color: '#172554',
  },
  orderBadge: {
    background: '#dbeafe',
    color: '#1e40af',
    fontSize: '11.5px',
    fontWeight: 800,
    padding: '4px 10px',
    borderRadius: '12px',
  },
  equipmentCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    boxShadow: '6px 6px 16px rgba(148, 166, 212, 0.3), inset 0 2px 3px #ffffff',
    marginBottom: '16px',
  },
  equipmentIcon: {
    width: '42px',
    height: '42px',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.35)',
  },
  equipmentDetails: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  equipmentSerial: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: '#172554',
  },
  equipmentSpecs: {
    fontSize: '11.5px',
    color: '#64748b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  offlineBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '18px',
    background: 'linear-gradient(145deg, #fef3c7 0%, #fde68a 100%)',
    color: '#92400e',
    marginBottom: '14px',
    boxShadow: '6px 6px 14px rgba(217, 119, 6, 0.25)',
  },
  bannerIcon: {
    fontSize: '22px',
  },
  bannerTitle: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 800,
  },
  bannerText: {
    margin: '2px 0 0 0',
    fontSize: '11.5px',
  },
  errorAlert: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '18px',
    background: 'linear-gradient(145deg, #fee2e2 0%, #fecaca 100%)',
    color: '#991b1b',
    fontSize: '12px',
    fontWeight: 700,
    marginBottom: '14px',
  },
  retryBtn: {
    background: '#ffffff',
    border: 'none',
    color: '#991b1b',
    padding: '6px 12px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
  },
  toast: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(145deg, #10b981 0%, #059669 100%)',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 800,
    boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
    zIndex: 9999,
  },
  tabsNav: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    marginBottom: '14px',
  },
  tabBtn: {
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '14px',
    padding: '8px 4px',
    color: '#64748b',
    fontSize: '11.5px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '4px 4px 8px rgba(148, 166, 212, 0.25)',
  },
  tabBtnActive: {
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
  },
  tasksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '16px',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '36px 0',
  },
  spinnerLarge: {
    width: '32px',
    height: '32px',
    border: '3px solid #cbd5e1',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '12px',
    fontSize: '12.5px',
    color: '#64748b',
  },
  emptyState: {
    textAlign: 'center',
    padding: '28px',
    background: '#e4ebf8',
    borderRadius: '20px',
  },
  emptyText: {
    fontSize: '12.5px',
    color: '#64748b',
    margin: '0 0 12px 0',
  },
  completionBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '20px',
    background: 'linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)',
    border: '1.5px solid #93c5fd',
    marginBottom: '16px',
    boxShadow: '6px 6px 16px rgba(147, 197, 253, 0.35)',
  },
  completionTitle: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 800,
    color: '#1e40af',
  },
  completionText: {
    margin: '2px 0 0 0',
    fontSize: '11.5px',
    color: '#1e3a8a',
  },
  actionBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: 'auto',
  },
  closeOrderBtn: {
    padding: '14px',
    borderRadius: '16px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 8px 18px rgba(16, 185, 129, 0.35)',
  },
  primaryBtn: {
    padding: '12px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 6px 14px rgba(37, 99, 235, 0.3)',
  },
  secondaryBtn: {
    padding: '11px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    color: '#475569',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '4px 4px 10px rgba(148, 166, 212, 0.3)',
  },
};
