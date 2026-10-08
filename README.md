# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # TechCare

  Aplicación web con soporte para Android, creada para servir como punto de partida para el mantenimiento preventivo y la trazabilidad técnica. Actualmente permite crear una cuenta, iniciar sesión y cerrar sesión mediante Supabase; al entrar, muestra un panel principal básico.

  > **Estado actual:** las funciones de gestión de equipos, órdenes de trabajo e historial de mantenimiento todavía no están implementadas.

  ## Requisitos

  - Git.
  - Node.js **20.19 o posterior** (o **22.12 o posterior**) y npm. Puedes comprobar las versiones con `node -v` y `npm -v`.
  - Un proyecto de [Supabase](https://supabase.com/) para habilitar el registro y el inicio de sesión.
  - Para compilar o ejecutar la versión Android: Android Studio con el SDK de Android configurado.

  ## 1. Descargar el proyecto

  Abre una terminal y ejecuta:

  ```bash
  git clone https://github.com/AriaJDB/TechCare.git
  cd TechCare
  ```

  ## 2. Instalar dependencias

  Desde la carpeta del proyecto, instala las dependencias definidas por el proyecto:

  ```bash
  npm ci
  ```

  ## 3. Conectar Supabase

  La aplicación necesita la URL y la clave pública (anon/publishable) de tu proyecto Supabase para iniciar. En el panel de Supabase, crea o abre un proyecto y copia estos datos desde **Project Settings → API**.

  Crea un archivo llamado `.env` en la carpeta raíz del proyecto, junto a `package.json`, y agrega:

  ```env
  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
  VITE_SUPABASE_ANON_KEY=tu_clave_publica_de_supabase
  ```

  Reemplaza los valores de ejemplo por los de tu proyecto. No pongas espacios alrededor de `=`. Reinicia el servidor de desarrollo después de cambiar este archivo.

  La clave `anon`/publicable se utiliza desde el navegador y no es una contraseña administrativa. **Nunca incluyas una clave `service_role` en la aplicación ni en el archivo `.env` del frontend.** Configura políticas de seguridad (RLS) en Supabase antes de guardar datos de usuarios.

  ## 4. Ejecutar en desarrollo

  ```bash
  npm run dev
  ```

  Abre en el navegador la dirección que indique la terminal, normalmente <http://localhost:5173>. Desde la pantalla de TechCare puedes crear una cuenta o iniciar sesión. Si el registro requiere confirmación, revisa el correo electrónico asociado a la cuenta.

  ## Comandos disponibles

  | Comando | Para qué sirve |
  | --- | --- |
  | `npm run dev` | Inicia el servidor local de desarrollo. |
  | `npm run build` | Comprueba TypeScript y genera la versión de producción en `dist/`. |
  | `npm run preview` | Sirve localmente la versión compilada para revisarla. Ejecuta primero `npm run build`. |
  | `npm run lint` | Revisa el código con ESLint. |

  ## Crear la versión Android (opcional)

  Una vez instalado Android Studio y configurado el SDK, genera la versión web y sincronízala con el proyecto Android:

  ```bash
  npm run build
  npx cap sync android
  npx cap open android
  ```

  Android Studio abrirá el proyecto para que puedas ejecutarlo en un emulador o en un dispositivo conectado. Si modificas la aplicación web, vuelve a ejecutar `npm run build` y `npx cap sync android` para actualizar los archivos que usa Android.

  ## Tecnologías

  - React y TypeScript para la interfaz.
  - Vite para desarrollo y compilación web.
  - Supabase Auth para el registro y el inicio/cierre de sesión.
  - Capacitor para integrar la aplicación con Android.
