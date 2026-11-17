import {
  agregarMantenimiento,
  analizarFallasRecurrentes,
  calcularMetricasFiabilidad,
  getHistorialEquipo,
} from '../../src/utils/historialService';
import {
  obtenerPerfilUsuario,
  actualizarPerfilUsuario,
  obtenerDirectorioIngenieros,
} from '../../src/services/perfilService';

describe('Sprint 9 · Análisis de Causa Raíz, Fallas Recurrentes (HU9), Perfil de Ingeniero e Integración', () => {
  test('HU9 Escenario 2: Detecta "Falla Recurrente Detectada" cuando un subsistema tiene 2 o más intervenciones correctivas', async () => {
    const equipo = {
      id: 'eq-sprint9-recurrente',
      numero_serie: 'SN-HU9-001',
      tipo_dispositivo: 'laptop',
      codigo_qr: 'TECHCARE-SN-HU9-001',
    };

    await agregarMantenimiento({
      id_equipo: equipo.id,
      numero_serie: equipo.numero_serie,
      codigo_qr: equipo.codigo_qr,
      fecha: '2026-08-10',
      subsistema: 'Refrigeración / Térmico',
      diagnostico: 'Apagado repentino por sobrecalentamiento a 95°C.',
      causa_raiz: 'Ventilador con rodamiento trabado',
      tecnico: 'Ing. Edgar Alegría',
      tipo_intervencion: 'correctiva',
      estado: 'completado',
    });

    await agregarMantenimiento({
      id_equipo: equipo.id,
      numero_serie: equipo.numero_serie,
      codigo_qr: equipo.codigo_qr,
      fecha: '2026-10-22',
      subsistema: 'Refrigeración / Térmico',
      diagnostico: 'Reincidencia de estrangulamiento térmico bajo carga.',
      causa_raiz: 'Thermal pad degradado en VRM y falta de contacto en heatpipe',
      tecnico: 'Ing. Gabriel Flores',
      tipo_intervencion: 'correctiva',
      estado: 'completado',
    });

    const historial = await getHistorialEquipo(equipo);
    const alertas = analizarFallasRecurrentes(historial);

    expect(alertas.length).toBeGreaterThanOrEqual(1);
    const alertaTermica = alertas.find((a) =>
      a.subsistema.toLowerCase().includes('refrigeración')
    );
    expect(alertaTermica).toBeDefined();
    expect(alertaTermica?.totalIncidencias).toBeGreaterThanOrEqual(2);
    expect(alertaTermica?.causasRaizPrevias).toContain('Ventilador con rodamiento trabado');
    expect(alertaTermica?.sugerenciaRevision).toContain('ventiladores');
  });

  test('HU9 Escenario 3: Registra causa raíz y actualiza métricas de fiabilidad del equipo', async () => {
    const equipo = {
      id: 'eq-sprint9-fiabilidad',
      numero_serie: 'SN-HU9-002',
      tipo_dispositivo: 'desktop',
      codigo_qr: 'TECHCARE-SN-HU9-002',
    };

    await agregarMantenimiento({
      id_equipo: equipo.id,
      numero_serie: equipo.numero_serie,
      codigo_qr: equipo.codigo_qr,
      fecha: '2026-11-05',
      subsistema: 'Fuente de poder y Batería',
      diagnostico: 'Reemplazo de fuente ATX certificada 80 Plus Bronze.',
      causa_raiz: 'Fuente de poder inestable en riel de 12V',
      tecnico: 'Ing. Ariadna Juárez',
      tipo_intervencion: 'correctiva',
      estado: 'completado',
    });

    const historial = await getHistorialEquipo(equipo);
    const metricas = calcularMetricasFiabilidad(historial);

    expect(metricas.totalIntervenciones).toBeGreaterThanOrEqual(1);
    expect(metricas.correctivas).toBeGreaterThanOrEqual(1);
    expect(metricas.indiceFiabilidad).toBeLessThanOrEqual(100);
    expect(metricas.indiceFiabilidad).toBeGreaterThanOrEqual(15);
    expect(metricas.ultimoIngeniero).toBe('Ing. Ariadna Juárez');
  });

  test('Módulo de Perfil de Ingeniero: Permite actualizar el nombre de usuario / firma y sincronizar con la plantilla de asignación', async () => {
    const actualizado = await actualizarPerfilUsuario({
      id: 'usr-test-01',
      email: 'gbfloresarguello@gmail.com',
      nombre: 'Gabriel',
      apellidos: 'Flores Argüello',
      nombreMostrar: 'Ing. Gabriel Flores (Líder Técnico)',
      rol: 'administrador',
      especialidad: 'Arquitectura, Almacenamiento y Diagnóstico S.M.A.R.T.',
    });

    expect(actualizado.nombreMostrar).toBe('Ing. Gabriel Flores (Líder Técnico)');
    expect(actualizado.rol).toBe('administrador');

    const recuperado = obtenerPerfilUsuario({
      user: { id: 'usr-test-01', email: 'gbfloresarguello@gmail.com' },
    });
    expect(recuperado.nombreMostrar).toBe('Ing. Gabriel Flores (Líder Técnico)');

    const directorio = obtenerDirectorioIngenieros();
    expect(directorio.some((ing) => ing.nombreMostrar === 'Ing. Gabriel Flores (Líder Técnico)')).toBe(
      true
    );
  });
});

