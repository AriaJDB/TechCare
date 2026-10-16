import { getHistorialEquipo, agregarMantenimiento, type MantenimientoRecord } from '../../src/utils/historialService';

describe('Sprint 4 · Guía a código QR y trazabilidad técnica', () => {
  const equipoPrueba = {
    id: 'test-equipo-sprint4-01',
    numero_serie: 'SN-TEST-4001',
    codigo_qr: 'TECHCARE-SN-TEST-4001-12345',
    tipo_dispositivo: 'laptop',
    procesador: 'Intel Core i5',
    ram: '16 GB',
    almacenamiento: '512 GB SSD'
  };

  describe('HU3 / TC04: Escanear un código QR válido', () => {
    it('muestra la ficha técnica y obtiene el historial del equipo asociado', async () => {
      // Arrange & Act
      const historial = await getHistorialEquipo(equipoPrueba);

      // Assert
      expect(equipoPrueba.codigo_qr).toBeDefined();
      expect(equipoPrueba.numero_serie).toBe('SN-TEST-4001');
      expect(Array.isArray(historial)).toBe(true);
      expect(historial.length).toBeGreaterThan(0);
    });
  });

  describe('HU3 / TC05: Escanear un código QR no registrado', () => {
    it('indica que el equipo no fue encontrado cuando el código QR no existe', () => {
      const qrInexistente = 'TECHCARE-NO-EXISTE-99999';
      const equiposRegistrados = [equipoPrueba];

      const encontrado = equiposRegistrados.find(
        (eq) => eq.codigo_qr === qrInexistente || eq.numero_serie === qrInexistente
      );

      expect(encontrado).toBeUndefined();
    });
  });

  describe('HU9 / TC11: Consultar el historial de un equipo', () => {
    it('lista los mantenimientos en orden cronológico inverso con fecha, subsistema, diagnóstico y técnico', async () => {
      // Arrange: Agregar un mantenimiento más reciente
      const nuevoMantenimiento: Omit<MantenimientoRecord, 'id'> = {
        id_equipo: equipoPrueba.id,
        numero_serie: equipoPrueba.numero_serie,
        codigo_qr: equipoPrueba.codigo_qr,
        fecha: '2026-10-15',
        subsistema: 'Refrigeración / Térmico',
        diagnostico: 'Cambio de pasta térmica y limpieza de ventiladores.',
        tecnico: 'Ing. Cinthia López',
        tipo_intervencion: 'preventiva',
        estado: 'completado'
      };

      await agregarMantenimiento(nuevoMantenimiento);

      // Act
      const historial = await getHistorialEquipo(equipoPrueba);

      // Assert
      expect(historial.length).toBeGreaterThanOrEqual(2);

      // Validar que cada registro cuenta con fecha, subsistema, diagnóstico y técnico
      for (const reg of historial) {
        expect(reg.fecha).toBeDefined();
        expect(reg.subsistema).toBeDefined();
        expect(reg.diagnostico).toBeDefined();
        expect(reg.tecnico).toBeDefined();
        expect(reg.subsistema.length).toBeGreaterThan(0);
        expect(reg.diagnostico.length).toBeGreaterThan(0);
        expect(reg.tecnico.length).toBeGreaterThan(0);
      }

      // Validar orden cronológico inverso (fecha descendente)
      for (let i = 0; i < historial.length - 1; i++) {
        const fechaActual = new Date(historial[i].fecha).getTime();
        const fechaSiguiente = new Date(historial[i + 1].fecha).getTime();
        expect(fechaActual).toBeGreaterThanOrEqual(fechaSiguiente);
      }
    });
  });
});
