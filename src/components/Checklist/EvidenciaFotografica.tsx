import React, { useState, useEffect, useRef } from 'react';
import {
  ETAPAS_CATALOGO,
  ETAPAS_INFO,
  type EtapaEvidencia,
  type EvidenciaItem,
  obtenerEvidencias,
  adjuntarEvidencia,
  eliminarEvidencia,
  capturarFotoNativa,
} from '../../services/evidenciasService';

interface EvidenciaFotograficaProps {
  idOrden: string;
  idEquipo?: string;
  onEvidenciasChange?: (evidencias: EvidenciaItem[]) => void;
}

export default function EvidenciaFotografica({
  idOrden,
  idEquipo,
  onEvidenciasChange,
}: EvidenciaFotograficaProps) {
  const [evidencias, setEvidencias] = useState<EvidenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardandoEtapa, setGuardandoEtapa] = useState<EtapaEvidencia | null>(null);
  const [etapaActiva, setEtapaActiva] = useState<EtapaEvidencia>('antes');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<EvidenciaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const items = await obtenerEvidencias(idOrden);
      setEvidencias(items);
      if (onEvidenciasChange) onEvidenciasChange(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [idOrden]);

  const procesarArchivo = async (etapa: EtapaEvidencia, file: File | Blob) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGuardandoEtapa(etapa);

    try {
      const nuevo = await adjuntarEvidencia({
        idOrden,
        idEquipo,
        etapa,
        file,
        evidenciasActuales: evidencias,
      });

      const actualizadas = [
        ...evidencias.filter((e) => e.etapa !== etapa),
        nuevo,
      ].sort(
        (a, b) => ETAPAS_CATALOGO.indexOf(a.etapa) - ETAPAS_CATALOGO.indexOf(b.etapa)
      );

      setEvidencias(actualizadas);
      if (onEvidenciasChange) onEvidenciasChange(actualizadas);

      if (nuevo.comprimida && nuevo.peso_original_kb && nuevo.peso_final_kb) {
        setSuccessMsg(
          `Foto "${ETAPAS_INFO[etapa].titulo}" optimizada (${nuevo.peso_original_kb} KB → ${nuevo.peso_final_kb} KB) y guardada.`
        );
      } else {
        setSuccessMsg(`Evidencia "${ETAPAS_INFO[etapa].titulo}" adjuntada a la orden.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo adjuntar la fotografía.');
    } finally {
      setGuardandoEtapa(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const abrirSelectorArchivo = (etapa: EtapaEvidencia) => {
    setEtapaActiva(etapa);
    fileInputRef.current?.click();
  };

  const handleTomarFoto = async (etapa: EtapaEvidencia) => {
    setErrorMsg(null);
    const foto = await capturarFotoNativa();
    if (foto) {
      await procesarArchivo(etapa, foto);
    } else {
      // Fallback a input de archivo web
      abrirSelectorArchivo(etapa);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await procesarArchivo(etapaActiva, file);
    }
  };

  const handleEliminar = async (item: EvidenciaItem) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    await eliminarEvidencia(item.id_evidencia, idOrden, item.url_imagen, idEquipo);
    const filtradas = evidencias.filter((e) => e.id_evidencia !== item.id_evidencia);
    setEvidencias(filtradas);
    if (onEvidenciasChange) onEvidenciasChange(filtradas);
    setSuccessMsg(`Fotografía de etapa "${item.etapa.toUpperCase()}" eliminada.`);
  };

  return (
    <div style={styles.container}>
      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,*/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {errorMsg && (
        <div style={styles.errorAlert} role="alert">
          <div style={{ flex: 1 }}>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div style={styles.successAlert} role="status">
          <div style={{ flex: 1 }}>{successMsg}</div>
        </div>
      )}

      {loading ? (
        <div style={styles.loadingBox}>Cargando evidencias fotográficas...</div>
      ) : (
        <div style={styles.stagesGrid}>
          {ETAPAS_CATALOGO.map((etapa) => {
            const config = ETAPAS_INFO[etapa];
            const item = evidencias.find((e) => e.etapa === etapa);
            const isGuardando = guardandoEtapa === etapa;

            return (
              <div key={etapa} style={styles.stageCard}>
                <div style={styles.stageHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        ...styles.stagePill,
                        background: config.bgClay,
                        color: config.color,
                      }}
                    >
                      {etapa.toUpperCase()}
                    </span>
                    <span style={styles.stageTitle}>{config.titulo}</span>
                  </div>
                  {item && <span style={styles.uploadedBadge}>✓ Adjuntada</span>}
                </div>

                <p style={styles.stageDesc}>{config.subtitulo}</p>

                {item ? (
                  <div style={styles.previewWrapper}>
                    <img
                      src={item.signed_url || item.url_imagen}
                      alt={`Evidencia ${etapa}`}
                      style={styles.previewImg}
                      onClick={() => setLightboxItem(item)}
                    />
                    <div style={styles.previewMetaRow}>
                      <div style={styles.metaTags}>
                        {item.comprimida && (
                          <span style={styles.compressedTag}>
                            Optimizada ({item.peso_original_kb} KB → {item.peso_final_kb} KB)
                          </span>
                        )}
                      </div>
                      <div style={styles.previewActions}>
                        <button
                          type="button"
                          onClick={() => abrirSelectorArchivo(etapa)}
                          style={styles.replaceBtn}
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(item)}
                          style={styles.deleteBtn}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={styles.uploadSlot}>
                    <div style={styles.uploadButtonsRow}>
                      <button
                        type="button"
                        disabled={isGuardando}
                        onClick={() => handleTomarFoto(etapa)}
                        style={styles.cameraBtn}
                      >
                        {isGuardando ? 'Procesando...' : 'Cámara'}
                      </button>
                      <button
                        type="button"
                        disabled={isGuardando}
                        onClick={() => abrirSelectorArchivo(etapa)}
                        style={styles.galleryBtn}
                      >
                        Galería / Archivo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Visualizador a pantalla completa */}
      {lightboxItem && (
        <div style={styles.lightboxOverlay} onClick={() => setLightboxItem(null)}>
          <div style={styles.lightboxCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.lightboxHeader}>
              <strong>Evidencia: {ETAPAS_INFO[lightboxItem.etapa]?.titulo}</strong>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            <img
              src={lightboxItem.signed_url || lightboxItem.url_imagen}
              alt={lightboxItem.etapa}
              style={styles.lightboxImg}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '8px',
    marginBottom: '16px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '18px',
    background: 'linear-gradient(145deg, #ffe4e6 0%, #fecdd3 100%)',
    color: '#be123c',
    fontSize: '12px',
    fontWeight: 700,
    boxShadow: '6px 6px 14px rgba(225, 150, 165, 0.35), inset 0 2px 3px rgba(255, 255, 255, 0.8)',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '18px',
    background: 'linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%)',
    color: '#065f46',
    fontSize: '12px',
    fontWeight: 700,
    boxShadow: '6px 6px 14px rgba(134, 209, 172, 0.35), inset 0 2px 3px rgba(255, 255, 255, 0.85)',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '24px',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 600,
  },
  stagesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  stageCard: {
    background: 'linear-gradient(145deg, #ffffff 0%, #f1f5ff 100%)',
    borderRadius: '22px',
    padding: '14px',
    boxShadow:
      '8px 8px 18px rgba(155, 172, 212, 0.35), -5px -5px 14px rgba(255, 255, 255, 0.9), inset 0 2px 3px rgba(255, 255, 255, 0.9), inset 0 -2px 5px rgba(199, 210, 254, 0.4)',
    border: '1.5px solid rgba(255, 255, 255, 0.85)',
  },
  stageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
    flexWrap: 'wrap',
    gap: '6px',
  },
  stagePill: {
    fontSize: '10px',
    fontWeight: 800,
    padding: '4px 10px',
    borderRadius: '12px',
    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 5px rgba(0,0,0,0.06)',
  },
  stageTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#1e293b',
  },
  uploadedBadge: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#059669',
    background: '#d1fae5',
    padding: '3px 8px',
    borderRadius: '10px',
  },
  stageDesc: {
    margin: '0 0 10px 0',
    fontSize: '11.5px',
    color: '#64748b',
  },
  uploadSlot: {
    background: '#e6ecf8',
    borderRadius: '16px',
    padding: '12px',
    boxShadow: 'inset 3px 3px 7px rgba(163, 179, 214, 0.5), inset -3px -3px 7px rgba(255, 255, 255, 0.85)',
  },
  uploadButtonsRow: {
    display: 'flex',
    gap: '10px',
  },
  cameraBtn: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow:
      '0 6px 14px rgba(37, 99, 235, 0.3), inset 0 2px 3px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(29, 78, 216, 0.5)',
  },
  galleryBtn: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(145deg, #ffffff 0%, #eef2ff 100%)',
    color: '#2563eb',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '4px 4px 10px rgba(155, 172, 212, 0.4), -3px -3px 8px rgba(255, 255, 255, 0.9), inset 0 2px 3px #ffffff',
  },
  previewWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  previewImg: {
    width: '100%',
    height: '150px',
    objectFit: 'cover',
    borderRadius: '16px',
    cursor: 'pointer',
    border: '2px solid #ffffff',
    boxShadow: '0 6px 16px rgba(148, 163, 209, 0.4)',
  },
  previewMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  metaTags: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  compressedTag: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#1e40af',
    background: '#dbeafe',
    padding: '3px 8px',
    borderRadius: '8px',
  },
  previewActions: {
    display: 'flex',
    gap: '6px',
  },
  replaceBtn: {
    padding: '5px 10px',
    borderRadius: '10px',
    border: 'none',
    background: '#ffffff',
    color: '#2563eb',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '3px 3px 7px rgba(155, 172, 212, 0.35)',
  },
  deleteBtn: {
    padding: '5px 10px',
    borderRadius: '10px',
    border: 'none',
    background: '#ffffff',
    color: '#dc2626',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '3px 3px 7px rgba(155, 172, 212, 0.35)',
  },
  lightboxOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: '16px',
  },
  lightboxCard: {
    width: '100%',
    maxWidth: '460px',
    background: '#ffffff',
    borderRadius: '24px',
    padding: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  lightboxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#1e293b',
    fontSize: '14px',
  },
  lightboxImg: {
    width: '100%',
    maxHeight: '70vh',
    objectFit: 'contain',
    borderRadius: '16px',
  },
  closeBtn: {
    background: '#f1f5f9',
    border: 'none',
    color: '#475569',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
