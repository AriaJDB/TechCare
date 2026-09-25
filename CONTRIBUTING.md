# Guía de Contribución para TechCare

### Flujo de trabajo (Gitflow)
1. Nunca trabajes directamente en `main` o `develop`.
2. Crea una rama a partir de `develop` con el formato `feature/nombre-modulo`, `bugfix/descripcion` o `hotfix/descripcion`.
3. Realiza commits usando **Conventional Commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).
4. Abre un Pull Request (PR) hacia `develop` (o `main` si es un hotfix).
5. El PR requiere la validación del CI en verde y al menos 1 revisión aprobada para el merge.

### Versionado
- Se emplea versionado semántico: `vMayor.Menor.Parche` vinculado al número de compilación interno (versionCode) para las tiendas de aplicaciones.