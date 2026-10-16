export interface EquipoInfoQR {
  tipo_dispositivo: string;
  numero_serie: string;
  procesador?: string;
  ram?: string;
  almacenamiento?: string;
  codigo_qr: string;
}

/**
 * Convierte un elemento SVG (como el generado por react-qr-code) o datos del equipo
 * en una imagen PNG descargable con formato de etiqueta física para pegar en el equipo.
 */
export async function descargarEtiquetaQR(
  equipo: EquipoInfoQR,
  svgElement?: SVGSVGElement | null
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Dimensiones de etiqueta estándar (alta resolución para impresión nítida)
  const width = 600;
  const height = 360;
  canvas.width = width;
  canvas.height = height;

  // Fondo blanco con bordes limpios
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Borde exterior de etiqueta
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Encabezado con color TechCare (azul marino)
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(10, 10, width - 20, 50);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillText('TechCare · IDENTIFICACIÓN DE EQUIPO', 25, 42);

  // Datos del equipo a la izquierda
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`TIPO: ${equipo.tipo_dispositivo.toUpperCase()}`, 25, 95);

  ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#2563eb';
  ctx.fillText(`SERIE: ${equipo.numero_serie}`, 25, 128);

  ctx.font = '13px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#334155';
  if (equipo.procesador) {
    ctx.fillText(`CPU: ${equipo.procesador}`, 25, 160);
  }
  if (equipo.ram) {
    ctx.fillText(`RAM: ${equipo.ram}`, 25, 185);
  }
  if (equipo.almacenamiento) {
    ctx.fillText(`DISCO: ${equipo.almacenamiento}`, 25, 210);
  }

  // Línea divisoria
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(25, 230);
  ctx.lineTo(340, 230);
  ctx.stroke();

  // Instrucción para el técnico
  ctx.font = 'italic 12px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Apunta la cámara de TechCare para', 25, 255);
  ctx.fillText('consultar ficha e historial.', 25, 275);

  // Código identificador en texto
  ctx.font = '10px monospace';
  ctx.fillStyle = '#475569';
  const qrCorte = equipo.codigo_qr.length > 36 ? equipo.codigo_qr.substring(0, 36) + '...' : equipo.codigo_qr;
  ctx.fillText(qrCorte, 25, 325);

  // Ahora dibujamos el QR a la derecha
  const qrX = 360;
  const qrY = 75;
  const qrSize = 210;

  // Fondo para el QR
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);

  // Convertir SVG a imagen para dibujarla en el canvas
  const drawQrAndDownload = (img: HTMLImageElement) => {
    ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

    // Descargar como PNG
    const link = document.createElement('a');
    link.download = `TechCare_QR_${equipo.numero_serie || 'equipo'}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (svgElement) {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      drawQrAndDownload(img);
      URL.revokeObjectURL(blobURL);
    };
    img.src = blobURL;
  } else {
    // Si no se pasó elemento SVG, buscar el primer svg dentro de un contenedor de QR o generar dataUrl
    const genericSvg = document.querySelector(`[data-qr-value="${equipo.codigo_qr}"] svg`) as SVGSVGElement 
      || document.querySelector('svg');
    if (genericSvg) {
      const svgData = new XMLSerializer().serializeToString(genericSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        drawQrAndDownload(img);
        URL.revokeObjectURL(blobURL);
      };
      img.src = blobURL;
    }
  }
}

/**
 * Abre la ventana de impresión nativa con la etiqueta formateada para impresión de etiqueta física.
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
    const foundSvg = document.querySelector(`[data-qr-value="${equipo.codigo_qr}"] svg`) as SVGSVGElement 
      || document.querySelector('svg');
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
            justifyContent: space-between;
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
