jest.mock('../../src/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

import {
  calcularProgreso,
  parteUnoCompleta,
  guardarBorradorLocal,
  obtenerBorradorLocal,
  iniciarOrden,
  obtenerChecklist,
  marcarTarea,
  type ChecklistItem,
} from '../../src/services/checklistService';
import { supabase } from '../../src/supabaseClient';

describe('Checklist de Servicio - Cálculo de Progreso (HU4)', () => {
  const fabricarItem = (
    tarea: ChecklistItem['tarea'],
    completado: boolean,
  ): ChecklistItem => ({
    id_item: `item-${tarea}`,
    id_orden: 'orden-123',
    tarea,
    obligatorio: true,
    completado,
    fecha_marcado: completado ? '2026-10-21T10:00:00Z' : null,
  });

  //#region CP-UNIT-01: Progreso vacío
  it('devuelve 0% cuando la lista de ítems está vacía', () => {
    // Arrange
    const items: ChecklistItem[] = [];

    // Act
    const resultado = calcularProgreso(items);

    // Assert
    expect(resultado).toEqual({ completadas: 0, total: 0, porcentaje: 0 });
  });
  //#endregion

  //#region CP-UNIT-02: Ninguna tarea completada
  it('devuelve 0 de 3 (0%) cuando ninguna tarea de la Parte 1 está marcada', () => {
    // Arrange
    const items: ChecklistItem[] = [
      fabricarItem('limpieza', false),
      fabricarItem('ventiladores', false),
      fabricarItem('pasta_termica', false),
    ];

    // Act
    const resultado = calcularProgreso(items);

    // Assert
    expect(resultado.completadas).toBe(0);
    expect(resultado.total).toBe(3);
    expect(resultado.porcentaje).toBe(0);
  });
  //#endregion

  //#region CP-UNIT-03: 1 de 3 tareas completadas
  it('devuelve 1 de 3 (33%) cuando solo una tarea está marcada', () => {
    // Arrange
    const items: ChecklistItem[] = [
      fabricarItem('limpieza', true),
      fabricarItem('ventiladores', false),
      fabricarItem('pasta_termica', false),
    ];

    // Act
    const resultado = calcularProgreso(items);

    // Assert
    expect(resultado.completadas).toBe(1);
    expect(resultado.total).toBe(3);
    expect(resultado.porcentaje).toBe(33);
  });
  //#endregion

  //#region CP-UNIT-04: 2 de 3 tareas completadas
  it('devuelve 2 de 3 (67%) cuando dos tareas están marcadas', () => {
    // Arrange
    const items: ChecklistItem[] = [
      fabricarItem('limpieza', true),
      fabricarItem('ventiladores', true),
      fabricarItem('pasta_termica', false),
    ];

    // Act
    const resultado = calcularProgreso(items);

    // Assert
    expect(resultado.completadas).toBe(2);
    expect(resultado.total).toBe(3);
    expect(resultado.porcentaje).toBe(67);
  });
  //#endregion

  //#region CP-UNIT-05: 3 de 3 tareas completadas
  it('devuelve 3 de 3 (100%) cuando todas las tareas de la Parte 1 están marcadas', () => {
    // Arrange
    const items: ChecklistItem[] = [
      fabricarItem('limpieza', true),
      fabricarItem('ventiladores', true),
      fabricarItem('pasta_termica', true),
    ];

    // Act
    const resultado = calcularProgreso(items);

    // Assert
    expect(resultado.completadas).toBe(3);
    expect(resultado.total).toBe(3);
    expect(resultado.porcentaje).toBe(100);
  });
  //#endregion

  //#region CP-UNIT-06: Ignorar tareas de Parte 2
  it('ignora tareas pertenecientes a la Parte 2 al calcular el progreso de la Parte 1', () => {
    // Arrange
    const items: ChecklistItem[] = [
      fabricarItem('limpieza', true),
      fabricarItem('ventiladores', true),
      fabricarItem('pasta_termica', false),
      fabricarItem('puertos', true), // Tarea de Parte 2 (Sprint 6)
      fabricarItem('temperatura', false), // Tarea de Parte 2 (Sprint 6)
    ];

    // Act
    const resultado = calcularProgreso(items);

    // Assert
    expect(resultado.total).toBe(3);
    expect(resultado.completadas).toBe(2);
    expect(resultado.porcentaje).toBe(67);
  });
  //#endregion

  //#region CP-UNIT-07: Lista sin tareas de Parte 1
  it('devuelve total 0 y porcentaje 0 cuando los ítems no corresponden a la Parte 1', () => {
    // Arrange
    const items: ChecklistItem[] = [
      fabricarItem('puertos', true),
      fabricarItem('smart', false),
    ];

    // Act
    const resultado = calcularProgreso(items);

    // Assert
    expect(resultado).toEqual({ completadas: 0, total: 0, porcentaje: 0 });
  });
  //#endregion
});

describe('Checklist de Servicio - Validación de Parte 1 Completa (HU4)', () => {
  const fabricarItem = (
    tarea: ChecklistItem['tarea'],
    completado: boolean,
  ): ChecklistItem => ({
    id_item: `item-${tarea}`,
    id_orden: 'orden-456',
    tarea,
    obligatorio: true,
    completado,
    fecha_marcado: completado ? '2026-10-21T10:00:00Z' : null,
  });

  //#region CP-VAL-01: Lista vacía
  it('retorna false cuando la lista de ítems está vacía', () => {
    // Arrange
    const items: ChecklistItem[] = [];

    // Act
    const completa = parteUnoCompleta(items);

    // Assert
    expect(completa).toBe(false);
  });
  //#endregion

  //#region CP-VAL-02: Falta 'ventiladores'
  it('retorna false si falta la nueva tarea "ventiladores" en la lista', () => {
    // Arrange
    const items: ChecklistItem[] = [
      fabricarItem('limpieza', true),
      fabricarItem('pasta_termica', true),
    ];

    // Act
    const completa = parteUnoCompleta(items);

    // Assert
    expect(completa).toBe(false);
  });
  //#endregion

  //#region CP-VAL-03: Falta 'limpieza'
  it('retorna false si falta la tarea "limpieza"', () => {
    // Arrange
    const items: ChecklistItem[] = [
      fabricarItem('ventiladores', true),
      fabricarItem('pasta_termica', true),
    ];

    // Act
    const completa = parteUnoCompleta(items);

    // Assert
    expect(completa).toBe(false);
  });
  //#endregion

  //#region CP-VAL-04: Falta 'pasta_termica'
  it('retorna false si falta la tarea "pasta_termica"', () => {
    // Arrange
    const items: ChecklistItem[] = [
      fabricarItem('limpieza', true),
      fabricarItem('ventiladores', true),
    ];

    // Act
    const completa = parteUnoCompleta(items);

    // Assert
    expect(completa).toBe(false);
  });
  //#endregion

  //#region CP-VAL-05: Tarea pendiente
  it('retorna false si las 3 tareas existen pero "ventiladores" sigue pendiente', () => {
    // Arrange
    const items: ChecklistItem[] = [
      fabricarItem('limpieza', true),
      fabricarItem('ventiladores', false),
      fabricarItem('pasta_termica', true),
    ];

    // Act
    const completa = parteUnoCompleta(items);

    // Assert
    expect(completa).toBe(false);
  });
  //#endregion

  //#region CP-VAL-06: Estrictamente las 3 tareas completadas
  it('retorna true cuando las 3 tareas de la Parte 1 están completadas', () => {
    // Arrange
    const items: ChecklistItem[] = [
      fabricarItem('limpieza', true),
      fabricarItem('ventiladores', true),
      fabricarItem('pasta_termica', true),
    ];

    // Act
    const completa = parteUnoCompleta(items);

    // Assert
    expect(completa).toBe(true);
  });
  //#endregion

  //#region CP-VAL-07: Parte 1 completa aun con tareas de Parte 2 pendientes
  it('retorna true si la Parte 1 está completa aunque tareas de la Parte 2 sigan pendientes', () => {
    // Arrange
    const items: ChecklistItem[] = [
      fabricarItem('limpieza', true),
      fabricarItem('ventiladores', true),
      fabricarItem('pasta_termica', true),
      fabricarItem('puertos', false), // Tarea Parte 2 pendiente
      fabricarItem('temperatura', false), // Tarea Parte 2 pendiente
    ];

    // Act
    const completa = parteUnoCompleta(items);

    // Assert
    expect(completa).toBe(true);
  });
  //#endregion
});

describe('Checklist de Servicio - Resiliencia y Borrador Offline', () => {
  beforeEach(() => {
    // Simular un mock de localStorage en memoria para Jest
    const storage: Record<string, string> = {};
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          Object.keys(storage).forEach((k) => delete storage[k]);
        },
      },
      writable: true,
      configurable: true,
    });
  });

  it('guarda y recupera el borrador local sin perder avance', () => {
    // Arrange
    const idOrden = 'orden-offline-test';
    const items: ChecklistItem[] = [
      {
        id_item: 'item-1',
        id_orden: idOrden,
        tarea: 'limpieza',
        obligatorio: true,
        completado: true,
        fecha_marcado: '2026-10-21T10:00:00Z',
      },
    ];

    // Act
    guardarBorradorLocal(idOrden, items);
    const recuperado = obtenerBorradorLocal(idOrden);

    // Assert
    expect(recuperado).toEqual(items);
  });

  it('retorna null si no existe borrador local previo', () => {
    // Act
    const resultado = obtenerBorradorLocal('orden-inexistente');

    // Assert
    expect(resultado).toBeNull();
  });

  it('retorna null de forma segura si el contenido en localStorage está corrupto', () => {
    // Arrange
    localStorage.setItem('techcare_checklist_draft_corrupto', '{json-invalido');

    // Act
    const resultado = obtenerBorradorLocal('corrupto');

    // Assert
    expect(resultado).toBeNull();
  });
});

