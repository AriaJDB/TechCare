import { useState, FormEvent } from "react";
import "./RegisterEquipmentScreen.css";
import { supabase } from '../../supabaseClient';
import QRCode from "react-qr-code";

export default function RegisterEquipmentScreen({ session, onEquipoAgregado, equipoAEditar, onCancelEdit }: { session?: any, onEquipoAgregado?: () => void, equipoAEditar?: any, onCancelEdit?: () => void }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<{ tipo: string; serie: string; qrCode: string } | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const tipo = (form.elements.namedItem("tipo") as HTMLSelectElement).value;
    const serie = (form.elements.namedItem("serie") as HTMLInputElement).value.trim();
    const procesador = (form.elements.namedItem("procesador") as HTMLInputElement).value.trim();
    const ram = (form.elements.namedItem("ram") as HTMLInputElement).value.trim();
    const almacenamiento = (form.elements.namedItem("almacenamiento") as HTMLInputElement).value.trim();

    if (!tipo || !serie || !procesador || !ram || !almacenamiento) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    
    setLoading(true);
    setError("");
    const qrCodeValue = `TECHCARE-${serie}-${Date.now()}`;

    // Si hay un equipo para editar, actualizamos en vez de insertar
    if (equipoAEditar) {
      const { error: updateError } = await supabase
        .from('equipo')
        .update({
          tipo_dispositivo: tipo.toLowerCase(),
          numero_serie: serie,
          procesador,
          ram,
          almacenamiento
        })
        .eq('id', equipoAEditar.id);

      if (updateError) {
        if (updateError.code === '23505') setError("Ese número de serie ya está registrado.");
        else if (updateError.code === '42501') setError("Error HTTP 403: Acceso denegado. No tienes permisos de administrador para actualizar.");
        else setError(updateError.message);
        setLoading(false);
        return;
      }
      setLoading(false);
      if (onEquipoAgregado) onEquipoAgregado();
      return;
    }

    // Insertar nuevo en Supabase
    if (session?.user?.id) {
      const { error: dbError } = await supabase
        .from('equipo')
        .insert([
          {
            tipo_dispositivo: tipo.toLowerCase(),
            numero_serie: serie,
            procesador,
            ram,
            almacenamiento,
            codigo_qr: qrCodeValue,
            id_usuario_registro: session.user.id
          }
        ]);

      if (dbError) {
        if (dbError.code === '23505') {
          setError("Error: Ese número de serie ya está registrado.");
        } else if (dbError.code === '42501') {
          setError("Error HTTP 403: Acceso denegado. No tienes permisos de administrador para registrar equipos.");
        } else {
          setError(dbError.message);
        }
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setSaved({ tipo, serie, qrCode: qrCodeValue });
    if (onEquipoAgregado) onEquipoAgregado();
  }

  if (saved) {
    return (
      <div className="register-page">
        <div className="register-card success">
          <div className="qr-box">
            <QRCode value={saved.qrCode} size={130} />
          </div>
          <h2>Equipo registrado</h2>
          <p className="muted">
            {saved.tipo} · Serie {saved.serie}
          </p>
          <p className="muted small" style={{marginBottom: '20px'}}>Código QR generado y vinculado al equipo.</p>
          <button className="submit-btn" onClick={() => setSaved(null)}>
            Registrar otro equipo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <div className="header-icon">
            <i className="ti ti-device-desktop-plus" />
          </div>
          <h1>{equipoAEditar ? 'Editar equipo' : 'Registrar equipo'}</h1>
          <p className="muted">{equipoAEditar ? 'Actualizar detalles del equipo' : 'Alta de equipo y generación de código QR'}</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="tipo">Tipo de dispositivo</label>
            <div className="input-wrap">
              <i className="ti ti-device-laptop left-icon" />
              <select id="tipo" name="tipo" defaultValue={equipoAEditar?.tipo_dispositivo || ""}>
                <option value="" disabled>Selecciona un tipo</option>
                <option value="laptop">Laptop</option>
                <option value="desktop">Desktop</option>
                <option value="servidor">Servidor</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="serie">Número de serie</label>
            <div className="input-wrap">
              <i className="ti ti-barcode left-icon" />
              <input id="serie" name="serie" type="text" placeholder="SN-0003" defaultValue={equipoAEditar?.numero_serie || ""} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="procesador">Procesador</label>
              <div className="input-wrap">
                <i className="ti ti-cpu left-icon" />
                <input id="procesador" name="procesador" type="text" placeholder="Intel i5" defaultValue={equipoAEditar?.procesador || ""} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="ram">RAM</label>
              <div className="input-wrap">
                <i className="ti ti-stack-2 left-icon" />
                <input id="ram" name="ram" type="text" placeholder="8 GB" defaultValue={equipoAEditar?.ram || ""} />
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="almacenamiento">Almacenamiento</label>
            <div className="input-wrap">
              <i className="ti ti-database left-icon" />
              <input id="almacenamiento" name="almacenamiento" type="text" placeholder="512 GB SSD" defaultValue={equipoAEditar?.almacenamiento || ""} />
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? "Guardando..." : (equipoAEditar ? "Actualizar equipo" : "Guardar equipo")}
          </button>
          {equipoAEditar && (
            <button type="button" onClick={onCancelEdit} disabled={loading} className="submit-btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', marginTop: '8px' }}>
              Cancelar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
