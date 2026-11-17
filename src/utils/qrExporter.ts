export interface EquipoInfoQR {
  tipo_dispositivo: string;
  numero_serie: string;
  procesador?: string;
  ram?: string;
  almacenamiento?: string;
  codigo_qr: string;
}

/**
 * Genera el canvas en alta resolución (600x360) con el formato de etiqueta física TechCare.
 */
export async function generarEtiquetaQRCanvas(
  equipo: EquipoInfoQR,
  svgElement?: SVGSVGElement | null
): Promise<{ dataUrl: string; blob: Blob | null; fileName: string }> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fileName = `TechCare_Etiqueta_${(equipo.numero_serie || 'equipo').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;

  if (!ctx) {
    return { dataUrl: '', blob: null, fileName };
  }

  // 600 x 360 px
  canvas.width = 600;
  canvas.height = 360;

  // Fondo blanco y borde exterior
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 600, 360);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 580, 340);

  // Encabezado TechCare (azul institucional)
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(10, 10, 580, 52);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillText('TechCare · IDENTIFICACIÓN DE EQUIPO', 25, 43);

  // Datos del equipo a la izquierda
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`TIPO: ${(equipo.tipo_dispositivo || 'EQUIPO').toUpperCase()}`, 25, 95);

  ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#2563eb';
  ctx.fillText(`SERIE: ${equipo.numero_serie || 'S/N'}`, 25, 128);

  ctx.font = '13px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#334155';
  if (equipo.procesador) {
    ctx.fillText(`CPU: ${equipo.procesador.substring(0, 34)}`, 25, 160);
  }
  if (equipo.ram) {
    ctx.fillText(`RAM: ${equipo.ram.substring(0, 34)}`, 25, 185);
  }
  if (equipo.almacenamiento) {
    ctx.fillText(`DISCO: ${equipo.almacenamiento.substring(0, 34)}`, 25, 210);
  }

  // Línea divisoria
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(25, 232);
  ctx.lineTo(340, 232);
  ctx.stroke();

  // Instrucciones
  ctx.font = 'italic 12px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Apunta la cámara de TechCare para', 25, 256);
  ctx.fillText('consultar ficha técnica e historial.', 25, 276);

  // Código QR textual
  ctx.font = '10.5px monospace';
  ctx.fillStyle = '#475569';
  const qrCorte = equipo.codigo_qr.length > 38 ? equipo.codigo_qr.substring(0, 38) + '...' : equipo.codigo_qr;
  ctx.fillText(qrCorte, 25, 326);

  // Contenedor visual del QR a la derecha
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(354, 69, 222, 222);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(354, 69, 222, 222);

  // Obtener SVG del QR
  const svgToDraw = svgElement || (document.querySelector(`[data-qr-value="${equipo.codigo_qr}"] svg`) as SVGSVGElement | null) || document.querySelector('svg');

  if (svgToDraw) {
    await new Promise<void>((resolve) => {
      try {
        const clone = svgToDraw.cloneNode(true) as SVGSVGElement;
        if (!clone.getAttribute('xmlns')) {
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        clone.setAttribute('width', '210');
        clone.setAttribute('height', '210');
        const serialized = new XMLSerializer().serializeToString(clone);
        const src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(serialized)));
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 360, 75, 210, 210);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
      } catch {
        resolve();
      }
    });
  }

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), 'image/png');
    } catch {
      resolve(null);
    }
  });

  return { dataUrl, blob, fileName };
}

/**
 * Guarda la etiqueta generada en la galería del teléfono (vía interfaz nativa Android/Capacitor o Web Share API),
 * o como descarga de archivo en navegador de escritorio.
 */
export async function guardarEtiquetaEnGaleria(
  dataUrl: string,
  blob: Blob | null,
  fileName: string,
  equipo: EquipoInfoQR
): Promise<string> {
  // 1. Intentar interfaz nativa de TechCare para guardar en galería directamente
  try {
    const techCareNative = (window as any).TechCareNative;
    if (techCareNative && typeof techCareNative.saveLabelImage === 'function') {
      const ok = techCareNative.saveLabelImage(dataUrl, fileName);
      if (ok) {
        return 'Etiqueta guardada en la Galería de tu teléfono (Álbum TechCare).';
      }
    }
  } catch {
    // Continuar al siguiente método
  }

  // 2. Intentar Web Share API con archivo para compartir o guardar en fotos
  try {
    if (blob && typeof navigator !== 'undefined' && (navigator as any).share) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (!(navigator as any).canShare || (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({
          title: `Etiqueta QR - ${equipo.numero_serie}`,
          text: `Etiqueta física TechCare (${equipo.tipo_dispositivo} · SN: ${equipo.numero_serie})`,
          files: [file],
        });
        return 'Etiqueta lista en tu dispositivo.';
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return 'Operación cancelada.';
    }
  }

  // 3. Descarga directa en navegador
  try {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return `Etiqueta guardada como ${fileName}`;
  } catch {
    return 'Etiqueta generada correctamente.';
  }
}

/**
 * Muestra el diálogo modal Claymorphism de confirmación de etiqueta guardada en galería
 * exactamente como se muestra en la captura de pantalla 11.jpeg.
 */
export async function mostrarModalEtiquetaQR(
  equipo: EquipoInfoQR,
  svgElement?: SVGSVGElement | null
): Promise<void> {
  const { dataUrl, blob, fileName } = await generarEtiquetaQRCanvas(equipo, svgElement);
  if (!dataUrl) return;

  const resultadoMsg = await guardarEtiquetaEnGaleria(dataUrl, blob, fileName, equipo);

  const existingModal = document.getElementById('techcare-qr-label-modal');
  if (existingModal) existingModal.remove();

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'techcare-qr-label-modal';
  Object.assign(modalOverlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '25000',
    padding: '16px',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    width: '100%',
    maxWidth: '400px',
    background: 'linear-gradient(145deg, #f8faff 0%, #edf2ff 100%)',
    borderRadius: '32px',
    padding: '22px 18px',
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    boxShadow: '0 22px 48px rgba(15, 23, 42, 0.42), inset 0 3px 6px #ffffff',
    color: '#172554',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxSizing: 'border-box',
  });

  const topRow = document.createElement('div');
  Object.assign(topRow.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  });

  const titlesWrap = document.createElement('div');
  const h3 = document.createElement('h3');
  h3.textContent = 'Etiqueta del Equipo';
  Object.assign(h3.style, {
    margin: '0',
    fontSize: '17px',
    fontWeight: '800',
    color: '#172554',
  });

  const pSerie = document.createElement('p');
  pSerie.textContent = `SN: ${equipo.numero_serie}`;
  Object.assign(pSerie.style, {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#475569',
    fontWeight: '600',
  });
  titlesWrap.appendChild(h3);
  titlesWrap.appendChild(pSerie);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '15px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '4px 4px 10px rgba(148, 163, 209, 0.45)',
  });
  closeBtn.onclick = () => modalOverlay.remove();

  topRow.appendChild(titlesWrap);
  topRow.appendChild(closeBtn);
  card.appendChild(topRow);

  const statusMsgBox = document.createElement('div');
  statusMsgBox.textContent = resultadoMsg;
  Object.assign(statusMsgBox.style, {
    padding: '10px 14px',
    borderRadius: '16px',
    background: 'linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%)',
    color: '#065f46',
    fontSize: '12px',
    fontWeight: '700',
    textAlign: 'center',
    boxShadow: 'inset 0 2px 3px rgba(255, 255, 255, 0.85)',
  });
  card.appendChild(statusMsgBox);

  const imgContainer = document.createElement('div');
  Object.assign(imgContainer.style, {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '10px',
    boxShadow: 'inset 3px 3px 8px rgba(163, 179, 214, 0.45)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  });

  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = `Etiqueta QR ${equipo.numero_serie}`;
  Object.assign(img.style, {
    width: '100%',
    height: 'auto',
    borderRadius: '10px',
    display: 'block',
  });
  imgContainer.appendChild(img);
  card.appendChild(imgContainer);

  const resaveBtn = document.createElement('button');
  resaveBtn.type = 'button';
  resaveBtn.textContent = 'Guardar nuevamente en Galería';
  Object.assign(resaveBtn.style, {
    width: '100%',
    padding: '12px',
    borderRadius: '18px',
    border: 'none',
    background: 'linear-gradient(145deg, #4f86f7 0%, #2563eb 100%)',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 8px 16px rgba(37, 99, 235, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
  });
  resaveBtn.onclick = async () => {
    const nuevoMsg = await guardarEtiquetaEnGaleria(dataUrl, blob, fileName, equipo);
    statusMsgBox.textContent = nuevoMsg;
  };
  card.appendChild(resaveBtn);

  modalOverlay.appendChild(card);
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) modalOverlay.remove();
  };
  document.body.appendChild(modalOverlay);
}

/**
 * Función principal llamada desde las vistas para descargar y abrir el modal de guardado.
 */
export async function descargarEtiquetaQR(
  equipo: EquipoInfoQR,
  svgElement?: SVGSVGElement | null
): Promise<void> {
  await mostrarModalEtiquetaQR(equipo, svgElement);
}

/**
 * Abre la ventana de impresión nativa con la etiqueta formateada para impresión física.
 */
export function imprimirEtiquetaQR(equipo: EquipoInfoQR, svgElement?: SVGSVGElement | null): void {
  const printWindow = window.open('', '_blank', 'width=650,height=500');
  if (!printWindow) {
    alert('Permite las ventanas emergentes para imprimir la etiqueta');
    return;
  }

  let svgHtml = '';
  if (svgElement) {
    svgHtml = svgElement.outerHTML;
  } else {
    const foundSvg =
      (document.querySelector(`[data-qr-value="${equipo.codigo_qr}"] svg`) as SVGSVGElement) ||
      document.querySelector('svg');
    if (foundSvg) svgHtml = foundSvg.outerHTML;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Imprimir QR - ${equipo.numero_serie}</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            justifyContent: center;
            align-items: center;
            background: #f1f5f9;
          }
          .etiqueta {
            width: 480px;
            border: 2px solid #0f172a;
            border-radius: 8px;
            background: white;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          }
          .header {
            background: #1e3a8a;
            color: white;
            padding: 10px 16px;
            font-weight: bold;
            font-size: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .body {
            display: flex;
            padding: 16px;
            gap: 16px;
            align-items: center;
          }
          .info {
            flex: 1;
          }
          .tipo {
            font-size: 14px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
          }
          .serie {
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            margin: 4px 0 10px 0;
          }
          .spec {
            font-size: 12px;
            color: #334155;
            margin-bottom: 4px;
          }
          .qr-box {
            width: 150px;
            height: 150px;
            display: flex;
            justifyContent: center;
            align-items: center;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px;
            background: white;
          }
          .qr-box svg {
            width: 100% !important;
            height: 100% !important;
          }
          .footer {
            border-top: 1px dashed #cbd5e1;
            padding: 8px 16px;
            font-size: 10px;
            color: #64748b;
            text-align: center;
          }
          @media print {
            body {
              background: transparent;
              padding: 0;
            }
            .etiqueta {
              box-shadow: none;
              border: 1.5px solid #000;
            }
          }
        </style>
      </head>
      <body>
        <div class="etiqueta">
          <div class="header">
            <span>TechCare</span>
            <span style="font-size: 12px; font-weight: normal;">Control de Mantenimiento</span>
          </div>
          <div class="body">
            <div class="info">
              <div class="tipo">${equipo.tipo_dispositivo}</div>
              <div class="serie">SN: ${equipo.numero_serie}</div>
              ${equipo.procesador ? `<div class="spec"><strong>CPU:</strong> ${equipo.procesador}</div>` : ''}
              ${equipo.ram ? `<div class="spec"><strong>RAM:</strong> ${equipo.ram}</div>` : ''}
              ${equipo.almacenamiento ? `<div class="spec"><strong>Disco:</strong> ${equipo.almacenamiento}</div>` : ''}
              <div style="margin-top: 10px; font-size: 10px; color: #64748b;">
                Apunta la app de TechCare para escanear
              </div>
            </div>
            <div class="qr-box">
              ${svgHtml}
            </div>
          </div>
          <div class="footer">
            ID: ${equipo.codigo_qr}
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
