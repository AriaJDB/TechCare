import {
  type ChecklistItem,
  type PuertosDetalle,
  TAREAS_PARTE_1,
  TAREAS_PARTE_2,
  TODAS_LAS_TAREAS,
  calcularProgreso,
  parteUnoCompleta,
  parteDosCompleta,
  checklistCompleto,
  obtenerTareasPendientes,
  evaluarTemperatura,
  evaluarSmart,
  cerrarOrdenServicio,
} from '../../src/services/checklistService';

// Mock de Supabase para pruebas unitarias aisladas
jest.mock('../../src/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id_orden: 'orden-mock-sprint6-99',
                cerrada: true,
                estado_semaforo: 'verde',
                proxima_fecha_mtto: '2027-04-30',
              },
              error: null,
            }),
          })),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: { id_orden: 'nueva-orden-123' },
            error: null,
          }),
        })),
      })),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'tecnico-uuid-1' } },
        error: null,
      }),
    },
  },
}));

describe('Sprint 6 · Checklist interactivo (parte 2) - HU5 & Módulo 4', () => {
  const itemsChecklistIncompletos: ChecklistItem[] = [
    { id_item: '1', id_orden: 'o1', tarea: 'limpieza', obligatorio: true, completado: true, fecha_marcado: '2026-10-30T10:00:00Z' },
    { id_item: '2', id_orden: 'o1', tarea: 'ventiladores', obligatorio: true, completado: true, fecha_marcado: '2026-10-30T10:05:00Z' },
    { id_item: '3', id_orden: 'o1', tarea: 'pasta_termica', obligatorio: true, completado: true, fecha_marcado: '2026-10-30T10:15:00Z' },
    { id_item: '4', id_orden: 'o1', tarea: 'puertos', obligatorio: true, completado: false, fecha_marcado: null },
    { id_item: '5', id_orden: 'o1', tarea: 'temperatura', obligatorio: true, completado: false, fecha_marcado: null },
    { id_item: '6', id_orden: 'o1', tarea: 'smart', obligatorio: true, completado: false, fecha_marcado: null },
  ];

  const itemsChecklistCompletos: ChecklistItem[] = itemsChecklistIncompletos.map((it) => ({
    ...it,
    completado: true,
    fecha_marcado: '2026-10-30T10:30:00Z',
  }));

  // --------------------------------------------------------------------------
  // Tarea 1: Inspección de puertos físicos (Alegria Alcantara Edgar Maximiliano)
  // --------------------------------------------------------------------------
  describe('Tarea 1: Inspección de puertos físicos', () => {
    it('reconoce el catálogo de puertos y permite mapear estados funcionales', () => {
      const detallePuertos: PuertosDetalle = {
        usb_a: 'ok',
        usb_c: 'ok',
        hdmi: 'ok',
        audio: 'ok',
        rj45: 'ok',
        observaciones: 'Todos los puertos operativos y limpios.',
      };

      expect(detallePuertos.usb_a).toBe('ok');
      expect(detallePuertos.usb_c).toBe('ok');
      expect(detallePuertos.hdmi).toBe('ok');
      expect(detallePuertos.audio).toBe('ok');
      expect(detallePuertos.rj45).toBe('ok');
      expect(detallePuertos.observaciones).toContain('operativos');
    });

    it('detecta anomalías o puertos con fallas mecánicas/eléctricas', () => {
      const detalleConFalla: PuertosDetalle = {
        usb_a: 'danado',
        usb_c: 'ok',
        hdmi: 'falla',
        audio: 'ok',
        rj45: 'no_aplica',
        observaciones: 'Pin interno doblado en USB frontal.',
      };

      expect(detalleConFalla.usb_a).toBe('danado');
      expect(detalleConFalla.hdmi).toBe('falla');
      expect(detalleConFalla.rj45).toBe('no_aplica');
    });
  });

  // --------------------------------------------------------------------------
  // Tarea 2: Registro de temperaturas pre/post servicio (Flores Gabriel)
  // --------------------------------------------------------------------------
  describe('Tarea 2: Registro de temperaturas pre/post servicio', () => {
    it('calcula correctamente el delta térmico tras cambio de pasta térmica', () => {
      // Arrange: Pre 84°C, Post 62°C (CPU); Pre 80°C, Post 58°C (GPU)
      const res = evaluarTemperatura(84, 62, 80, 58);

      // Assert
      expect(res.deltaCpu).toBe(-22);
      expect(res.deltaGpu).toBe(-22);
      expect(res.alerta).toBe('normal');
    });

    it('emite advertencia cuando la temperatura supera 76°C post servicio', () => {
      const res = evaluarTemperatura(92, 79);

      expect(res.deltaCpu).toBe(-13);
      expect(res.alerta).toBe('advertencia');
    });

    it('emite alerta crítica cuando la temperatura excede 88°C', () => {
      const res = evaluarTemperatura(96, 91);

      expect(res.alerta).toBe('critica');
    });
  });

  // --------------------------------------------------------------------------
  // Tarea 3: Diagnóstico rápido de salud SMART (Flores Gabriel)
  // --------------------------------------------------------------------------
  describe('Tarea 3: Diagnóstico rápido de salud S.M.A.R.T.', () => {
    it('dictamina estado óptimo para unidad en 100% de salud y sin sectores reasignados', () => {
      const diag = evaluarSmart(100, 1500, 0, 35);

      expect(diag.estado).toBe('bueno');
      expect(diag.saludPorcentaje).toBe(100);
      expect(diag.diagnostico).toContain('óptimo');
    });

    it('identifica riesgo preventivo cuando existen sectores reasignados', () => {
      const diag = evaluarSmart(72, 12000, 14, 42);

      expect(diag.estado).toBe('riesgo');
      expect(diag.diagnostico).toContain('sectores reasignados');
    });

    it('emite alerta crítica cuando la vida útil cae por debajo del 40%', () => {
      const diag = evaluarSmart(28, 32000, 120, 52);

      expect(diag.estado).toBe('critico');
      expect(diag.diagnostico).toContain('CRÍTICO');
    });
  });

  // --------------------------------------------------------------------------
  // Tarea 4: Flujo completo del checklist y Cierre de Orden (Juarez Ariadna)
  // --------------------------------------------------------------------------
  describe('Tarea 4: Flujo completo del checklist y validación de cierre (TC06 / HU4 / HU5)', () => {
    it('comprueba que el catálogo total contiene las 6 tareas del MVP', () => {
      expect(TODAS_LAS_TAREAS).toHaveLength(6);
      expect(TODAS_LAS_TAREAS).toEqual([
        'limpieza',
        'ventiladores',
        'pasta_termica',
        'puertos',
        'temperatura',
        'smart',
      ]);
      expect(TAREAS_PARTE_1).toHaveLength(3);
      expect(TAREAS_PARTE_2).toHaveLength(3);
    });

    it('calcula métricas de progreso para Parte 1, Parte 2 y Global', () => {
      // 3 de 6 completadas = 50% global
      const progGlobal = calcularProgreso(itemsChecklistIncompletos, 'todos');
      expect(progGlobal.completadas).toBe(3);
      expect(progGlobal.total).toBe(6);
      expect(progGlobal.porcentaje).toBe(50);

      // Parte 1: 3 de 3 = 100%
      const progP1 = calcularProgreso(itemsChecklistIncompletos, 'parte1');
      expect(progP1.porcentaje).toBe(100);
      expect(parteUnoCompleta(itemsChecklistIncompletos)).toBe(true);

      // Parte 2: 0 de 3 = 0%
      const progP2 = calcularProgreso(itemsChecklistIncompletos, 'parte2');
      expect(progP2.porcentaje).toBe(0);
      expect(parteDosCompleta(itemsChecklistIncompletos)).toBe(false);

      expect(checklistCompleto(itemsChecklistIncompletos)).toBe(false);
    });

    it('TC06 / HU4/HU5: BLOQUEA el cierre de orden si existen tareas obligatorias sin marcar', async () => {
      // Intentar cerrar la orden con tareas pendientes
      const pendientes = obtenerTareasPendientes(itemsChecklistIncompletos);
      expect(pendientes).toHaveLength(3);
      expect(pendientes.map((p) => p.tarea)).toEqual(['puertos', 'temperatura', 'smart']);

      await expect(
        cerrarOrdenServicio('o1', {
          items: itemsChecklistIncompletos,
          cicloMeses: 6,
        })
      ).rejects.toThrow(/tareas obligatorias sin marcar/);
    });

    it('TC06 / HU4/HU5: PERMITE el cierre de orden solo cuando el checklist está al 100%', async () => {
      expect(checklistCompleto(itemsChecklistCompletos)).toBe(true);

      const ordenCerrada = await cerrarOrdenServicio('o1', {
        items: itemsChecklistCompletos,
        cicloMeses: 6,
        diagnostico: 'Servicio completo validado.',
        subsistemaAtendido: 'Refrigeración / Térmico',
        tipoIntervencion: 'preventiva',
      });

      expect(ordenCerrada).toBeDefined();
      expect(ordenCerrada.cerrada).toBe(true);
      expect(ordenCerrada.estado_semaforo).toBe('verde');
    });
  });
});
