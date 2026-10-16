import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import QRCode from 'react-qr-code';
import { descargarEtiquetaQR, imprimirEtiquetaQR } from '../../utils/qrExporter';

export default function EquipoForm({ session, onEquipoAgregado }: { session: any, onEquipoAgregado: () => void }) {
  const [tipoDispositivo, setTipoDispositivo] = useState('laptop');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [procesador, setProcesador] = useState('');
  const [ram, setRam] = useState('');
  const [almacenamiento, setAlmacenamiento] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedQR, setGeneratedQR] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setGeneratedQR('');

    // Generar identificador único QR asociado al equipo
    const qrCodeValue = `TECHCARE-${numeroSerie}-${Date.now()}`;

    const { error: dbError } = await supabase
      .from('equipo')
      .insert([
        {
          tipo_dispositivo: tipoDispositivo,
          numero_serie: numeroSerie,
          procesador,
          ram,
          almacenamiento,
          codigo_qr: qrCodeValue,
          id_usuario_registro: session.user.id
        }
      ]);

    if (dbError) {
      if (dbError.code === '23505') {
        setError('El número de serie ingresado ya existe en el sistema.');
      } else {
        setError(dbError.message);
      }
    } else {
      setSuccess('Equipo registrado exitosamente.');
      setGeneratedQR(qrCodeValue);
      onEquipoAgregado();
      // Limpiar formulario
      setTipoDispositivo('laptop');
      setNumeroSerie('');
      setProcesador('');
      setRam('');
      setAlmacenamiento('');
    }
    setLoading(false);
  };

  return (
    <div style={styles.formContainer}>
      <h3 style={styles.header}>Registrar Nuevo Equipo</h3>
      
      {error && <div style={styles.errorAlert}>{error}</div>}
      {success && <div style={styles.successAlert}>{success}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Tipo de Dispositivo</label>
          <select 
            value={tipoDispositivo} 
            onChange={(e) => setTipoDispositivo(e.target.value)}
            style={styles.input}
          >
            <option value="laptop">Laptop</option>
            <option value="desktop">Desktop</option>
            <option value="servidor">Servidor</option>
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Número de Serie</label>
          <input 
            type="text" 
            value={numeroSerie} 
            onChange={(e) => setNumeroSerie(e.target.value)} 
            required 
            placeholder="Ej: SN12345678"
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Procesador</label>
          <input 
            type="text" 
            value={procesador} 
            onChange={(e) => setProcesador(e.target.value)} 
            required 
            placeholder="Ej: Intel Core i5 12th Gen"
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Memoria RAM</label>
          <input 
            type="text" 
            value={ram} 
            onChange={(e) => setRam(e.target.value)} 
            required 
            placeholder="Ej: 16GB DDR4"
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Almacenamiento</label>
          <input 
            type="text" 
            value={almacenamiento} 
            onChange={(e) => setAlmacenamiento(e.target.value)} 
            required 
            placeholder="Ej: 512GB SSD"
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Guardando...' : 'Guardar Equipo y Generar QR'}
        </button>
      </form>

      {generatedQR && (
        <div style={styles.qrContainer}>
          <h4 style={styles.qrHeader}>Código QR Generado</h4>
          <p style={{fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginBottom: '12px'}}>
            Este código QR debe ser impreso y pegado en el equipo para su seguimiento.
          </p>
          <div data-form-qr={generatedQR} style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
            <QRCode value={generatedQR} size={150} />
          </div>
          <p style={styles.qrText}>{generatedQR}</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', width: '100%', maxWidth: '280px' }}>
            <button
              type="button"
              onClick={() => {
                const svg = document.querySelector(`[data-form-qr="${generatedQR}"] svg`) as SVGSVGElement | null;
                descargarEtiquetaQR({
                  tipo_dispositivo: tipoDispositivo,
                  numero_serie: numeroSerie,
                  procesador,
                  ram,
                  almacenamiento,
                  codigo_qr: generatedQR
                }, svg);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              📥 Descargar QR
            </button>
            <button
              type="button"
              onClick={() => {
                const svg = document.querySelector(`[data-form-qr="${generatedQR}"] svg`) as SVGSVGElement | null;
                imprimirEtiquetaQR({
                  tipo_dispositivo: tipoDispositivo,
                  numero_serie: numeroSerie,
                  procesador,
                  ram,
                  almacenamiento,
                  codigo_qr: generatedQR
                }, svg);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#93c5fd',
                border: '1px solid rgba(96, 165, 250, 0.4)',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  formContainer: {
    background: 'rgba(15, 23, 42, 0.7)',
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    color: 'white',
    marginTop: '16px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
  },
  header: {
    marginTop: 0,
    marginBottom: '20px',
    color: '#93c5fd',
    fontSize: '18px',
    fontWeight: '600'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    color: '#cbd5e1',
    fontWeight: '500'
  },
  input: {
    padding: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
  },
  button: {
    padding: '14px',
    background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '15px',
    marginTop: '10px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
  },
  errorAlert: {
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.5)',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '13px'
  },
  successAlert: {
    padding: '12px',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#86efac',
    border: '1px solid rgba(34, 197, 94, 0.5)',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '13px'
  },
  qrContainer: {
    marginTop: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    borderTop: '1px solid rgba(96, 165, 250, 0.2)',
    paddingTop: '24px'
  },
  qrHeader: {
    color: '#60a5fa',
    margin: 0,
    fontSize: '16px'
  },
  qrText: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '8px'
  }
};
