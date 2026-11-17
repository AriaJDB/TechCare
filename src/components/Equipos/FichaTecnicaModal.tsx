import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import {
  getHistorialEquipo,
  agregarMantenimiento,
  calcularResumenSemaforoEquipo,
  calcularMetricasFiabilidad,
  establecerOverrideSemaforo,
  guardarCicloEquipo,
  type MantenimientoRecord,
} from '../../utils/historialService';
import { descargarEtiquetaQR } from '../../utils/qrExporter';
import { calcularProximaFecha, type CicloMeses, type EstadoSemaforo } from '../../utils/mantenimiento';
import { iniciarOrden } from '../../services/checklistService';
import { ETAPAS_INFO, type EvidenciaItem } from '../../services/evidenciasService';
import { obtenerDirectorioIngenieros, obtenerPerfilUsuario } from '../../services/perfilService';
import { dispararNotificacionVencimiento } from '../../services/notificationService';
import ChecklistScreen from '../Checklist/ChecklistScreen';

interface FichaTecnicaProps {
  equipo: any;
  onClose: () => void;
  onEdit?: (equipo: any) => void;
  onDelete?: (id: string) => void;
  onSemaforoChange?: () => void;
  currentUserEmail?: string;
}

type SeccionModal = 'ficha' | 'servicio' | 'historial';

const CAUSAS_RAIZ_COMUNES = [
  'Ventilador con rodamiento trabado',
  'Thermal pad / pasta térmica degradada',
  'Fuente de poder inestable',
  'Sectores defectuosos en unidad SSD/HDD',
  'Soldadura fría en puerto de placa base',
];

