import { hasApiEnv, nuevoEquipo, rest, sesion } from '../helpers/api';

const describeApi = hasApiEnv ? describe : describe.skip;

describeApi('API REST · Órdenes de servicio y checklist (HU4, HU5)', () => {
  let admin: Awaited<ReturnType<typeof sesion>>;
  let tecnico: Awaited<ReturnType<typeof sesion>>;
  let idEquipo = '';
  let idOrden = '';

  beforeAll(async () => {
    admin = await sesion('admin');
    tecnico = await sesion('tecnico');

    const equipo = await rest('equipo', admin.token, {
      method: 'POST',
      body: JSON.stringify(nuevoEquipo(admin.userId)),
    });
    idEquipo = equipo.body[0].id_equipo;

    // Ajusta los valores de enum al esquema real si difieren.
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

    // Garantiza al menos una tarea obligatoria sin marcar en la orden.
    const items = await rest(
      `checklist_item?id_orden=eq.${idOrden}`,
      tecnico.token,
    );
    if (items.body.length === 0) {
      await rest('checklist_item', tecnico.token, {
        method: 'POST',
        body: JSON.stringify({ id_orden: idOrden, tarea: 'limpieza' }),
      });
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
});