describe('Checklist de Servicio - Métodos de Supabase (Mocked)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  //#region CP-SVC-01: Iniciar orden con sesión inválida
  it('lanza un error si no hay sesión de usuario autenticada', async () => {
    // Arrange
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
    });

    // Act & Assert
    await expect(iniciarOrden('equipo-123')).rejects.toThrow(
      'Sesión de usuario no válida para iniciar la orden.',
    );
  });
  //#endregion

  //#region CP-SVC-02: Reanudar orden abierta existente
  it('reanuda la orden existente si ya hay una orden abierta para el equipo', async () => {
    // Arrange
    const ordenExistente = {
      id_orden: 'orden-abierta-1',
      id_equipo: 'equipo-123',
      id_tecnico: 'tecnico-xyz',
      cerrada: false,
    };

    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: 'tecnico-xyz' } },
    });

    const mockSelectOrdenes = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [ordenExistente],
              error: null,
            }),
          }),
        }),
      }),
    });

    const mockSelectItems = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: [{ tarea: 'limpieza' }, { tarea: 'ventiladores' }, { tarea: 'pasta_termica' }],
        error: null,
      }),
    });

    (supabase.from as jest.Mock).mockImplementation((tabla: string) => {
      if (tabla === 'orden_servicio') {
        return { select: mockSelectOrdenes };
      }
      if (tabla === 'checklist_item') {
        return { select: mockSelectItems };
      }
      return {};
    });

    // Act
    const resultado = await iniciarOrden('equipo-123');

    // Assert
    expect(resultado).toEqual(ordenExistente);
  });
  //#endregion

  //#region CP-SVC-03: Crear nueva orden de servicio
  it('crea una nueva orden e inserta tareas faltantes si no existía orden abierta', async () => {
    // Arrange
    const nuevaOrden = {
      id_orden: 'orden-nueva-99',
      id_equipo: 'equipo-123',
      id_tecnico: 'tecnico-xyz',
      cerrada: false,
    };

    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: 'tecnico-xyz' } },
    });

    const mockSelectOrdenes = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });

    const mockInsertOrden = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: nuevaOrden,
          error: null,
        }),
      }),
    });

    const mockInsertItems = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockSelectItems = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: [], // Sin tareas previas
        error: null,
      }),
    });

    (supabase.from as jest.Mock).mockImplementation((tabla: string) => {
      if (tabla === 'orden_servicio') {
        return {
          select: mockSelectOrdenes,
          insert: mockInsertOrden,
        };
      }
      if (tabla === 'checklist_item') {
        return {
          select: mockSelectItems,
          insert: mockInsertItems,
        };
      }
      return {};
    });

    // Act
    const resultado = await iniciarOrden('equipo-123', 'tecnico-xyz');

    // Assert
    expect(resultado).toEqual(nuevaOrden);
    expect(mockInsertItems).toHaveBeenCalled();
  });
  //#endregion

  //#region CP-SVC-04: Obtener checklist exitoso
  it('obtiene y ordena el checklist por orden oficial de tareas', async () => {
    // Arrange
    const itemsDesordenados = [
      { id_item: '3', tarea: 'pasta_termica', completado: false },
      { id_item: '1', tarea: 'limpieza', completado: true },
      { id_item: '2', tarea: 'ventiladores', completado: false },
    ];

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: itemsDesordenados,
          error: null,
        }),
      }),
    });

    // Act
    const resultado = await obtenerChecklist('orden-123');

    // Assert
    expect(resultado[0].tarea).toBe('limpieza');
    expect(resultado[1].tarea).toBe('ventiladores');
    expect(resultado[2].tarea).toBe('pasta_termica');
  });
  //#endregion

  //#region CP-SVC-05: Marcar tarea exitoso
  it('marca una tarea técnica y devuelve el ítem actualizado', async () => {
    // Arrange
    const itemActualizado = {
      id_item: 'item-vent',
      tarea: 'ventiladores',
      completado: true,
      fecha_marcado: '2026-10-21T12:00:00Z',
    };

    (supabase.from as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: itemActualizado,
              error: null,
            }),
          }),
        }),
      }),
    });

    // Act
    const resultado = await marcarTarea('item-vent', true);

    // Assert
    expect(resultado).toEqual(itemActualizado);
  });
  //#endregion

  //#region CP-SVC-06: Error al marcar tarea
  it('lanza un error genérico si falla el update en la base de datos', async () => {
    // Arrange
    (supabase.from as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }),
    });

    // Act & Assert
    await expect(marcarTarea('item-vent', true)).rejects.toThrow(
      'Error al actualizar la verificación. Por favor intente nuevamente.',
    );
  });
  //#endregion

  //#region CP-SVC-07: Error al crear orden
  it('lanza un error si falla la creación de la nueva orden en Supabase', async () => {
    // Arrange
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: 'tecnico-xyz' } },
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insert error' },
          }),
        }),
      }),
    });

    // Act & Assert
    await expect(iniciarOrden('equipo-fallo', 'tecnico-xyz')).rejects.toThrow(
      'No se pudo crear la orden de servicio. Intente nuevamente.',
    );
  });
  //#endregion

  //#region CP-SVC-08: Fallback de borrador local en error de obtenerChecklist
  it('devuelve el borrador local si obtenerChecklist falla por red', async () => {
    // Arrange
    const idOrden = 'orden-red-caida';
    const itemsOffline: ChecklistItem[] = [
      {
        id_item: 'item-1',
        id_orden: idOrden,
        tarea: 'limpieza',
        obligatorio: true,
        completado: true,
        fecha_marcado: '2026-10-21T10:00:00Z',
      },
    ];
    guardarBorradorLocal(idOrden, itemsOffline);

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Network request failed' },
        }),
      }),
    });

    // Act
    const resultado = await obtenerChecklist(idOrden);

    // Assert
    expect(resultado).toEqual(itemsOffline);
  });
  //#endregion

  //#region CP-SVC-09: Error fatal si obtenerChecklist falla y no hay borrador local
  it('lanza un error si obtenerChecklist falla y no existe borrador local', async () => {
    // Arrange
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Network error' },
        }),
      }),
    });

    // Act & Assert
    await expect(obtenerChecklist('orden-sin-borrador')).rejects.toThrow(
      'No fue posible cargar el checklist. Verifique su conexión.',
    );
  });
  //#endregion
});
