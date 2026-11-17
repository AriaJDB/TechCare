/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ETAPAS_CATALOGO,
  validarArchivoFoto,
  comprimirImagen,
  adjuntarEvidencia,
  eliminarEvidencia,
  guardarBorradorEvidencias,
  obtenerBorradorEvidencias,
  type EvidenciaItem,
} from '../../src/services/evidenciasService';
import { getHistorialEquipo, agregarMantenimiento } from '../../src/utils/historialService';

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
      or: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: { id_evidencia: 'ev-mock-db-123', etapa: 'antes', url_imagen: 'mock.jpg' },
          error: null,
        }),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://supabase.co/storage/v1/signed/test.jpg' },
        error: null,
      }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    })),
  },
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'tecnico-sprint7-uuid' } },
      error: null,
    }),
  },
};

(globalThis as any).__techcare_supabase = mockSupabase;

// Mock de Supabase para pruebas unitarias aisladas
jest.mock('../../src/supabaseClient', () => ({
  supabase: mockSupabase,
}));

describe('Sprint 7 · Bitácora fotográfica de evidencias (HU6)', () => {
  const dummyFileValid = new File(['dummy content here'], 'foto_antes.jpg', {
    type: 'image/jpeg',
  });

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  // --------------------------------------------------------------------------
  // Tarea 1: Validación de archivos y restricciones de formato/tamaño (HU6)
  // --------------------------------------------------------------------------
  describe('Validación de archivos (HU6 / Formatos y Límites)', () => {
    it('acepta formatos permitidos: JPG, PNG y WEBP dentro de 20 MB', () => {
      // Arrange
      const jpg = new File(['img-jpg'], 'placa.jpg', { type: 'image/jpeg' });
      const png = new File(['img-png'], 'disipador.png', { type: 'image/png' });
      const webp = new File(['img-webp'], 'pasta.webp', { type: 'image/webp' });

      // Act & Assert
      expect(validarArchivoFoto(jpg).valido).toBe(true);
      expect(validarArchivoFoto(png).valido).toBe(true);
      expect(validarArchivoFoto(webp).valido).toBe(true);
    });

    it('rechaza archivos que no sean imágenes (PDF, ejecutables, scripts)', () => {
      // Arrange
      const pdf = new File(['pdf-data'], 'documento.pdf', { type: 'application/pdf' });
      const exe = new File(['exe-data'], 'virus.exe', { type: 'application/x-msdownload' });

      // Act & Assert
      const resPdf = validarArchivoFoto(pdf);
      expect(resPdf.valido).toBe(false);
      expect(resPdf.error).toContain('no está permitido');

      const resExe = validarArchivoFoto(exe);
      expect(resExe.valido).toBe(false);
    });

    it('rechaza archivos vacíos o con tamaño 0 bytes', () => {
      const archivoVacio = new File([], 'vacio.jpg', { type: 'image/jpeg' });
      const res = validarArchivoFoto(archivoVacio);

      expect(res.valido).toBe(false);
      expect(res.error).toContain('vacío o dañado');
    });

    it('rechaza archivos que superan el límite de 20 MB', () => {
      // Mock de archivo de 25 MB
      const archivoGigante = {
        name: 'pesado.jpg',
        type: 'image/jpeg',
        size: 25 * 1024 * 1024,
      } as any;

      const res = validarArchivoFoto(archivoGigante);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('excede el límite');
    });

    it('identifica archivos mayores a 512 KB como candidatos para compresión', () => {
      const archivo600kb = {
        name: 'camara_alta_res.jpg',
        type: 'image/jpeg',
        size: 600 * 1024,
      } as any;

      const res = validarArchivoFoto(archivo600kb);
      expect(res.valido).toBe(true);
      expect(res.requiereCompresion).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Tarea 2: Compresión y optimización de evidencias
  // --------------------------------------------------------------------------
  describe('Compresión y optimización técnica', () => {
    it('comprime imágenes grandes reduciendo el peso final en KB', async () => {
      const imgPesada = new File([new ArrayBuffer(800 * 1024)], 'foto_alta_res.jpg', {
        type: 'image/jpeg',
      });

      const res = await comprimirImagen(imgPesada);
      expect(res.comprimida).toBe(true);
      expect(res.pesoOriginalKb).toBeGreaterThanOrEqual(800);
      expect(res.pesoFinalKb).toBeLessThan(res.pesoOriginalKb);
      expect(res.blob).toBeDefined();
    });

    it('preserva archivos menores a 512 KB sin compresión destructiva forzada', async () => {
      const imgLigera = new File([new ArrayBuffer(100 * 1024)], 'foto_ligera.jpg', {
        type: 'image/jpeg',
      });

      const res = await comprimirImagen(imgLigera);
      expect(res.comprimida).toBe(false);
      expect(res.pesoFinalKb).toBe(res.pesoOriginalKb);
    });
  });

  // --------------------------------------------------------------------------
  // Tarea 3: Reglas de negocio de la bitácora fotográfica (Hasta 3 fotos)
  // --------------------------------------------------------------------------
  describe('Reglas de negocio del flujo fotográfico (HU6 / Etapas)', () => {
    it('reconoce exactamente las 3 etapas del catálogo oficial: antes, proceso y despues', () => {
      expect(ETAPAS_CATALOGO).toHaveLength(3);
      expect(ETAPAS_CATALOGO).toEqual(['antes', 'proceso', 'despues']);
    });

    it('permite adjuntar fotografías para cada etapa', async () => {
      const idOrden = 'orden-test-sprint7-01';

      const evAntes = await adjuntarEvidencia({
        idOrden,
        etapa: 'antes',
        file: dummyFileValid,
        evidenciasActuales: [],
      });

      expect(evAntes).toBeDefined();
      expect(evAntes.etapa).toBe('antes');
      expect(evAntes.id_orden).toBe(idOrden);
    });

    it('bloquea agregar más de 3 fotografías cuando no corresponden a reemplazos', async () => {
      const idOrden = 'orden-test-sprint7-full';
      const tresEvidencias: EvidenciaItem[] = [
        { id_evidencia: '1', id_orden: idOrden, url_imagen: '1.jpg', etapa: 'antes' },
        { id_evidencia: '2', id_orden: idOrden, url_imagen: '2.jpg', etapa: 'proceso' },
        { id_evidencia: '3', id_orden: idOrden, url_imagen: '3.jpg', etapa: 'despues' },
      ];

      // Intentar forzar una etapa no existente o cuarta foto
      await expect(
        adjuntarEvidencia({
          idOrden,
          etapa: 'extra' as any,
          file: dummyFileValid,
          evidenciasActuales: tresEvidencias,
        })
      ).rejects.toThrow();
    });

    it('permite reemplazar la foto de una etapa existente sin rebasar el límite', async () => {
      const idOrden = 'orden-test-sprint7-replace';
      const previas: EvidenciaItem[] = [
        { id_evidencia: '1', id_orden: idOrden, url_imagen: 'antigua.jpg', etapa: 'antes' },
      ];

      const reemplazo = await adjuntarEvidencia({
        idOrden,
        etapa: 'antes',
        file: dummyFileValid,
        evidenciasActuales: previas,
      });

      expect(reemplazo.etapa).toBe('antes');
      const cacheadas = obtenerBorradorEvidencias(idOrden);
      expect(cacheadas.filter((e) => e.etapa === 'antes')).toHaveLength(1);
    });

    it('elimina una fotografía asociada y actualiza el almacenamiento local', async () => {
      const idOrden = 'orden-test-sprint7-del';
      const lista: EvidenciaItem[] = [
        { id_evidencia: 'ev-eliminar', id_orden: idOrden, url_imagen: 'a_borrar.jpg', etapa: 'proceso' },
      ];
      guardarBorradorEvidencias(idOrden, lista);

      await eliminarEvidencia('ev-eliminar', idOrden, 'a_borrar.jpg');

      const restantes = obtenerBorradorEvidencias(idOrden);
      expect(restantes.find((e) => e.id_evidencia === 'ev-eliminar')).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Tarea 4: Integración con la trazabilidad técnica e Historial (HU6 + HU9)
  // --------------------------------------------------------------------------
  describe('Integración con Historial de Mantenimientos (HU6 / HU9)', () => {
    it('asocia las evidencias fotográficas al registro del historial del equipo', async () => {
      const equipoPrueba = {
        id: 'eq-test-sprint7',
        numero_serie: 'SN-SPRINT7-001',
        codigo_qr: 'QR-SPRINT7-001',
      };

      const evidencias: EvidenciaItem[] = [
        { id_evidencia: 'ev-1', id_orden: 'ord-hist-1', etapa: 'antes', url_imagen: 'antes.jpg' },
        { id_evidencia: 'ev-2', id_orden: 'ord-hist-1', etapa: 'despues', url_imagen: 'despues.jpg' },
      ];

      await agregarMantenimiento({
        id_equipo: equipoPrueba.id,
        numero_serie: equipoPrueba.numero_serie,
        codigo_qr: equipoPrueba.codigo_qr,
        fecha: '2026-11-03',
        subsistema: 'Refrigeración / Térmico',
        diagnostico: 'Servicio con bitácora fotográfica completa.',
        tecnico: 'Gabriel Flores Argüello',
        tipo_intervencion: 'preventiva',
        estado: 'completado',
        id_orden: 'ord-hist-1',
        evidencias,
      });

      const historial = await getHistorialEquipo(equipoPrueba);
      expect(historial.length).toBeGreaterThan(0);

      const regConEvidencias = historial.find((h) => h.id_orden === 'ord-hist-1');
      expect(regConEvidencias).toBeDefined();
      expect(regConEvidencias?.evidencias).toHaveLength(2);
      expect(regConEvidencias?.evidencias?.[0].etapa).toBe('antes');
    });
  });
});
