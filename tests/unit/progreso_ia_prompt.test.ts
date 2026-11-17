/**
 * Suite de Pruebas Unitarias Generadas con Asistente de IA
 * Contexto: Proyecto TechCare (Sistema de Mantenimiento Preventivo y Correctivo)
 * Función bajo prueba: calcularProgreso (src/services/checklistService.ts)
 * Patrón utilizado: AAA (Arrange - Act - Assert)
 */

jest.mock('../../src/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

import {
  calcularProgreso,
  ChecklistItem,
  ProgresoChecklist,
} from '../../src/services/checklistService';

describe('Pruebas Unitarias con IA: calcularProgreso (Patrón AAA)', () => {
  // Función auxiliar para fabricar ítems de prueba
  const crearItem = (
    tarea: ChecklistItem['tarea'],
    completado: boolean,
  ): ChecklistItem => ({
    id_item: `item-${tarea}`,
    id_orden: 'orden-mock-001',
    tarea,
    obligatorio: true,
    completado,
    fecha_marcado: completado ? '2026-10-27T10:00:00Z' : null,
  });

  // CASO DE PRUEBA 1: Lista vacía o sin tareas
  test('CP-IA-01: Debe retornar progreso en 0% cuando la lista de ítems está vacía', () => {
    // ==========================================
    // ARRANGE: Preparar datos de entrada vacíos
    // ==========================================
    const itemsEntrada: ChecklistItem[] = [];

    // ==========================================
    // ACT: Ejecutar la función bajo prueba
    // ==========================================
    const resultado: ProgresoChecklist = calcularProgreso(itemsEntrada);

    // ==========================================
    // ASSERT: Verificar que los valores calculados sean ceros
    // ==========================================
    expect(resultado).toBeDefined();
    expect(resultado.total).toBe(0);
    expect(resultado.completadas).toBe(0);
    expect(resultado.porcentaje).toBe(0);
  });

  // CASO DE PRUEBA 2: Ninguna tarea completada
  test('CP-IA-02: Debe calcular 0% cuando existen tareas de Parte 1 pero ninguna está completada', () => {
    // ==========================================
    // ARRANGE: Preparar 3 tareas de la Parte 1 en estado pendiente (false)
    // ==========================================
    const itemsEntrada: ChecklistItem[] = [
      crearItem('limpieza', false),
      crearItem('ventiladores', false),
      crearItem('pasta_termica', false),
    ];

    // ==========================================
    // ACT: Ejecutar la función con las tareas pendientes
    // ==========================================
    const resultado: ProgresoChecklist = calcularProgreso(itemsEntrada);

    // ==========================================
    // ASSERT: Verificar que se contabilizan 3 tareas totales, 0 completadas y 0%
    // ==========================================
    expect(resultado.total).toBe(3);
    expect(resultado.completadas).toBe(0);
    expect(resultado.porcentaje).toBe(0);
  });

  // CASO DE PRUEBA 3: Progreso parcial (1 de 3 completadas = 33%)
  test('CP-IA-03: Debe calcular correctamente el 33% cuando se completa 1 de 3 tareas (redondeo matemático)', () => {
    // ==========================================
    // ARRANGE: Configurar 1 tarea completada y 2 pendientes
    // ==========================================
    const itemsEntrada: ChecklistItem[] = [
      crearItem('limpieza', true),
      crearItem('ventiladores', false),
      crearItem('pasta_termica', false),
    ];

    // ==========================================
    // ACT: Ejecutar cálculo de progreso
    // ==========================================
    const resultado: ProgresoChecklist = calcularProgreso(itemsEntrada);

    // ==========================================
    // ASSERT: 1/3 equivale a ~33.33%, debe redondearse al entero 33%
    // ==========================================
    expect(resultado.total).toBe(3);
    expect(resultado.completadas).toBe(1);
    expect(resultado.porcentaje).toBe(33);
  });

  // CASO DE PRUEBA 4: 100% de tareas completadas
  test('CP-IA-04: Debe calcular 100% cuando todas las tareas obligatorias de la Parte 1 están finalizadas', () => {
    // ==========================================
    // ARRANGE: Marcar las 3 tareas de la Parte 1 como completadas
    // ==========================================
    const itemsEntrada: ChecklistItem[] = [
      crearItem('limpieza', true),
      crearItem('ventiladores', true),
      crearItem('pasta_termica', true),
    ];

    // ==========================================
    // ACT: Ejecutar la función bajo prueba
    // ==========================================
    const resultado: ProgresoChecklist = calcularProgreso(itemsEntrada);

    // ==========================================
    // ASSERT: Verificar que completadas sea igual a total y el porcentaje sea 100%
    // ==========================================
    expect(resultado.total).toBe(3);
    expect(resultado.completadas).toBe(3);
    expect(resultado.porcentaje).toBe(100);
  });

  // CASO DE PRUEBA 5: Filtrado de tareas no pertenecientes a la Parte 1
  test('CP-IA-05: Debe ignorar tareas que pertenecen a otras fases (puertos, temperatura) y considerar solo Parte 1', () => {
    // ==========================================
    // ARRANGE: Mezclar tareas de la Parte 1 con tareas avanzadas de otras fases
    // ==========================================
    const itemsEntrada: ChecklistItem[] = [
      crearItem('limpieza', true), // Parte 1 (completada)
      crearItem('ventiladores', true), // Parte 1 (completada)
      crearItem('pasta_termica', false), // Parte 1 (pendiente)
      crearItem('puertos', true), // Otra fase (debe ignorarse en cálculo Parte 1)
      crearItem('temperatura', true), // Otra fase (debe ignorarse en cálculo Parte 1)
    ];

    // ==========================================
    // ACT: Ejecutar la función bajo prueba
    // ==========================================
    const resultado: ProgresoChecklist = calcularProgreso(itemsEntrada);

    // ==========================================
    // ASSERT: Solo debe evaluar las 3 tareas de Parte 1 (2 completadas de 3 = 67%)
    // ==========================================
    expect(resultado.total).toBe(3);
    expect(resultado.completadas).toBe(2);
    expect(resultado.porcentaje).toBe(67);
  });
});
