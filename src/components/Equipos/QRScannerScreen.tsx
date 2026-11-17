import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../supabaseClient';

interface QRScannerScreenProps {
  onBack: () => void;
  onEquipoEncontrado: (equipo: any) => void;
  equiposDisponibles?: any[];
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

  // Iniciar la cámara al montar
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      try {
        setCameraError(null);
        const scanner = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = scanner;

        // Configuración de escaneo
        const qrConfig = {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        };

        // Solicitar cámara trasera (environment) para smartphones
        await scanner.start(
          { facingMode: 'environment' },
          qrConfig,
          (decodedText) => {
            if (isMounted) {
              handleQRScanned(decodedText);
            }
          },
          () => {
            // Frame scan loop
          }
        );

        if (isMounted) {
          setCameraActive(true);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('No se pudo iniciar la cámara automáticamente:', err);
          setCameraActive(false);
          let mensaje = 'No se pudo acceder a la cámara.';
          if (err?.name === 'NotAllowedError') {
            mensaje = 'Permiso de cámara denegado. Concede permisos a la aplicación o al navegador.';
          } else if (err?.name === 'NotFoundError') {
            mensaje = 'No se detectó ninguna cámara disponible en este dispositivo.';
          } else if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
            mensaje = 'Los navegadores móviles requieren HTTPS o localhost para encender la cámara web.';
          }
          setCameraError(mensaje);
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSearching(true);
    setNotFoundCode(null);

    try {
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(scannerContainerId);
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
          <div
            id={scannerContainerId}
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              display: cameraActive ? 'block' : 'none',
            }}
          />

          {!cameraActive && (
            <div style={styles.placeholderIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
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

        {searching && (
          <p style={{ color: '#2563eb', fontSize: '12.5px', fontWeight: 700, textAlign: 'center', margin: '8px 0' }}>
            Buscando ficha técnica e historial...
          </p>
        )}

        {/* Mensaje si la cámara falló */}
        {cameraError && (
          <div style={styles.cameraErrorBox}>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 700 }}>{cameraError}</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#854d0e' }}>
              Puedes cargar una foto de la etiqueta QR o escribir el número de serie abajo.
            </p>
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
          Cargar foto / imagen de QR
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
    width: '250px',
    height: '250px',
    borderRadius: '28px',
    overflow: 'hidden',
    backgroundColor: '#e3eaf8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
    boxShadow: 'inset 6px 6px 14px rgba(155, 172, 212, 0.6), inset -6px -6px 14px rgba(255, 255, 255, 0.9)',
  },
  frameCorners: {
    position: 'absolute',
    top: '22px',
    left: '22px',
    right: '22px',
    bottom: '22px',
    pointerEvents: 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: '32px',
    height: '32px',
    borderColor: '#2563eb',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTop: '4px solid #2563eb',
    borderLeft: '4px solid #2563eb',
    borderTopLeftRadius: '14px',
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTop: '4px solid #2563eb',
    borderRight: '4px solid #2563eb',
    borderTopRightRadius: '14px',
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottom: '4px solid #2563eb',
    borderLeft: '4px solid #2563eb',
    borderBottomLeftRadius: '14px',
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottom: '4px solid #2563eb',
    borderRight: '4px solid #2563eb',
    borderBottomRightRadius: '14px',
  },
  placeholderIcon: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    top: '10%',
    left: '5%',
    right: '5%',
    height: '3px',
    background: 'linear-gradient(90deg, transparent, #2563eb, transparent)',
    boxShadow: '0 0 8px #3b82f6',
    animation: 'scanAnimation 2.2s ease-in-out infinite',
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
