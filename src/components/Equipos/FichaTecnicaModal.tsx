import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { getHistorialEquipo, agregarMantenimiento, type MantenimientoRecord } from '../../utils/historialService';
import { descargarEtiquetaQR, imprimirEtiquetaQR } from '../../utils/qrExporter';
import { calcularProximaFecha, calcularSemaforo, type CicloMeses, type EstadoSemaforo } from '../../utils/mantenimiento';

interface FichaTecnicaProps {
  equipo: any;
  onClose: () => void;
  onScanAnother?: () => void;
  currentUserEmail?: string;
}

export default function FichaTecnicaModal({
  equipo,
  onClose,
  onScanAnother,
  currentUserEmail
}: FichaTecnicaProps) {
  const [historial, setHistorial] = useState<MantenimientoRecord[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Campos para nuevo mantenimiento
  const [fecha, setFecha] = useState(new Date().toISOString().substring(0, 10));
  const [subsistema, setSubsistema] = useState('Refrigeración / Térmico');
  const [diagnostico, setDiagnostico] = useState('');
  const [tecnico, setTecnico] = useState(currentUserEmail || 'Técnico de Turno');
  const [tipoIntervencion, setTipoIntervencion] = useState<'preventiva' | 'correctiva'>('preventiva');
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  const qrContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarHistorial();
  }, [equipo]);

  const cargarHistorial = async () => {
    setLoadingHistorial(true);
    const data = await getHistorialEquipo(equipo);
    setHistorial(data);
    setLoadingHistorial(false);
  };

  const handleDescargarQR = () => {
    const svg = qrContainerRef.current?.querySelector('svg') || null;
    descargarEtiquetaQR({
      tipo_dispositivo: equipo.tipo_dispositivo || 'Dispositivo',
      numero_serie: equipo.numero_serie || 'SN-UNKNOWN',
      procesador: equipo.procesador,
      ram: equipo.ram,
      almacenamiento: equipo.almacenamiento,
      codigo_qr: equipo.codigo_qr
    }, svg);
  };

  const handleImprimirQR = () => {
    const svg = qrContainerRef.current?.querySelector('svg') || null;
    imprimirEtiquetaQR({
      tipo_dispositivo: equipo.tipo_dispositivo || 'Dispositivo',
      numero_serie: equipo.numero_serie || 'SN-UNKNOWN',
      procesador: equipo.procesador,
      ram: equipo.ram,
      almacenamiento: equipo.almacenamiento,
      codigo_qr: equipo.codigo_qr
    }, svg);
  };

  const handleGuardarMantenimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnostico.trim() || !tecnico.trim() || !subsistema.trim()) {
      alert('Por favor completa todos los campos del mantenimiento');
      return;
    }

    setGuardando(true);
    await agregarMantenimiento({
      id_equipo: equipo.id,
      codigo_qr: equipo.codigo_qr,
      numero_serie: equipo.numero_serie,
      fecha,
      subsistema,
      diagnostico,
      tecnico,
      tipo_intervencion: tipoIntervencion,
      estado: 'completado'
    });

    setGuardando(false);
    setMensajeExito('¡Mantenimiento registrado y anexado al historial!');
    setDiagnostico('');
    setShowAddForm(false);
    await cargarHistorial();

    setTimeout(() => setMensajeExito(''), 3500);
  };

  // Cálculo de Semáforo de Estado según HU7 y HU8
  let estadoSemaforo: EstadoSemaforo = 'verde';
  let fechaProximoMantenimiento: string = 'No determinada';

  if (historial.length > 0) {
    try {
      const fechaUltimo = new Date(historial[0].fecha + 'T12:00:00Z');
      const ciclo: CicloMeses = 6; // Ciclo semestral estándar
      const proxima = calcularProximaFecha(fechaUltimo, ciclo);
      estadoSemaforo = calcularSemaforo(proxima);
      fechaProximoMantenimiento = proxima.toISOString().substring(0, 10);
    } catch {
      estadoSemaforo = 'verde';
    }
  }

  const semaforoColor = {
    verde: '#22c55e',
    amarillo: '#eab308',
    rojo: '#ef4444'
  }[estadoSemaforo];

  const semaforoTexto = {
    verde: 'Al corriente (> 15 días restantes)',
    amarillo: 'Próximo a vencer (≤ 15 días)',
    rojo: 'Mantenimiento Vencido'
  }[estadoSemaforo];

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        {/* Cabecera del modal */}
        <div style={styles.header}>
          <div style={styles.headerTitleWrap}>
            <span style={styles.headerIcon}>
              {equipo.tipo_dispositivo === 'laptop' ? '💻' : equipo.tipo_dispositivo === 'desktop' ? '🖥️' : '🗄️'}
            </span>
            <div>
              <h2 style={styles.title}>Ficha Técnica del Equipo</h2>
              <p style={styles.subtitle}>Detalles de hardware y trazabilidad</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Cerrar">✕</button>
        </div>

        {mensajeExito && <div style={styles.successBanner}>{mensajeExito}</div>}

        <div style={styles.scrollBody}>
          {/* Tarjeta de Ficha Técnica Principal */}
          <div style={styles.specsCard}>
            <div style={styles.specHeaderRow}>
              <div>
                <span style={styles.tipoBadge}>
                  {equipo.tipo_dispositivo ? equipo.tipo_dispositivo.toUpperCase() : 'DISPOSITIVO'}
                </span>
                <h3 style={styles.serialTitle}>SN: {equipo.numero_serie}</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ ...styles.semaforoBadge, borderColor: semaforoColor, color: semaforoColor }}>
                  <span style={{ ...styles.semaforoDot, backgroundColor: semaforoColor }} />
                  {estadoSemaforo.toUpperCase()}
                </span>
                <p style={styles.semaforoDesc}>{semaforoTexto}</p>
              </div>
            </div>

            <div style={styles.specsGrid}>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Procesador</span>
                <span style={styles.specValue}>{equipo.procesador || 'No especificado'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Memoria RAM</span>
                <span style={styles.specValue}>{equipo.ram || 'No especificado'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Almacenamiento</span>
                <span style={styles.specValue}>{equipo.almacenamiento || 'No especificado'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Próximo Mant.</span>
                <span style={styles.specValue}>{fechaProximoMantenimiento}</span>
              </div>
            </div>

            {/* Código QR y botones de descarga / impresión física */}
            <div style={styles.qrSection}>
              <div ref={qrContainerRef} style={styles.qrBox} data-qr-value={equipo.codigo_qr}>
                <QRCode value={equipo.codigo_qr} size={110} />
              </div>
              <div style={styles.qrActions}>
                <p style={styles.qrCodeText}>
                  <strong>Código QR:</strong> {equipo.codigo_qr}
                </p>
                <div style={styles.buttonRow}>
                  <button onClick={handleDescargarQR} style={styles.downloadBtn}>
                    📥 Descargar QR (PNG)
                  </button>
                  <button onClick={handleImprimirQR} style={styles.printBtn}>
                    🖨️ Imprimir Etiqueta
                  </button>
                </div>
                <p style={styles.printHint}>
                  Descarga o imprime esta etiqueta para adherirla en la carcasa física del equipo.
                </p>
              </div>
            </div>
          </div>

          {/* Sección de Historial de Mantenimientos (TC11 / HU9) */}
          <div style={styles.historialSection}>
            <div style={styles.historialHeader}>
              <div>
                <h3 style={styles.sectionHeading}>📋 Historial de Mantenimientos</h3>
                <p style={styles.sectionSub}>
                  Listado cronológico inverso · Fecha, subsistema, diagnóstico y técnico
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={styles.addMaintenanceBtn}
              >
                {showAddForm ? 'Cancelar' : '+ Registrar Mantenimiento'}
              </button>
            </div>

            {/* Formulario para agregar un mantenimiento */}
            {showAddForm && (
              <form onSubmit={handleGuardarMantenimiento} style={styles.newForm}>
                <h4 style={styles.newFormTitle}>Nuevo Registro de Mantenimiento</h4>
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Fecha de Intervención</label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      required
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Subsistema Intervenido</label>
                    <select
                      value={subsistema}
                      onChange={(e) => setSubsistema(e.target.value)}
                      style={styles.input}
                    >
                      <option value="Refrigeración / Térmico">Refrigeración / Térmico</option>
                      <option value="Almacenamiento (SSD / Disco)">Almacenamiento (SSD / Disco)</option>
                      <option value="Memoria RAM">Memoria RAM</option>
                      <option value="Fuente de poder y Batería">Fuente de poder y Batería</option>
                      <option value="Placa Base y Conectores">Placa Base y Conectores</option>
                      <option value="Pantalla y Video">Pantalla y Video</option>
                      <option value="Sistema Operativo y Firmware">Sistema Operativo y Firmware</option>
                    </select>
                  </div>
                </div>

                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Tipo de Intervención</label>
                    <select
                      value={tipoIntervencion}
                      onChange={(e) => setTipoIntervencion(e.target.value as any)}
                      style={styles.input}
                    >
                      <option value="preventiva">Preventiva</option>
                      <option value="correctiva">Correctiva</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Técnico Responsable</label>
                    <input
                      type="text"
                      value={tecnico}
                      onChange={(e) => setTecnico(e.target.value)}
                      required
                      placeholder="Nombre del técnico"
                      style={styles.input}
                    />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Diagnóstico y Acciones Realizadas</label>
                  <textarea
                    value={diagnostico}
                    onChange={(e) => setDiagnostico(e.target.value)}
                    required
                    placeholder="Describe los hallazgos técnicos, pruebas ejecutadas y repuestos o limpiezas aplicadas..."
                    rows={3}
                    style={{ ...styles.input, resize: 'vertical' }}
                  />
                </div>

                <button type="submit" disabled={guardando} style={styles.saveBtn}>
                  {guardando ? 'Guardando...' : 'Guardar e Integrar al Historial'}
                </button>
              </form>
            )}

            {/* Listado de mantenimientos en orden cronológico inverso */}
            {loadingHistorial ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                Cargando historial técnico...
              </p>
            ) : historial.length === 0 ? (
              <div style={styles.emptyHistorial}>
                <p>No hay mantenimientos previos registrados para este equipo.</p>
              </div>
            ) : (
              <div style={styles.timeline}>
                {historial.map((reg, index) => (
                  <div key={reg.id || index} style={styles.timelineItem}>
                    <div style={styles.timelinePoint}>
                      <span style={{ fontSize: '12px' }}>🛠️</span>
                    </div>
                    <div style={styles.timelineCard}>
                      <div style={styles.timelineHeader}>
                        <div style={styles.timelineSubsistema}>
                          <span style={styles.tagSubsistema}>{reg.subsistema}</span>
                          <span style={styles.tagTipo}>
                            {reg.tipo_intervencion === 'correctiva' ? '⚠️ Correctivo' : '🛡️ Preventivo'}
                          </span>
                        </div>
                        <span style={styles.timelineFecha}>📅 {reg.fecha}</span>
                      </div>

                      <div style={styles.timelineBody}>
                        <p style={styles.diagnosticoLabel}>Diagnóstico técnico:</p>
                        <p style={styles.diagnosticoText}>{reg.diagnostico}</p>
                      </div>

                      <div style={styles.timelineFooter}>
                        <span style={styles.tecnicoLabel}>
                          👷 Técnico responsable: <strong>{reg.tecnico}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Barra inferior de navegación */}
        <div style={styles.footerActions}>
          {onScanAnother && (
            <button onClick={onScanAnother} style={styles.scanAnotherBtn}>
              📷 Escanear otro QR
            </button>
          )}
          <button onClick={onClose} style={styles.closeActionBtn}>
            Volver al Catálogo
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 11, 20, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '12px',
    boxSizing: 'border-box'
  },
  modalCard: {
    width: '100%',
    maxWidth: '560px',
    maxHeight: '94vh',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1.5px solid rgba(96, 165, 250, 0.35)',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'linear-gradient(180deg, rgba(30, 58, 138, 0.5) 0%, rgba(15, 23, 42, 0) 100%)'
  },
  headerTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  headerIcon: {
    fontSize: '26px',
    background: 'rgba(59, 130, 246, 0.2)',
    padding: '8px',
    borderRadius: '12px',
    border: '1px solid rgba(96, 165, 250, 0.3)'
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
    color: '#ffffff'
  },
  subtitle: {
    fontSize: '12px',
    color: '#93c5fd',
    margin: '2px 0 0 0'
  },
  closeBtn: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: '#cbd5e1',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollBody: {
    padding: '18px 20px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  specsCard: {
    backgroundColor: 'rgba(30, 58, 138, 0.25)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: '16px',
    padding: '16px'
  },
  specHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '12px'
  },
  tipoBadge: {
    fontSize: '10px',
    letterSpacing: '0.8px',
    fontWeight: '700',
    color: '#93c5fd',
    background: 'rgba(59, 130, 246, 0.2)',
    padding: '3px 8px',
    borderRadius: '6px',
    display: 'inline-block',
    marginBottom: '4px'
  },
  serialTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0
  },
  semaforoBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 10px',
    borderRadius: '20px',
    border: '1px solid',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  semaforoDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  semaforoDesc: {
    fontSize: '10px',
    color: '#cbd5e1',
    margin: '4px 0 0 0'
  },
  specsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '16px'
  },
  specItem: {
    background: 'rgba(15, 23, 42, 0.6)',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  specLabel: {
    fontSize: '10px',
    color: '#94a3b8',
    display: 'block',
    marginBottom: '2px'
  },
  specValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#f8fafc'
  },
  qrSection: {
    display: 'flex',
    gap: '14px',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.7)',
    padding: '12px',
    borderRadius: '12px',
    border: '1px dashed rgba(96, 165, 250, 0.3)'
  },
  qrBox: {
    background: '#ffffff',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  qrActions: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  qrCodeText: {
    fontSize: '11px',
    color: '#cbd5e1',
    margin: 0,
    wordBreak: 'break-all'
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  downloadBtn: {
    background: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  printBtn: {
    background: 'rgba(59, 130, 246, 0.15)',
    color: '#93c5fd',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  printHint: {
    fontSize: '10px',
    color: '#94a3b8',
    margin: 0,
    fontStyle: 'italic'
  },
  historialSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  historialHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px'
  },
  sectionHeading: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#f8fafc',
    margin: 0
  },
  sectionSub: {
    fontSize: '11px',
    color: '#94a3b8',
    margin: '2px 0 0 0'
  },
  addMaintenanceBtn: {
    background: 'rgba(34, 197, 94, 0.15)',
    color: '#4ade80',
    border: '1px solid rgba(34, 197, 94, 0.4)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  newForm: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '14px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  newFormTitle: {
    margin: '0 0 6px 0',
    fontSize: '13px',
    color: '#86efac'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px'
  },
  label: {
    fontSize: '10px',
    color: '#cbd5e1',
    display: 'block',
    marginBottom: '4px',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '12px',
    boxSizing: 'border-box'
  },
  saveBtn: {
    background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '4px'
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  timelineItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },
  timelinePoint: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'rgba(30, 58, 138, 0.6)',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '4px'
  },
  timelineCard: {
    flex: 1,
    background: 'rgba(15, 23, 42, 0.65)',
    border: '1px solid rgba(96, 165, 250, 0.2)',
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px'
  },
  timelineSubsistema: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center'
  },
  tagSubsistema: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#93c5fd',
    background: 'rgba(59, 130, 246, 0.2)',
    padding: '2px 8px',
    borderRadius: '6px'
  },
  tagTipo: {
    fontSize: '10px',
    color: '#cbd5e1'
  },
  timelineFecha: {
    fontSize: '11px',
    color: '#cbd5e1',
    fontWeight: '500'
  },
  timelineBody: {
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '6px'
  },
  diagnosticoLabel: {
    fontSize: '10px',
    color: '#94a3b8',
    margin: '0 0 2px 0'
  },
  diagnosticoText: {
    fontSize: '12px',
    color: '#e2e8f0',
    margin: 0,
    lineHeight: '1.4'
  },
  timelineFooter: {
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px'
  },
  tecnicoLabel: {
    color: '#94a3b8'
  },
  emptyHistorial: {
    textAlign: 'center',
    padding: '24px',
    background: 'rgba(15, 23, 42, 0.3)',
    borderRadius: '12px',
    color: '#94a3b8',
    fontSize: '12px'
  },
  successBanner: {
    padding: '8px 16px',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderBottom: '1px solid #22c55e',
    color: '#86efac',
    fontSize: '12px',
    textAlign: 'center'
  },
  footerActions: {
    display: 'flex',
    gap: '10px',
    padding: '14px 20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(11, 18, 32, 0.5)'
  },
  scanAnotherBtn: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  closeActionBtn: {
    padding: '10px 18px',
    background: 'transparent',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    fontSize: '13px',
    cursor: 'pointer'
  }
};