export default function FichaTecnicaModal({
  equipo,
  onClose,
  onEdit,
  onDelete,
  onSemaforoChange,
  currentUserEmail,
}: FichaTecnicaProps) {
  const perfilActual = obtenerPerfilUsuario(
    currentUserEmail ? { user: { email: currentUserEmail } } : undefined
  );
  const directorioIngenieros = obtenerDirectorioIngenieros();
  const claveEquipo = equipo.id || equipo.id_equipo || equipo.numero_serie || equipo.codigo_qr || 'default';

  const [seccionActiva, setSeccionActiva] = useState<SeccionModal>('ficha');
  const [historial, setHistorial] = useState<MantenimientoRecord[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Formulario nuevo mantenimiento (HU7 / HU8 / HU9)
  const [fecha, setFecha] = useState(new Date().toISOString().substring(0, 10));
  const [subsistema, setSubsistema] = useState('Refrigeración / Térmico');
  const [diagnostico, setDiagnostico] = useState('');
  const [causaRaiz, setCausaRaiz] = useState('');
  const [tecnico, setTecnico] = useState(perfilActual.nombreMostrar || 'Ing. Gabriel Flores');
  const [tipoIntervencion, setTipoIntervencion] = useState<'preventiva' | 'correctiva'>('preventiva');
  const [cicloForm, setCicloForm] = useState<CicloMeses>(6);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  // Estado reactivo para semáforo y ciclo
  const [tickSemaforo, setTickSemaforo] = useState(0);

  // Checklist de servicio
  const [idOrdenActiva, setIdOrdenActiva] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [iniciandoServicio, setIniciandoServicio] = useState(false);
  const [lightboxEvidencia, setLightboxEvidencia] = useState<EvidenciaItem | null>(null);

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

  const handleDescargarEtiqueta = () => {
    const svg = qrContainerRef.current?.querySelector('svg') || null;
    descargarEtiquetaQR(
      {
        tipo_dispositivo: equipo.tipo_dispositivo || 'Dispositivo',
        numero_serie: equipo.numero_serie || 'SN-UNKNOWN',
        procesador: equipo.procesador,
        ram: equipo.ram,
        almacenamiento: equipo.almacenamiento,
        codigo_qr: equipo.codigo_qr,
      },
      svg
    );
  };

  // Cálculo de Semáforo, Próxima Fecha (HU7/HU8) y Fiabilidad/Fallas Recurrentes (HU9)
  const resumenSemaforo = calcularResumenSemaforoEquipo(equipo, historial);
  const metricas = calcularMetricasFiabilidad(historial);
  const estadoSemaforo = resumenSemaforo.estadoSemaforo;
  const fechaProximoMantenimiento = resumenSemaforo.proximaFecha;
  const ultimoIngeniero = resumenSemaforo.ultimoIngeniero;

  const handleCambiarCicloEquipo = (nuevoCiclo: CicloMeses) => {
    guardarCicloEquipo(claveEquipo, nuevoCiclo);
    setCicloForm(nuevoCiclo);
    setTickSemaforo((t) => t + 1);
    if (onSemaforoChange) onSemaforoChange();
  };

  const handleCambiarSemaforo = async (nuevoEstado: EstadoSemaforo) => {
    establecerOverrideSemaforo(claveEquipo, nuevoEstado);
    setTickSemaforo((t) => t + 1);
    if (onSemaforoChange) onSemaforoChange();

    if (nuevoEstado === 'rojo') {
      await dispararNotificacionVencimiento({
        idEquipo: claveEquipo,
        numeroSerie: equipo.numero_serie || 'SN-EQUIPO',
        tipoDispositivo: equipo.tipo_dispositivo || 'Equipo',
        ultimoIngeniero,
        proximaFecha: fechaProximoMantenimiento,
        estadoSemaforo: 'rojo',
      });
      setMensajeExito(
        `🔔 Notificación enviada al teléfono para ${ultimoIngeniero} (Equipo ${equipo.numero_serie} en ROJO).`
      );
      setTimeout(() => setMensajeExito(''), 4500);
    }
  };

  const handleGuardarMantenimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnostico.trim() || !tecnico.trim() || !subsistema.trim()) {
      alert('Por favor completa todos los campos del mantenimiento');
      return;
    }

    setGuardando(true);
    guardarCicloEquipo(claveEquipo, cicloForm);
    // Al registrar un nuevo mantenimiento, restablecer semáforo automático
    establecerOverrideSemaforo(claveEquipo, null);

    const fechaBase = new Date(fecha + 'T12:00:00Z');
    const proximaCalc = calcularProximaFecha(fechaBase, cicloForm).toISOString().substring(0, 10);

    await agregarMantenimiento({
      id_equipo: equipo.id || equipo.id_equipo,
      codigo_qr: equipo.codigo_qr,
      numero_serie: equipo.numero_serie,
      fecha,
      subsistema,
      diagnostico,
      causa_raiz: causaRaiz.trim() || 'Inspección y mantenimiento estándar completado',
      tecnico,
      tipo_intervencion: tipoIntervencion,
      ciclo_meses: cicloForm,
      proxima_fecha_mtto: proximaCalc,
      estado: 'completado',
    });

    setGuardando(false);
    setMensajeExito('Mantenimiento y causa raíz registrados en el historial.');
    setDiagnostico('');
    setCausaRaiz('');
    setShowAddForm(false);
    await cargarHistorial();
    if (onSemaforoChange) onSemaforoChange();

    setTimeout(() => setMensajeExito(''), 3500);
  };

  const semaforoConfig = {
    verde: {
      bg: 'linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%)',
      text: '#065f46',
      dot: 'radial-gradient(circle at 35% 35%, #4ade80, #16a34a)',
    },
    amarillo: {
      bg: 'linear-gradient(145deg, #fef9c3 0%, #fde047 100%)',
      text: '#854d0e',
      dot: 'radial-gradient(circle at 35% 35%, #facc15, #ca8a04)',
    },
    rojo: {
      bg: 'linear-gradient(145deg, #ffe4e6 0%, #fecdd3 100%)',
      text: '#9f1239',
      dot: 'radial-gradient(circle at 35% 35%, #fb7185, #e11d48)',
    },
  }[estadoSemaforo];

  const semaforoTexto = {
    verde: 'Al corriente (> 15 días restantes)',
    amarillo: 'Próximo a vencer (≤ 15 días)',
    rojo: `Mantenimiento Vencido · Notificado a ${ultimoIngeniero}`,
  }[estadoSemaforo];

  const handleIniciarServicio = async () => {
    try {
      setIniciandoServicio(true);
      const idEq = equipo.id_equipo || equipo.id;
      const orden = await iniciarOrden(idEq);
      setIdOrdenActiva(orden.id_orden);
      setShowChecklist(true);
    } catch {
      const fallbackId = `orden-local-${equipo.id || equipo.numero_serie || Date.now()}`;
      setIdOrdenActiva(fallbackId);
      setShowChecklist(true);
    } finally {
      setIniciandoServicio(false);
    }
  };

  if (showChecklist && idOrdenActiva) {
    return (
      <div style={styles.overlay}>
        <div style={{ ...styles.modalCard, overflowY: 'auto', maxHeight: '95vh', WebkitOverflowScrolling: 'touch' }}>
          <ChecklistScreen
            idOrden={idOrdenActiva}
            equipo={equipo}
            onBack={() => {
              setShowChecklist(false);
              cargarHistorial();
              if (onSemaforoChange) onSemaforoChange();
            }}
            onOrdenCerrada={() => {
              setShowChecklist(false);
              setSeccionActiva('historial');
              cargarHistorial();
              if (onSemaforoChange) onSemaforoChange();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} data-semaforo-tick={tickSemaforo}>
      <div style={styles.modalCard}>
        {/* Cabecera del modal */}
        <div style={styles.header}>
          <div style={styles.headerTitleWrap}>
            <div style={styles.headerIconBox}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <h2 style={styles.title}>
                {seccionActiva === 'ficha'
                  ? 'Ficha Técnica del Equipo'
                  : seccionActiva === 'servicio'
                  ? 'Servicio Técnico y Verificaciones'
                  : 'Historial de Servicio y Fallas'}
              </h2>
              <p style={styles.subtitle}>Detalles de hardware y trazabilidad</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Cerrar">
            ✕
          </button>
        </div>

        <div style={styles.headerDivider} />

        {mensajeExito && <div style={styles.successBanner}>{mensajeExito}</div>}

        <div style={styles.scrollBody}>
          {/* ALERTA DE FALLA RECURRENTE DETECTADA (HU9) */}
          {metricas.alertasRecurrentes.length > 0 && (
            <div style={styles.recurrentAlertCard}>
              <div style={styles.recurrentAlertHeader}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <div>
                  <strong style={styles.recurrentAlertTitle}>
                    Falla Recurrente Detectada ({metricas.alertasRecurrentes[0].subsistema})
                  </strong>
                  <span style={styles.recurrentAlertSub}>
                    {metricas.alertasRecurrentes[0].totalIncidencias} intervenciones correctivas registradas en este subsistema
                  </span>
                </div>
              </div>
              <p style={styles.recurrentAlertBody}>
                <strong>Causas raíz previas:</strong>{' '}
                {metricas.alertasRecurrentes[0].causasRaizPrevias.join(' · ')}
              </p>
              <p style={styles.recurrentAlertHint}>
                💡 <strong>Recomendación antes de cerrar orden:</strong>{' '}
                {metricas.alertasRecurrentes[0].sugerenciaRevision}
              </p>
            </div>
          )}

          {/* SECCIÓN 1: FICHA TÉCNICA */}
          {seccionActiva === 'ficha' && (
            <div style={styles.specsCard}>
              <div style={styles.badgesTopRow}>
                <span style={styles.tipoBadge}>
                  {equipo.tipo_dispositivo ? equipo.tipo_dispositivo.toUpperCase() : 'DESKTOP'}
                </span>
                <span style={{ ...styles.semaforoBadge, background: semaforoConfig.bg, color: semaforoConfig.text }}>
                  <span style={{ ...styles.semaforoDot, background: semaforoConfig.dot }} />
                  {estadoSemaforo.toUpperCase()}
                </span>
              </div>

              <h3 style={styles.serialTitle}>SN: {equipo.numero_serie}</h3>
              <p style={styles.semaforoDesc}>{semaforoTexto}</p>

              {/* Controles de Semáforo y Ciclo de Mantenimiento */}
              <div style={styles.semaforoControlBox}>
                <div style={styles.semaforoControlRow}>
                  <span style={styles.controlLabel}>Estado del Semáforo:</span>
                  <div style={styles.semaforoSwitchGroup}>
                    {(['verde', 'amarillo', 'rojo'] as EstadoSemaforo[]).map((est) => {
                      const active = estadoSemaforo === est;
                      const colors = {
                        verde: { bg: '#dcfce7', color: '#065f46', dot: '#16a34a', label: 'Verde' },
                        amarillo: { bg: '#fef9c3', color: '#854d0e', dot: '#ca8a04', label: 'Amarillo' },
                        rojo: { bg: '#ffe4e6', color: '#9f1239', dot: '#e11d48', label: 'Rojo' },
                      }[est];
                      return (
                        <button
                          key={est}
                          type="button"
                          onClick={() => handleCambiarSemaforo(est)}
                          style={{
                            ...styles.semaforoSwitchBtn,
                            background: active ? colors.bg : '#ffffff',
                            color: active ? colors.color : '#475569',
                            border: active ? `1.5px solid ${colors.dot}` : '1px solid rgba(255,255,255,0.9)',
                            fontWeight: active ? 800 : 600,
                          }}
                        >
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: colors.dot,
                              display: 'inline-block',
                            }}
                          />
                          {colors.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ ...styles.semaforoControlRow, marginTop: '8px' }}>
                  <span style={styles.controlLabel}>Ciclo programado (HU7):</span>
                  <div style={styles.semaforoSwitchGroup}>
                    {([3, 6, 12] as CicloMeses[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCambiarCicloEquipo(c)}
                        style={{
                          ...styles.cicloPillBtn,
                          ...(resumenSemaforo.cicloMeses === c ? styles.cicloPillBtnActive : {}),
                        }}
                      >
                        {c}m
                      </button>
                    ))}
                  </div>
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
                  <span style={styles.specLabel}>Próximo Mant. ({resumenSemaforo.cicloMeses}m)</span>
                  <span style={styles.specValue}>{fechaProximoMantenimiento}</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specLabel}>Último Ingeniero</span>
                  <span style={styles.specValue}>{ultimoIngeniero}</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specLabel}>Fiabilidad del Activo</span>
                  <span style={styles.specValue}>
                    {metricas.indiceFiabilidad}% ({metricas.preventivas}P / {metricas.correctivas}C)
                  </span>
                </div>
              </div>

              {/* Tarjeta de Código QR de la Ficha */}
              <div style={styles.qrSectionCard}>
                <div style={styles.qrTopRow}>
                  <div ref={qrContainerRef} style={styles.qrBox} data-qr-value={equipo.codigo_qr}>
                    <QRCode value={equipo.codigo_qr} size={112} />
                  </div>
                  <div style={styles.qrInfoCol}>
                    <strong style={styles.qrTitleLabel}>Código QR</strong>
                    <p style={styles.qrCodeText}>{equipo.codigo_qr}</p>
                  </div>
                </div>

                <div style={styles.qrButtonsRow}>
                  <button onClick={handleDescargarEtiqueta} style={styles.downloadBtn}>
                    <span>↓</span>
                    <span>Descargar Etiqueta</span>
                  </button>
                </div>

                <p style={styles.printHint}>
                  Descarga la etiqueta en tu dispositivo para adherirla en la carcasa física del equipo.
                </p>
              </div>

              {/* Botones de Editar y Eliminar */}
              {(onEdit || onDelete) && (
                <div style={styles.editDeleteRow}>
                  {onEdit && (
                    <button type="button" onClick={() => onEdit(equipo)} style={styles.editEquipoBtn}>
                      Editar Equipo
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(equipo.id || equipo.id_equipo)}
                      style={styles.deleteEquipoBtn}
                    >
                      Eliminar Equipo
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN 2: CHECKLIST DE SERVICIO */}
          {seccionActiva === 'servicio' && (
            <div style={styles.serviceSection}>
              <div style={styles.serviceHeaderLine}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <h4 style={styles.serviceSectionTitle}>Servicio Técnico y Verificaciones</h4>
              </div>
              <p style={styles.serviceSectionSub}>
                Inicia la orden de servicio o reanuda el checklist de inspección técnica (limpieza, ventiladores, pasta térmica, puertos, temperatura, diagnóstico S.M.A.R.T. y fotografías de evidencia). Al cerrar la orden, el patrón Observer actualizará automáticamente la próxima fecha de mantenimiento, el semáforo y el análisis de causas raíz.
              </p>
              <button onClick={handleIniciarServicio} disabled={iniciandoServicio} style={styles.iniciarServicioBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <span>{iniciandoServicio ? 'Iniciando orden...' : 'Iniciar servicio / Abrir Checklist'}</span>
              </button>
            </div>
          )}

          {/* SECCIÓN 3: HISTORIAL DE SERVICIO Y FALLAS (HU9) */}
          {seccionActiva === 'historial' && (
            <div style={styles.historialSection}>
              <div style={styles.historialHeader}>
                <div>
                  <h3 style={styles.sectionHeading}>Historial de Servicio y Fallas</h3>
                  <p style={styles.sectionSub}>
                    Trazabilidad cronológica inversa, causas raíz y evidencias (Fiabilidad: {metricas.indiceFiabilidad}%)
                  </p>
                </div>
                <button onClick={() => setShowAddForm(!showAddForm)} style={styles.addMaintenanceBtn}>
                  {showAddForm ? 'Cancelar' : '+ Registrar Mantenimiento'}
                </button>
              </div>

              {/* Formulario nuevo mantenimiento con Causa Raíz e Ingeniero Asignado */}
              {showAddForm && (
                <form onSubmit={handleGuardarMantenimiento} style={styles.newForm}>
                  <h4 style={styles.newFormTitle}>Nuevo Registro de Mantenimiento y Causa Raíz</h4>
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
                      <select value={subsistema} onChange={(e) => setSubsistema(e.target.value)} style={styles.input}>
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
                        <option value="correctiva">Correctiva (Falla)</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Ciclo Próximo Mant. (HU7)</label>
                      <select
                        value={cicloForm}
                        onChange={(e) => setCicloForm(Number(e.target.value) as CicloMeses)}
                        style={styles.input}
                      >
                        <option value={3}>Cada 3 meses</option>
                        <option value={6}>Cada 6 meses (Estándar)</option>
                        <option value={12}>Cada 12 meses</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={styles.label}>Ingeniero Responsable Asignado</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={tecnico}
                        onChange={(e) => setTecnico(e.target.value)}
                        style={{ ...styles.input, flex: 1 }}
                      >
                        {directorioIngenieros.map((ing) => (
                          <option key={ing.id} value={ing.nombreMostrar}>
                            {ing.nombreMostrar} ({ing.especialidad.split(',')[0]})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={tecnico}
                        onChange={(e) => setTecnico(e.target.value)}
                        required
                        placeholder="O escribe nombre"
                        style={{ ...styles.input, flex: 1 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={styles.label}>Diagnóstico y Acciones Realizadas</label>
                    <textarea
                      value={diagnostico}
                      onChange={(e) => setDiagnostico(e.target.value)}
                      required
                      placeholder="Describe los hallazgos técnicos, pruebas ejecutadas y reparaciones aplicadas..."
                      rows={2}
                      style={{ ...styles.input, resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Causa Raíz Identificada (HU9)</label>
                    <input
                      type="text"
                      value={causaRaiz}
                      onChange={(e) => setCausaRaiz(e.target.value)}
                      placeholder="Ej. Ventilador con rodamiento trabado o thermal pad degradado"
                      style={styles.input}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                      {CAUSAS_RAIZ_COMUNES.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setCausaRaiz(sug)}
                          style={styles.causaChip}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" disabled={guardando} style={styles.saveBtn}>
                    {guardando ? 'Guardando...' : 'Guardar e Integrar al Historial'}
                  </button>
                </form>
              )}

              {loadingHistorial ? (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '20px', fontWeight: 600 }}>
                  Cargando historial técnico...
                </p>
              ) : historial.length === 0 ? (
                <div style={styles.emptyHistorial}>
                  <p>No hay mantenimientos previos registrados para este equipo.</p>
                </div>
              ) : (
                <div style={styles.timeline}>
                  {historial.map((item, idx) => (
                    <div key={item.id || idx} style={styles.timelineCard}>
                      <div style={styles.timelineHeader}>
                        <div style={styles.timelineSubsistema}>
                          <span style={styles.tagSubsistema}>{item.subsistema}</span>
                          <span
                            style={{
                              ...styles.tagTipo,
                              color: item.tipo_intervencion === 'correctiva' ? '#be123c' : '#065f46',
                              background: item.tipo_intervencion === 'correctiva' ? '#ffe4e6' : '#dcfce7',
                              padding: '3px 8px',
                              borderRadius: '8px',
                            }}
                          >
                            {item.tipo_intervencion === 'correctiva' ? 'Correctivo' : 'Preventivo'}
                          </span>
                        </div>
                        <span style={styles.timelineFecha}>{item.fecha}</span>
                      </div>

                      <div style={styles.timelineBody}>
                        <p style={styles.diagnosticoLabel}>Diagnóstico técnico:</p>
                        <p style={styles.diagnosticoText}>{item.diagnostico}</p>
                        {item.causa_raiz && (
                          <div style={styles.causaRaizBox}>
                            <span style={styles.causaRaizLabel}>🔍 Causa raíz subyacente:</span>{' '}
                            <span style={styles.causaRaizValue}>{item.causa_raiz}</span>
                          </div>
                        )}
                      </div>

                      {/* Bloque de evidencias fotográficas (HU6 / Sprint 7) */}
                      {item.evidencias && item.evidencias.length > 0 && (
                        <div style={styles.evidenciasBlock}>
                          <div style={styles.evidenciasHeaderRow}>
                            <span style={styles.evidenciasTitle}>
                              Evidencia Fotográfica ({item.evidencias.length}/3)
                            </span>
                          </div>
                          <div style={styles.evidenciasRow}>
                            {item.evidencias.map((ev: EvidenciaItem) => {
                              const info = ETAPAS_INFO[ev.etapa] || ETAPAS_INFO.antes;
                              return (
                                <div
                                  key={ev.id_evidencia}
                                  style={styles.evidenciaThumbCard}
                                  onClick={() => setLightboxEvidencia(ev)}
                                >
                                  <img
                                    src={ev.signed_url || ev.url_imagen}
                                    alt={`Evidencia ${ev.etapa}`}
                                    style={styles.evidenciaThumbImg}
                                  />
                                  <span
                                    style={{
                                      ...styles.evidenciaStageTag,
                                      background: info.bgClay,
                                      color: info.color,
                                    }}
                                  >
                                    {ev.etapa.toUpperCase()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div style={styles.timelineFooter}>
                        <span style={styles.tecnicoLabel}>
                          Ingeniero responsable: <strong>{item.tecnico}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barra Inferior de Pestañas Claymorphism */}
        <div style={styles.footerActions}>
          <button
            type="button"
            onClick={() => setSeccionActiva('ficha')}
            style={seccionActiva === 'ficha' ? styles.sectionBtnActive : styles.sectionBtnInactive}
          >
            Ficha Técnica
            <br />
            del Equipo
          </button>
          <button
            type="button"
            onClick={() => setSeccionActiva('servicio')}
            style={seccionActiva === 'servicio' ? styles.sectionBtnActive : styles.sectionBtnInactive}
          >
            Servicio Técnico
            <br />
            y Verificaciones
          </button>
          <button
            type="button"
            onClick={() => setSeccionActiva('historial')}
            style={seccionActiva === 'historial' ? styles.sectionBtnActive : styles.sectionBtnInactive}
          >
            Historial de
            <br />
            Mantenimientos
          </button>
        </div>

        {/* Modal Lightbox de Evidencia Fotográfica */}
        {lightboxEvidencia && (
          <div style={styles.lightboxOverlay} onClick={() => setLightboxEvidencia(null)}>
            <div style={styles.lightboxCard} onClick={(e) => e.stopPropagation()}>
              <div style={styles.lightboxHeader}>
                <strong>
                  Evidencia: {ETAPAS_INFO[lightboxEvidencia.etapa]?.titulo || lightboxEvidencia.etapa}
                </strong>
                <button onClick={() => setLightboxEvidencia(null)} style={styles.closeBtn}>
                  ✕
                </button>
              </div>
              <img
                src={lightboxEvidencia.signed_url || lightboxEvidencia.url_imagen}
                alt={lightboxEvidencia.etapa}
                style={{ width: '100%', borderRadius: '18px', display: 'block' }}
              />
            </div>
          </div>
        )}
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
    backgroundColor: 'rgba(180, 196, 238, 0.65)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '12px',
    boxSizing: 'border-box',
  },
  modalCard: {
    width: '100%',
    maxWidth: '430px',
    maxHeight: '94vh',
    background: 'linear-gradient(145deg, #f5f8ff 0%, #eaefff 100%)',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '36px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow:
      '20px 24px 48px rgba(130, 150, 200, 0.5), -10px -10px 28px rgba(255, 255, 255, 0.95), inset 0 3px 6px rgba(255, 255, 255, 1), inset 0 -5px 10px rgba(191, 206, 245, 0.5)',
    color: '#172554',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '22px 22px 16px 22px',
  },
  headerDivider: {
    height: '1.5px',
    margin: '0 22px',
    background: 'rgba(203, 213, 225, 0.65)',
  },
  headerTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  headerIconBox: {
    width: '50px',
    height: '50px',
    background: 'linear-gradient(145deg, #5c8df6 0%, #2563eb 100%)',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow:
      '0 8px 18px rgba(37, 99, 235, 0.35), inset 0 3px 5px rgba(255, 255, 255, 0.45), inset 0 -4px 6px rgba(29, 78, 216, 0.65)',
  },
  title: {
    fontSize: '17px',
    fontWeight: 800,
    lineHeight: '1.2',
    margin: 0,
    color: '#172554',
  },
  subtitle: {
    fontSize: '12px',
    color: '#475569',
    margin: '3px 0 0 0',
    lineHeight: '1.3',
    fontWeight: 500,
  },
  closeBtn: {
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    color: '#1e293b',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow:
      '6px 6px 14px rgba(148, 166, 212, 0.45), -4px -4px 10px rgba(255, 255, 255, 0.95), inset 0 2px 3px #ffffff',
  },
  scrollBody: {
    padding: '18px 20px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  recurrentAlertCard: {
    background: 'linear-gradient(145deg, #fff1f2 0%, #ffe4e6 100%)',
    border: '1.5px solid #fda4af',
    borderRadius: '24px',
    padding: '14px 16px',
    color: '#9f1239',
    boxShadow: '8px 10px 22px rgba(225, 150, 165, 0.35), inset 0 2px 4px #ffffff',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  recurrentAlertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  recurrentAlertTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#881337',
    display: 'block',
  },
  recurrentAlertSub: {
    fontSize: '11px',
    color: '#be123c',
    fontWeight: 700,
  },
  recurrentAlertBody: {
    fontSize: '11.5px',
    color: '#881337',
    margin: 0,
    lineHeight: '1.35',
  },
  recurrentAlertHint: {
    fontSize: '11px',
    color: '#9f1239',
    background: 'rgba(255, 255, 255, 0.65)',
    padding: '7px 10px',
    borderRadius: '12px',
    margin: 0,
    lineHeight: '1.35',
  },
  specsCard: {
    background: 'linear-gradient(145deg, #f8faff 0%, #edf2ff 100%)',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '30px',
    padding: '20px 18px',
    boxShadow:
      '12px 14px 28px rgba(148, 166, 212, 0.42), -8px -8px 20px rgba(255, 255, 255, 0.95), inset 0 2px 5px #ffffff, inset 0 -4px 8px rgba(195, 209, 245, 0.45)',
  },
  badgesTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  tipoBadge: {
    fontSize: '11.5px',
    letterSpacing: '0.6px',
    fontWeight: 800,
    color: '#1e40af',
    background: '#dbeafe',
    padding: '6px 14px',
    borderRadius: '14px',
    boxShadow: 'inset 2px 2px 5px rgba(147, 180, 238, 0.45), inset -2px -2px 5px rgba(255, 255, 255, 0.9)',
  },
  semaforoBadge: {
    fontSize: '12px',
    fontWeight: 800,
    padding: '6px 14px',
    borderRadius: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    boxShadow: '4px 6px 12px rgba(134, 209, 172, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.85)',
  },
  semaforoDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
  },
  serialTitle: {
    fontSize: '21px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 4px 0',
    letterSpacing: '-0.3px',
  },
  semaforoDesc: {
    fontSize: '12.5px',
    color: '#475569',
    fontWeight: 600,
    margin: '0 0 12px 0',
  },
  semaforoControlBox: {
    background: '#e4ebf8',
    borderRadius: '18px',
    padding: '10px 12px',
    marginBottom: '14px',
    boxShadow: 'inset 3px 3px 7px rgba(160, 176, 212, 0.55), inset -3px -3px 7px rgba(255, 255, 255, 0.9)',
  },
  semaforoControlRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  controlLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#334155',
  },
  semaforoSwitchGroup: {
    display: 'flex',
    gap: '6px',
  },
  semaforoSwitchBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    cursor: 'pointer',
    boxShadow: '2px 2px 6px rgba(148, 166, 212, 0.35)',
  },
  cicloPillBtn: {
    padding: '4px 10px',
    borderRadius: '10px',
    border: 'none',
    background: '#ffffff',
    color: '#475569',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  cicloPillBtnActive: {
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
  },
  specsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '18px',
  },
  specItem: {
    background: '#e4ebf8',
    padding: '12px 14px',
    borderRadius: '20px',
    boxShadow: 'inset 4px 4px 9px rgba(160, 176, 212, 0.55), inset -4px -4px 9px rgba(255, 255, 255, 0.9)',
  },
  specLabel: {
    fontSize: '11px',
    color: '#475569',
    fontWeight: 600,
    display: 'block',
    marginBottom: '4px',
  },
  specValue: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#172554',
    lineHeight: '1.3',
    display: 'block',
  },
  qrSectionCard: {
    background: 'linear-gradient(145deg, #ffffff 0%, #f1f5ff 100%)',
    padding: '18px 16px',
    borderRadius: '26px',
    border: '1px solid rgba(255, 255, 255, 0.95)',
    boxShadow:
      '10px 12px 24px rgba(152, 170, 214, 0.4), -6px -6px 16px rgba(255, 255, 255, 0.95), inset 0 2px 4px #ffffff',
  },
  qrTopRow: {
    display: 'flex',
    gap: '14px',
    alignItems: 'center',
    marginBottom: '16px',
  },
  qrBox: {
    background: '#ffffff',
    padding: '12px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '6px 8px 18px rgba(148, 166, 212, 0.35), inset 0 1px 2px #ffffff',
  },
  qrInfoCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  qrTitleLabel: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#172554',
  },
  qrCodeText: {
    fontSize: '11.5px',
    color: '#475569',
    fontWeight: 600,
    margin: 0,
    wordBreak: 'break-all',
    lineHeight: '1.35',
  },
  qrButtonsRow: {
    display: 'flex',
    width: '100%',
    marginBottom: '12px',
  },
  downloadBtn: {
    width: '100%',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '18px',
    padding: '12px 14px',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow:
      '0 8px 18px rgba(37, 99, 235, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.45), inset 0 -3px 5px rgba(29, 78, 216, 0.65)',
  },
  printHint: {
    fontSize: '11.5px',
    color: '#64748b',
    textAlign: 'center',
    margin: 0,
    fontWeight: 600,
  },
  editDeleteRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '16px',
  },
  editEquipoBtn: {
    flex: 1,
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    color: '#1e3a8a',
    border: '1px solid rgba(255, 255, 255, 0.85)',
    borderRadius: '16px',
    padding: '10px',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow:
      '6px 6px 14px rgba(155, 172, 212, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.95), inset 0 2px 3px #ffffff',
  },
  deleteEquipoBtn: {
    flex: 1,
    background: 'linear-gradient(145deg, #ffe4e6 0%, #fecdd3 100%)',
    color: '#be123c',
    border: '1px solid rgba(255, 255, 255, 0.7)',
    borderRadius: '16px',
    padding: '10px',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow:
      '6px 6px 14px rgba(225, 150, 165, 0.35), -4px -4px 10px rgba(255, 255, 255, 0.85), inset 0 2px 3px rgba(255, 255, 255, 0.8)',
  },
  serviceSection: {
    background: 'linear-gradient(145deg, #f8faff 0%, #edf2ff 100%)',
    borderRadius: '28px',
    padding: '22px 18px',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    boxShadow: '12px 14px 28px rgba(148, 166, 212, 0.42), inset 0 2px 4px #ffffff',
  },
  serviceHeaderLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  serviceSectionTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#172554',
    margin: 0,
  },
  serviceSectionSub: {
    fontSize: '12.5px',
    color: '#475569',
    lineHeight: '1.4',
    margin: '0 0 16px 0',
  },
  iniciarServicioBtn: {
    width: '100%',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '20px',
    padding: '13px 16px',
    fontSize: '13.5px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow:
      '0 8px 18px rgba(37, 99, 235, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.45), inset 0 -3px 5px rgba(29, 78, 216, 0.65)',
  },
  historialSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  historialHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px',
  },
  sectionHeading: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#172554',
    margin: '0 0 3px 0',
  },
  sectionSub: {
    fontSize: '12px',
    color: '#475569',
    margin: 0,
    fontWeight: 500,
  },
  addMaintenanceBtn: {
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    color: '#2563eb',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '16px',
    padding: '8px 12px',
    fontSize: '11.5px',
    fontWeight: 800,
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '4px 4px 10px rgba(148, 166, 212, 0.4), inset 0 2px 3px #ffffff',
  },
  newForm: {
    background: 'linear-gradient(145deg, #ffffff 0%, #eef2ff 100%)',
    borderRadius: '24px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '8px 10px 20px rgba(148, 166, 212, 0.4), inset 0 2px 4px #ffffff',
  },
  newFormTitle: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    color: '#172554',
    fontWeight: 800,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  label: {
    fontSize: '11px',
    color: '#334155',
    display: 'block',
    marginBottom: '4px',
    fontWeight: 700,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#e4ebf8',
    border: 'none',
    borderRadius: '14px',
    color: '#1e293b',
    fontSize: '12px',
    fontWeight: 600,
    boxSizing: 'border-box',
    boxShadow: 'inset 3px 3px 6px rgba(160, 176, 212, 0.55), inset -3px -3px 6px rgba(255, 255, 255, 0.9)',
  },
  causaChip: {
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#1e40af',
    background: '#dbeafe',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  saveBtn: {
    background: 'linear-gradient(145deg, #34d399 0%, #10b981 100%)',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: '4px',
    boxShadow: '0 8px 16px rgba(16, 185, 129, 0.35), inset 0 2px 4px rgba(255,255,255,0.45)',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  timelineCard: {
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '24px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow:
      '8px 10px 22px rgba(148, 166, 212, 0.38), -6px -6px 14px rgba(255, 255, 255, 0.95), inset 0 2px 4px #ffffff',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
  },
  timelineSubsistema: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tagSubsistema: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#1e40af',
    background: '#dbeafe',
    padding: '4px 10px',
    borderRadius: '10px',
  },
  tagTipo: {
    fontSize: '10.5px',
    fontWeight: 800,
  },
  timelineFecha: {
    fontSize: '11.5px',
    color: '#475569',
    fontWeight: 700,
  },
  timelineBody: {
    background: '#e5ecf9',
    padding: '12px',
    borderRadius: '16px',
    boxShadow: 'inset 3px 3px 6px rgba(160, 176, 212, 0.5), inset -3px -3px 6px rgba(255, 255, 255, 0.9)',
  },
  diagnosticoLabel: {
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#64748b',
    margin: '0 0 3px 0',
  },
  diagnosticoText: {
    fontSize: '12.5px',
    color: '#1e293b',
    fontWeight: 600,
    margin: 0,
    lineHeight: '1.4',
  },
  causaRaizBox: {
    marginTop: '8px',
    paddingTop: '6px',
    borderTop: '1px dashed rgba(148, 163, 184, 0.45)',
    fontSize: '11.5px',
    lineHeight: '1.35',
  },
  causaRaizLabel: {
    fontWeight: 800,
    color: '#1e40af',
  },
  causaRaizValue: {
    fontWeight: 600,
    color: '#334155',
  },
  evidenciasBlock: {
    background: '#f1f5ff',
    borderRadius: '18px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    boxShadow: '4px 4px 10px rgba(155, 172, 212, 0.25), inset 0 1px 2px #ffffff',
  },
  evidenciasHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
  },
  evidenciasTitle: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: '#172554',
  },
  evidenciasRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  evidenciaThumbCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
  },
  evidenciaThumbImg: {
    width: '100%',
    height: '68px',
    objectFit: 'cover',
    borderRadius: '12px',
    border: '2px solid #ffffff',
    boxShadow: '0 4px 10px rgba(148, 163, 209, 0.35)',
  },
  evidenciaStageTag: {
    fontSize: '9.5px',
    fontWeight: 800,
    padding: '2px 7px',
    borderRadius: '8px',
  },
  timelineFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11.5px',
  },
  tecnicoLabel: {
    color: '#475569',
    fontWeight: 600,
  },
  emptyHistorial: {
    textAlign: 'center',
    padding: '24px',
    background: '#e4ebf8',
    borderRadius: '20px',
    color: '#64748b',
    fontSize: '12.5px',
    fontWeight: 600,
  },
  successBanner: {
    background: 'linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%)',
    color: '#065f46',
    padding: '10px 16px',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: 800,
    margin: '10px 20px 0 20px',
    borderRadius: '16px',
  },
  footerActions: {
    padding: '14px 14px',
    borderTop: '1px solid rgba(203, 213, 225, 0.6)',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    background: 'rgba(244, 247, 255, 0.92)',
  },
  sectionBtnActive: {
    padding: '10px 6px',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '16px',
    fontWeight: 800,
    fontSize: '11px',
    lineHeight: '1.25',
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 6px 14px rgba(37, 99, 235, 0.35), inset 0 2px 4px rgba(255,255,255,0.45)',
  },
  sectionBtnInactive: {
    padding: '10px 6px',
    background: 'linear-gradient(145deg, #ffffff 0%, #edf2ff 100%)',
    color: '#1e3a8a',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '16px',
    fontWeight: 700,
    fontSize: '11px',
    lineHeight: '1.25',
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '4px 4px 10px rgba(148, 166, 212, 0.38), inset 0 2px 3px #ffffff',
  },
  lightboxOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  lightboxCard: {
    background: '#f4f7ff',
    borderRadius: '26px',
    padding: '16px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 20px 45px rgba(15, 23, 42, 0.45), inset 0 2px 4px #ffffff',
  },
  lightboxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    color: '#172554',
    fontSize: '14px',
  },
};
