import { hasApiEnv, nuevoEquipo, rest, sesion } from '../helpers/api';

const describeApi = hasApiEnv ? describe : describe.skip;

describeApi('API REST · Órdenes de servicio y checklist (HU4, HU5)', () => {
  let admin: Awaited<ReturnType<typeof sesion>>;
  let tecnico: Awaited<ReturnType<typeof sesion>>;
  let idEquipo = '';
  let idOrden = '';
  let idItemVentiladores = '';

  beforeAll(async () => {
    admin = await sesion('admin');
    tecnico = await sesion('tecnico');

    const equipo = await rest('equipo', admin.token, {
      method: 'POST',
      body: JSON.stringify(nuevoEquipo(admin.userId)),
    });
    idEquipo = equipo.body[0].id_equipo;

    // Crear orden asignada al técnico
    const orden = await rest('orden_servicio', tecnico.token, {
      method: 'POST',
      body: JSON.stringify({
        id_equipo: idEquipo,
        id_tecnico: tecnico.userId,
        ciclo_meses: 6,
        tipo_intervencion: 'preventiva',
      }),
    });
    idOrden = orden.body[0].id_orden;

    // Consultar o insertar los ítems de checklist requeridos
    const items = await rest(
      `checklist_item?id_orden=eq.${idOrden}`,
      tecnico.token,
    );
    const existing = items.body as Array<{ id_item: string; tarea: string }>;
    
    // Asegurar ítem de limpieza
    if (!existing.some((it) => it.tarea === 'limpieza')) {
      await rest('checklist_item', tecnico.token, {
        method: 'POST',
        body: JSON.stringify({ id_orden: idOrden, tarea: 'limpieza' }),
      });
    }

    // Asegurar ítem de ventiladores (nuevo valor Sprint 5)
    const vent = existing.find((it) => it.tarea === 'ventiladores');
    if (vent) {
      idItemVentiladores = vent.id_item;
    } else {
      const creadoVent = await rest('checklist_item', tecnico.token, {
        method: 'POST',
        body: JSON.stringify({ id_orden: idOrden, tarea: 'ventiladores' }),
      });
      if (creadoVent.status === 201 && creadoVent.body?.[0]) {
        idItemVentiladores = creadoVent.body[0].id_item;
      }
    }
  });

  afterAll(async () => {
    const borrar = { method: 'DELETE' };
    await rest(`checklist_item?id_orden=eq.${idOrden}`, admin.token, borrar);
    await rest(`orden_servicio?id_orden=eq.${idOrden}`, admin.token, borrar);
    await rest(`equipo?id_equipo=eq.${idEquipo}`, admin.token, borrar);
  });

  //#region CP-05
  it('CP-05: bloquea el cierre con checklist incompleto (HTTP 400)', async () => {
    // Arrange
    const cierre = { cerrada: true, fecha_cierre: new Date().toISOString() };

    // Act
    const ruta = `orden_servicio?id_orden=eq.${idOrden}`;
    const respuesta = await rest(ruta, tecnico.token, {
      method: 'PATCH',
      body: JSON.stringify(cierre),
    });
    const orden = await rest(ruta, tecnico.token);

    // Assert
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.code).toBe('P0001');
    expect(orden.body[0].cerrada).toBe(false);
  });
  //#endregion

  //#region CP-10
  it('CP-10: el técnico marca su ítem ventiladores y el trigger fija fecha_marcado no nulo', async () => {
    // Arrange
    if (!idItemVentiladores) {
      const items = await rest(`checklist_item?id_orden=eq.${idOrden}&tarea=eq.ventiladores`, tecnico.token);
      idItemVentiladores = items.body?.[0]?.id_item;
    }

    // Act
    const respuesta = await rest(`checklist_item?id_item=eq.${idItemVentiladores}`, tecnico.token, {
      method: 'PATCH',
      body: JSON.stringify({ completado: true }),
    });

    // Assert
    expect(respuesta.status).toBe(200);
    expect(respuesta.body[0].completado).toBe(true);
    expect(respuesta.body[0].fecha_marcado).not.toBeNull();
  });
  //#endregion

  //#region CP-11
  it('CP-11: un técnico NO puede modificar ítems de otra orden (RLS)', async () => {
    // Arrange: Creamos un ítem o usamos una orden con id_tecnico distinto
    const rutaItem = `checklist_item?id_item=eq.${idItemVentiladores}`;

    // Act: Intentamos modificar usando un token ajeno o modificando id_tecnico
    // Si admin tiene otra orden, probamos que el técnico no pueda editarla
    const ordenAdmin = await rest('orden_servicio', admin.token, {
      method: 'POST',
      body: JSON.stringify({
        id_equipo: idEquipo,
        id_tecnico: admin.userId, // Orden de otro usuario
        ciclo_meses: 6,
        tipo_intervencion: 'preventiva',
      }),
    });
    const idOrdenAdmin = ordenAdmin.body[0].id_orden;

    const itemAdmin = await rest('checklist_item', admin.token, {
      method: 'POST',
      body: JSON.stringify({ id_orden: idOrdenAdmin, tarea: 'limpieza' }),
    });
    const idItemAdmin = itemAdmin.body[0].id_item;

    // El técnico intenta modificar el ítem del admin
    const respuestaHack = await rest(`checklist_item?id_item=eq.${idItemAdmin}`, tecnico.token, {
      method: 'PATCH',
      body: JSON.stringify({ completado: true }),
    });

    // Limpieza de la orden admin
    await rest(`checklist_item?id_orden=eq.${idOrdenAdmin}`, admin.token, { method: 'DELETE' });
    await rest(`orden_servicio?id_orden=eq.${idOrdenAdmin}`, admin.token, { method: 'DELETE' });

    // Assert: PostgREST con RLS devuelve array vacío (0 registros modificados) o HTTP 403
    expect([200, 403, 404]).toContain(respuestaHack.status);
    if (respuestaHack.status === 200) {
      expect(respuestaHack.body).toEqual([]);
    }
  });
  //#endregion

  //#region CP-12
  it('CP-12: no permite modificar ítems de una orden de servicio cerrada', async () => {
    // Arrange: Crear orden temporal y cerrarla
    const ordenTemp = await rest('orden_servicio', admin.token, {
      method: 'POST',
      body: JSON.stringify({
        id_equipo: idEquipo,
        id_tecnico: admin.userId,
        ciclo_meses: 6,
        tipo_intervencion: 'preventiva',
      }),
    });
    const idTemp = ordenTemp.body[0].id_orden;

    const itemTemp = await rest('checklist_item', admin.token, {
      method: 'POST',
      body: JSON.stringify({ id_orden: idTemp, tarea: 'limpieza', obligatorio: false, completado: true }),
    });
    const idItemTemp = itemTemp.body[0].id_item;

    // Cerrar orden
    await rest(`orden_servicio?id_orden=eq.${idTemp}`, admin.token, {
      method: 'PATCH',
      body: JSON.stringify({ cerrada: true, fecha_cierre: new Date().toISOString() }),
    });

    // Act: Intentar modificar el ítem de la orden cerrada
    const respuestaModif = await rest(`checklist_item?id_item=eq.${idItemTemp}`, admin.token, {
      method: 'PATCH',
      body: JSON.stringify({ completado: false }),
    });

    // Limpieza
    await rest(`checklist_item?id_orden=eq.${idTemp}`, admin.token, { method: 'DELETE' });
    await rest(`orden_servicio?id_orden=eq.${idTemp}`, admin.token, { method: 'DELETE' });

    // Assert: El trigger de inmutabilidad rechaza con HTTP 400 (P0001) o 403
    expect([400, 403]).toContain(respuestaModif.status);
  });
  //#endregion
});
