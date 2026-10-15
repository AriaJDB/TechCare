import { credenciales, hasApiEnv, login, rest } from '../helpers/api';

const describeApi = hasApiEnv ? describe : describe.skip;

describeApi('API REST · Autenticación (HU1)', () => {
  //#region CP-01
  it('CP-01: login válido devuelve HTTP 200 y un token JWT', async () => {
    // Arrange
    const { email, password } = credenciales.tecnico;

    // Act
    const respuesta = await login(email, password);

    // Assert
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.access_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(respuesta.body.user.email).toBe(email);
  });
  //#endregion

  //#region CP-02
  it('CP-02: contraseña incorrecta devuelve HTTP 400 sin token', async () => {
    // Arrange
    const { email } = credenciales.tecnico;
    const passwordIncorrecta = 'contraseña-incorrecta-123';

    // Act
    const respuesta = await login(email, passwordIncorrecta);

    // Assert
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error_code).toBe('invalid_credentials');
    expect(respuesta.body.access_token).toBeUndefined();
  });
  //#endregion

  //#region CP-07
  it('CP-07: un JWT inválido o vencido se rechaza con HTTP 401', async () => {
    // Arrange
    const tokenInvalido = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.firma-invalida';
    const ruta = 'equipo?select=id_equipo&limit=1';

    // Act
    const respuesta = await rest(ruta, tokenInvalido);

    // Assert
    expect(respuesta.status).toBe(401);
  });
  //#endregion
});
