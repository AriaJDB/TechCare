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
  equiposDisponibles = []
}: QRScannerScreenProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = 'techcare-qr-reader';

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
          aspectRatio: 1.0
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
            // Error de frame común durante escaneo continuo (no loguear para no saturar)
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
  }, []);

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

    // Pausar escaneo mientras se procesa
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.pause();
      }
    } catch {
      // Ignorar si no se pudo pausar
    }

    // 1. Buscar en Supabase en tabla equipo
    let equipoEncontrado: any = null;

    try {
      const { data, error } = await supabase
        .from('equipo')
        .select('*')
        .or(`codigo_qr.eq.${cleanCode},numero_serie.eq.${cleanCode}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        equipoEncontrado = data[0];
      }
    } catch (e) {
      console.warn('Error consultando Supabase:', e);
    }

    // 2. Si no se encontró en Supabase, verificar en equipos en memoria del catálogo
    if (!equipoEncontrado && equiposDisponibles.length > 0) {
      equipoEncontrado = equiposDisponibles.find(
        (eq) => eq.codigo_qr === cleanCode || eq.numero_serie === cleanCode
      );
    }

    setSearching(false);

    if (equipoEncontrado) {
      // TC04: Escanear un código QR válido -> Se muestra la ficha técnica y el historial del equipo
      await stopCamera();
      onEquipoEncontrado(equipoEncontrado);
    } else {
      // TC05: Escanear un código QR no registrado -> El sistema indica que el equipo no fue encontrado
      setNotFoundCode(cleanCode);
      try {
        if (html5QrCodeRef.current) {
          html5QrCodeRef.current.resume();
        }
      } catch {
        // Ignorar
      }
    }
  };

  // Simular escaneo válido (TC04)
  const handleSimularValido = () => {
    if (equiposDisponibles.length > 0) {
      handleQRScanned(equiposDisponibles[0].codigo_qr || equiposDisponibles[0].numero_serie);
    } else {
      // Si aún no hay equipos registrados en base de datos, crear equipo de muestra
      const mockEquipo = {
        id: 'mock-laptop-01',
        tipo_dispositivo: 'laptop',
        numero_serie: 'SN-TECH-2026',
        procesador: 'Intel Core i7-12700H',
        ram: '16 GB DDR5',
        almacenamiento: '1 TB NVMe SSD',
        codigo_qr: 'TECHCARE-SN-TECH-2026'
      };
      stopCamera();
      onEquipoEncontrado(mockEquipo);
    }
  };

  // Simular QR no reconocido (TC05)
  const handleSimularInvalido = () => {
    handleQRScanned('TECHCARE-INEXISTENTE-99999');
  };

  // Escanear archivo de imagen
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !html5QrCodeRef.current) return;

    try {
      setSearching(true);
      const result = await html5QrCodeRef.current.scanFile(file, true);
      handleQRScanned(result);
    } catch {
      alert('No se detectó un código QR legible en la imagen seleccionada.');
    } finally {
      setSearching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={styles.container}>
      {/* Botón superior de retroceso */}
      <div style={styles.topBar}>
        <button onClick={onBack} style={styles.backBtn}>
          ← Regresar al Catálogo
        </button>
      </div>

      <div style={styles.scannerCard}>
        <h2 style={styles.title}>Escanear equipo</h2>
        <p style={styles.subtitle}>Apunta la cámara al código QR del equipo</p>

        {/* Alerta TC05: Código QR no registrado */}
        {notFoundCode && (
          <div style={styles.notFoundAlert}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <strong style={{ fontSize: '13px' }}>Equipo no encontrado (TC05)</strong>
            </div>
            <p style={{ margin: '4px 0', fontSize: '12px', lineHeight: '1.4' }}>
              El código QR <code>{notFoundCode}</code> no corresponde a ningún equipo registrado en el sistema.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => setNotFoundCode(null)}
                style={styles.alertActionBtn}
              >
                Volver a escanear
              </button>
              <button
                onClick={onBack}
                style={{ ...styles.alertActionBtn, backgroundColor: 'rgba(59, 130, 246, 0.3)' }}
              >
                Ir a registrar equipo
              </button>
            </div>
          </div>
        )}

        {/* Visor de cámara / Escáner QR */}
        <div style={styles.viewfinderWrapper}>
          <div id={scannerContainerId} style={styles.cameraStream} />

          {/* Marco decorativo con esquinas como el mockup */}
          <div style={styles.frameCorners}>
            <div style={{ ...styles.corner, ...styles.cornerTL }} />
            <div style={{ ...styles.corner, ...styles.cornerTR }} />
            <div style={{ ...styles.corner, ...styles.cornerBL }} />
            <div style={{ ...styles.corner, ...styles.cornerBR }} />
            
            {/* Ícono de QR en el centro si la cámara aún no enciende */}
            {!cameraActive && (
              <div style={styles.placeholderIcon}>
                <span style={{ fontSize: '48px', opacity: 0.6 }}>📷</span>
                <p style={{ fontSize: '11px', color: '#93c5fd', marginTop: '6px', textAlign: 'center' }}>
                  {searching ? 'Analizando código...' : 'Iniciando cámara...'}
                </p>
              </div>
            )}

            {/* Línea animada de escáner */}
            {cameraActive && !searching && <div style={styles.scanLine} />}
          </div>
        </div>

        {searching && (
          <p style={{ color: '#60a5fa', fontSize: '12px', textAlign: 'center', margin: '8px 0' }}>
            Buscando ficha técnica e historial...
          </p>
        )}

        {cameraError && (
          <div style={styles.cameraErrorBox}>
            <p style={{ margin: '0 0 6px 0', fontSize: '12px' }}>{cameraError}</p>
            <p style={{ margin: 0, fontSize: '10px', color: '#cbd5e1' }}>
              Puedes utilizar los botones de simulación abajo o subir una imagen de la etiqueta QR generada.
            </p>
          </div>
        )}

        {/* Input oculto para subir archivo de imagen */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileScan}
        />

        {/* Botón para escanear desde imagen */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={styles.fileBtn}
        >
          📁 Cargar foto / imagen de QR
        </button>

        {/* Botones de simulación solicitados en el Sprint (Mockup) */}
        <div style={styles.actionsWrap}>
          <button
            onClick={handleSimularValido}
            style={styles.simulateValidBtn}
          >
            Simular escaneo válido
          </button>
          
          <button
            onClick={handleSimularInvalido}
            style={styles.simulateInvalidBtn}
          >
            Simular QR no reconocido
          </button>
        </div>

        {/* Búsqueda manual por texto / SN */}
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
    padding: '10px 0'
  },
  topBar: {
    width: '100%',
    maxWidth: '380px',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'flex-start'
  },
  backBtn: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#93c5fd',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  scannerCard: {
    width: '100%',
    maxWidth: '380px',
    background: 'rgba(11, 18, 32, 0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '28px',
    padding: '24px 20px',
    border: '1.5px solid rgba(96, 165, 250, 0.35)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box'
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 6px 0',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: '12px',
    color: '#93c5fd',
    textAlign: 'center',
    margin: '0 0 20px 0',
    fontWeight: '500'
  },
  notFoundAlert: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1.5px solid #ef4444',
    borderRadius: '12px',
    padding: '12px',
    color: '#fca5a5',
    marginBottom: '16px',
    boxSizing: 'border-box'
  },
  alertActionBtn: {
    padding: '6px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    border: '1px solid #ef4444',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  viewfinderWrapper: {
    position: 'relative',
    width: '260px',
    height: '260px',
    borderRadius: '24px',
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(96, 165, 250, 0.25)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
    boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.6)'
  },
  cameraStream: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  frameCorners: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    right: '20px',
    bottom: '20px',
    pointerEvents: 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  corner: {
    position: 'absolute',
    width: '32px',
    height: '32px',
    borderColor: '#60a5fa'
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTop: '3.5px solid #60a5fa',
    borderLeft: '3.5px solid #60a5fa',
    borderTopLeftRadius: '12px'
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTop: '3.5px solid #60a5fa',
    borderRight: '3.5px solid #60a5fa',
    borderTopRightRadius: '12px'
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottom: '3.5px solid #60a5fa',
    borderLeft: '3.5px solid #60a5fa',
    borderBottomLeftRadius: '12px'
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottom: '3.5px solid #60a5fa',
    borderRight: '3.5px solid #60a5fa',
    borderBottomRightRadius: '12px'
  },
  placeholderIcon: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scanLine: {
    position: 'absolute',
    top: '10%',
    left: '5%',
    right: '5%',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
    boxShadow: '0 0 8px #38bdf8',
    animation: 'scanAnimation 2.2s ease-in-out infinite'
  },
  cameraErrorBox: {
    width: '100%',
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    border: '1px solid rgba(234, 179, 8, 0.4)',
    color: '#fef08a',
    borderRadius: '10px',
    padding: '10px',
    marginBottom: '14px',
    textAlign: 'center',
    boxSizing: 'border-box'
  },
  fileBtn: {
    width: '100%',
    padding: '9px',
    background: 'rgba(30, 58, 138, 0.35)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: '12px',
    color: '#93c5fd',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '12px'
  },
  actionsWrap: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '16px'
  },
  simulateValidBtn: {
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '14px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 8px 18px -4px rgba(29, 78, 216, 0.7)'
  },
  simulateInvalidBtn: {
    width: '100%',
    padding: '12px',
    background: 'rgba(15, 23, 42, 0.8)',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '14px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  manualWrap: {
    width: '100%',
    display: 'flex',
    gap: '8px'
  },
  manualInput: {
    flex: 1,
    padding: '9px 12px',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '12px',
    outline: 'none'
  },
  manualBtn: {
    padding: '9px 14px',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
