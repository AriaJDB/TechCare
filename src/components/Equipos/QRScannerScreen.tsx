import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { supabase } from '../../supabaseClient';

interface QRScannerScreenProps {
  onBack: () => void;
  onEquipoEncontrado: (equipo: any) => void;
  equiposDisponibles?: any[];
}

interface CameraDevice {
  id: string;
  label: string;
}

export default function QRScannerScreen({
  onBack,
  onEquipoEncontrado,
  equiposDisponibles = [],
}: QRScannerScreenProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = 'techcare-qr-reader';

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (err) {
      console.warn('Error al detener cámara:', err);
    }
  };

  const handleQRScanned = async (codigo: string) => {
    const cleanCode = codigo.trim();
    if (!cleanCode || searching) return;

    setSearching(true);
    setNotFoundCode(null);

    try {
      // 1. Buscar en lista precargada si existe
      if (equiposDisponibles.length > 0) {
        const localMatch = equiposDisponibles.find(
          (e) =>
            e.codigo_qr === cleanCode ||
            e.numero_serie?.toLowerCase() === cleanCode.toLowerCase()
        );
        if (localMatch) {
          await stopCamera();
          onEquipoEncontrado(localMatch);
          setSearching(false);
          return;
        }
      }

      // 2. Consultar en Supabase
      const { data, error } = await supabase
        .from('equipo')
        .select('*')
        .or(`codigo_qr.eq."${cleanCode}",numero_serie.ilike."${cleanCode}"`)
        .maybeSingle();

      if (error) {
        console.error('Error buscando equipo en Supabase:', error);
        setNotFoundCode(cleanCode);
      } else if (data) {
        await stopCamera();
        onEquipoEncontrado(data);
      } else {
        setNotFoundCode(cleanCode);
      }
    } catch (err) {
      console.error('Error inesperado buscando equipo:', err);
      setNotFoundCode(cleanCode);
    } finally {
      setSearching(false);
    }
  };

  const ensureVideoStyle = () => {
    try {
      const container = document.getElementById(scannerContainerId);
      if (!container) return;
      const video = container.querySelector('video');
      if (video) {
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('autoplay', 'true');
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.minWidth = '100%';
        video.style.minHeight = '100%';
        video.style.maxWidth = '100%';
        video.style.maxHeight = '100%';
        video.style.objectFit = 'cover';
        video.style.borderRadius = '28px';
        video.style.display = 'block';
        video.style.visibility = 'visible';
        video.style.opacity = '1';
        if (video.paused) {
          video.play().catch((err) => console.warn('Error al iniciar reproducción de video:', err));
        }
      }
    } catch (e) {
      console.warn('Error al ajustar estilos de video:', e);
    }
  };

  const startCameraWithDevice = async (cameraSource?: string | { facingMode: string }) => {
    try {
      setCameraError(null);
      setCameraActive(false);

      // Detener escáner previo si estaba activo
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch (cleanupErr) {
          console.warn('Error limpiando escáner previo:', cleanupErr);
        }
      }

      // 1. Permisos nativos si está en Capacitor (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await Camera.checkPermissions();
          if (perm.camera !== 'granted') {
            const requested = await Camera.requestPermissions({ permissions: ['camera'] });
            if (requested.camera !== 'granted') {
              throw new Error('Permiso de cámara no concedido en el dispositivo.');
            }
          }
        } catch (nativePermErr: any) {
          console.warn('Verificación de permisos nativos:', nativePermErr);
        }
      }

      // 2. Obtener lista de cámaras si no las tenemos
      let targetSource = cameraSource;
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          if (!targetSource) {
            // Buscar la cámara trasera
            const rearIndex = devices.findIndex((d) => {
              const label = (d.label || '').toLowerCase();
              return (
                label.includes('back') ||
                label.includes('rear') ||
                label.includes('trasera') ||
                label.includes('posterior') ||
                label.includes('environment')
              );
            });
            if (rearIndex !== -1) {
              setCurrentCameraIndex(rearIndex);
              targetSource = devices[rearIndex].id;
            } else if (devices.length > 1) {
              setCurrentCameraIndex(devices.length - 1);
              targetSource = devices[devices.length - 1].id;
            } else {
              setCurrentCameraIndex(0);
              targetSource = devices[0].id;
            }
          }
        }
      } catch (listErr) {
        console.warn('No se pudo listar cámaras con getCameras:', listErr);
      }

      if (!targetSource) {
        targetSource = { facingMode: 'environment' };
      }

      // 3. Crear escáner
      const scanner = new Html5Qrcode(scannerContainerId, {
        verbose: false,
      });
      html5QrCodeRef.current = scanner;

      // Configuración de escaneo adaptable
      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(160, Math.floor(edge * 0.75));
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
      };

      await scanner.start(
        targetSource,
        qrConfig,
        (decodedText) => {
          handleQRScanned(decodedText);
        },
        () => {
          // Loop de escaneo de fotogramas
        }
      );

      // 4. Ajustar estilos del video
      ensureVideoStyle();
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Fallo al iniciar cámara con la fuente solicitada:', err);
      // Fallback intentando facingMode directo si falló con deviceId
      if (typeof cameraSource === 'string') {
        try {
          const scannerFallback = new Html5Qrcode(scannerContainerId, { verbose: false });
          html5QrCodeRef.current = scannerFallback;
          await scannerFallback.start(
            { facingMode: 'environment' },
            {
              fps: 15,
              qrbox: { width: 200, height: 200 },
              aspectRatio: 1.0,
            },
            (decodedText) => handleQRScanned(decodedText),
            () => {}
          );
          ensureVideoStyle();
          setCameraActive(true);
          return;
        } catch (fallbackErr) {
          console.warn('Fallo también el fallback facingMode:', fallbackErr);
        }
      }

      setCameraActive(false);
      let mensaje = 'No se pudo iniciar la cámara en este dispositivo.';
      if (err?.name === 'NotAllowedError' || String(err).includes('Permiso')) {
        mensaje = 'Permiso de cámara denegado. Habilita los permisos de cámara en Ajustes de la app.';
      } else if (err?.name === 'NotFoundError') {
        mensaje = 'No se detectó cámara trasera disponible.';
      } else if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
        mensaje = 'Se requiere HTTPS o localhost para activar la cámara.';
      }
      setCameraError(mensaje);
    }
  };

  // Iniciar la cámara al montar
  useEffect(() => {
    let isMounted = true;
    startCameraWithDevice();

    const interval = setInterval(() => {
      if (isMounted) ensureVideoStyle();
    }, 800);

    return () => {
      isMounted = false;
      clearInterval(interval);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchCamera = async () => {
    if (availableCameras.length <= 1) {
      await startCameraWithDevice({ facingMode: 'environment' });
      return;
    }
    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    setCurrentCameraIndex(nextIndex);
    await startCameraWithDevice(availableCameras[nextIndex].id);
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSearching(true);
    setNotFoundCode(null);

    try {
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(scannerContainerId, { verbose: false });
        html5QrCodeRef.current = scanner;
      }
      const decodedText = await scanner.scanFile(file, true);
      handleQRScanned(decodedText);
    } catch (err) {
      console.warn('No se detectó QR en el archivo cargado:', err);
      alert('No se pudo leer ningún código QR en la imagen seleccionada. Intenta con una imagen más nítida.');
    } finally {
      setSearching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={styles.container}>
      {/* Botón superior Volver */}
      <div style={styles.topBar}>
        <button onClick={onBack} style={styles.backBtn}>
          ← Regresar al Catálogo
        </button>
      </div>

      <div style={styles.scannerCard}>
        <h2 style={styles.title}>Escanear equipo</h2>
        <p style={styles.subtitle}>Apunta la cámara al código QR del equipo</p>

        {/* Alerta de no encontrado */}
        {notFoundCode && (
          <div style={styles.notFoundAlert}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <strong style={{ fontSize: '13px' }}>Equipo no encontrado</strong>
            </div>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
              No se localizó ningún equipo con el código: <code>{notFoundCode}</code>
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setNotFoundCode(null)} style={styles.alertActionBtn}>
                Escanear de nuevo
              </button>
              <button onClick={onBack} style={styles.alertActionSecondaryBtn}>
                Ver catálogo
              </button>
            </div>
          </div>
        )}

        {/* Visor de cámara / Escáner */}
        <div style={styles.viewfinderWrapper}>
          {/* El contenedor techcare-qr-reader SIEMPRE permanece en el DOM para que Html5Qrcode dimensione el video correctamente */}
          <div id={scannerContainerId} style={styles.scannerHost} />

          {/* Overlay de carga mientras la cámara se sincroniza */}
          {!cameraActive && (
            <div style={styles.loadingOverlay}>
              <div style={styles.spinnerIcon}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
              <p style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700, marginTop: '8px', textAlign: 'center' }}>
                {searching ? 'Analizando código...' : 'Iniciando cámara...'}
              </p>
            </div>
          )}

          {/* Guías visuales de esquinas */}
          <div style={styles.frameCorners}>
            <div style={{ ...styles.corner, ...styles.cornerTL }} />
            <div style={{ ...styles.corner, ...styles.cornerTR }} />
            <div style={{ ...styles.corner, ...styles.cornerBL }} />
            <div style={{ ...styles.corner, ...styles.cornerBR }} />
          </div>

          {/* Línea de escaneo animada */}
          {cameraActive && !searching && <div style={styles.scanLine} />}
        </div>

        {/* Botón para cambiar lente si el dispositivo tiene múltiples cámaras */}
        {availableCameras.length > 1 && (
          <button onClick={handleSwitchCamera} style={styles.switchCamBtn}>
            🔄 Cambiar lente ({currentCameraIndex + 1}/{availableCameras.length})
          </button>
        )}

        {searching && (
          <p style={{ color: '#2563eb', fontSize: '12.5px', fontWeight: 700, textAlign: 'center', margin: '8px 0' }}>
            Buscando ficha técnica e historial...
          </p>
        )}

        {/* Mensaje si la cámara falló con opción de reintentar */}
        {cameraError && (
          <div style={styles.cameraErrorBox}>
            <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 700 }}>{cameraError}</p>
            <button onClick={() => startCameraWithDevice()} style={styles.retryBtn}>
              🔄 Reintentar encender cámara
            </button>
          </div>
        )}

        {/* Cargar imagen de archivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileScan}
        />
        <button onClick={() => fileInputRef.current?.click()} style={styles.fileBtn}>
          📁 Cargar foto / captura de QR
        </button>

        {/* Entrada manual de número de serie o código */}
        <div style={styles.manualWrap}>
          <input
            type="text"
            placeholder="O escribe serie / código QR..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={styles.manualInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleQRScanned(manualCode);
            }}
          />
          <button
            onClick={() => handleQRScanned(manualCode)}
            style={styles.manualBtn}
            disabled={!manualCode.trim() || searching}
          >
            Consultar
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 0 24px 0',
  },
  topBar: {
    width: '100%',
    maxWidth: '400px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'flex-start',
  },
  backBtn: {
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    color: '#2563eb',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '16px',
    padding: '8px 16px',
    fontSize: '12.5px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '6px 6px 14px rgba(148, 166, 212, 0.4), inset 0 2px 3px #ffffff',
  },
  scannerCard: {
    width: '100%',
    maxWidth: '400px',
    background: 'linear-gradient(145deg, #f8faff 0%, #edf2ff 100%)',
    borderRadius: '34px',
    padding: '26px 22px',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    boxShadow:
      '18px 22px 42px rgba(142, 162, 210, 0.48), -10px -10px 26px rgba(255, 255, 255, 0.95), inset 0 3px 5px #ffffff',
    color: '#172554',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#172554',
    margin: '0 0 4px 0',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '12.5px',
    color: '#475569',
    textAlign: 'center',
    margin: '0 0 18px 0',
    fontWeight: 600,
  },
  notFoundAlert: {
    width: '100%',
    background: 'linear-gradient(145deg, #ffe4e6 0%, #fecdd3 100%)',
    borderRadius: '18px',
    padding: '14px',
    color: '#be123c',
    marginBottom: '16px',
    boxSizing: 'border-box',
    boxShadow: '6px 6px 14px rgba(225, 150, 165, 0.35), inset 0 2px 3px #ffffff',
  },
  alertActionBtn: {
    padding: '7px 12px',
    backgroundColor: '#e11d48',
    border: 'none',
    color: '#ffffff',
    borderRadius: '10px',
    fontSize: '11.5px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  alertActionSecondaryBtn: {
    padding: '7px 12px',
    backgroundColor: '#ffffff',
    border: 'none',
    color: '#1e3a8a',
    borderRadius: '10px',
    fontSize: '11.5px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  viewfinderWrapper: {
    position: 'relative',
    width: '260px',
    height: '260px',
    borderRadius: '28px',
    overflow: 'hidden',
    backgroundColor: '#0a152d',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '14px',
    boxShadow: 'inset 0 0 24px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(37, 99, 235, 0.16)',
  },
  scannerHost: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: '28px',
    overflow: 'hidden',
    display: 'block',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#e3eaf8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '28px',
    zIndex: 5,
  },
  spinnerIcon: {
    animation: 'spin 1.4s linear infinite',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameCorners: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    right: '20px',
    bottom: '20px',
    pointerEvents: 'none',
    zIndex: 10,
  },
  corner: {
    position: 'absolute',
    width: '32px',
    height: '32px',
    borderColor: '#3b82f6',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTop: '4px solid #3b82f6',
    borderLeft: '4px solid #3b82f6',
    borderTopLeftRadius: '14px',
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTop: '4px solid #3b82f6',
    borderRight: '4px solid #3b82f6',
    borderTopRightRadius: '14px',
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottom: '4px solid #3b82f6',
    borderLeft: '4px solid #3b82f6',
    borderBottomLeftRadius: '14px',
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottom: '4px solid #3b82f6',
    borderRight: '4px solid #3b82f6',
    borderBottomRightRadius: '14px',
  },
  scanLine: {
    position: 'absolute',
    top: '10%',
    left: '8%',
    right: '8%',
    height: '3px',
    background: 'linear-gradient(90deg, transparent, #60a5fa, #3b82f6, transparent)',
    boxShadow: '0 0 10px #3b82f6',
    animation: 'scanAnimation 2.2s ease-in-out infinite',
    zIndex: 10,
    pointerEvents: 'none',
  },
  switchCamBtn: {
    padding: '6px 14px',
    background: '#ffffff',
    color: '#2563eb',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: '12px',
    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.1)',
  },
  cameraErrorBox: {
    width: '100%',
    background: 'linear-gradient(145deg, #fef9c3 0%, #fde68a 100%)',
    color: '#854d0e',
    borderRadius: '16px',
    padding: '12px',
    marginBottom: '14px',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  retryBtn: {
    marginTop: '6px',
    padding: '6px 14px',
    backgroundColor: '#854d0e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '11.5px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  fileBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '18px',
    color: '#2563eb',
    fontSize: '12.5px',
    fontWeight: 800,
    cursor: 'pointer',
    marginBottom: '12px',
    boxShadow: '6px 6px 14px rgba(148, 166, 212, 0.4), inset 0 2px 3px #ffffff',
  },
  manualWrap: {
    width: '100%',
    display: 'flex',
    gap: '8px',
  },
  manualInput: {
    flex: 1,
    padding: '11px 14px',
    backgroundColor: '#e3eaf8',
    border: 'none',
    borderRadius: '16px',
    color: '#172554',
    fontSize: '12.5px',
    fontWeight: 600,
    outline: 'none',
    boxShadow: 'inset 3px 3px 7px rgba(160, 176, 212, 0.55)',
  },
  manualBtn: {
    padding: '11px 16px',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: '16px',
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 6px 12px rgba(37, 99, 235, 0.3)',
  },
};
