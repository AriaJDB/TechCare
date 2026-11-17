import { hasApiEnv, nuevoEquipo, rest, sesion, unico } from '../helpers/api';

const describeApi = hasApiEnv ? describe : describe.skip;

describeApi('API REST · Equipos (HU2, HU3)', () => {
  const idsCreados: string[] = [];
  let admin: Awaited<ReturnType<typeof sesion>>;
  let tecnico: Awaited<ReturnType<typeof sesion>>;

  beforeAll(async () => {
    admin = await sesion('admin');
    tecnico = await sesion('tecnico');
  });

  afterAll(async () => {
    for (const id of idsCreados) {
      await rest(`equipo?id_equipo=eq.${id}`, admin.token, {
        method: 'DELETE',
      });
    }
  });

  //#region CP-03
  it('CP-03: rechaza un equipo con número de serie duplicado', async () => {
    // Arrange
    const serie = unico('SN-DUP');
    const primero = await rest('equipo', admin.token, {
      method: 'POST',
      body: JSON.stringify(nuevoEquipo(admin.userId, serie)),
    });
    idsCreados.push(primero.body[0].id_equipo);
    const duplicado = {
      ...nuevoEquipo(admin.userId, serie),
      codigo_qr: unico('QR'),
    };

    // Act
    const respuesta = await rest('equipo', admin.token, {
      method: 'POST',
      body: JSON.stringify(duplicado),
    });

    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.code).toBe('23505');
    expect(JSON.stringify(respuesta.body)).toContain('numero_serie');
  });
  //#endregion

  //#region CP-04
  it('CP-04: un técnico no puede registrar equipos (RLS) → 403', async () => {
    // Arrange
    const equipo = nuevoEquipo(tecnico.userId);

    // Act
    const respuesta = await rest('equipo', tecnico.token, {
      method: 'POST',
      body: JSON.stringify(equipo),
    });

    // Assert
    expect(respuesta.status).toBe(403);
    expect(respuesta.body.code).toBe('42501');
  });
  //#endregion

  //#region CP-06
  it('CP-06: un código QR no registrado no devuelve equipos', async () => {
    // Arrange
    const qrInexistente = unico('QR-NO-EXISTE');

    // Act
    const respuesta = await rest(
      `equipo?codigo_qr=eq.${qrInexistente}`,
      tecnico.token,
    );

    // Assert
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([]);
  });
  //#endregion
});
