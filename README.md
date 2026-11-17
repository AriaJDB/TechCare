# TechCare — Sistema Móvil de Gestión de Mantenimiento Preventivo y Trazabilidad Técnica

Aplicación móvil y web progresiva desarrollada con **React + TypeScript + Vite**, empaquetada con **Capacitor** para Android y respaldada por **Supabase** (PostgreSQL, Auth y Storage).

> **Estado del Proyecto:** MVP 100% completado e integrado (Sprints 1 al 10 — Historias de Usuario HU1 a HU9).

---

## Módulos Implementados del MVP

1. **Módulo 1 · Autenticación, Biometría y Perfiles de Ingeniero (HU1):**
   * Inicio de sesión y registro con Supabase Auth, inicio rápido con huella dactilar (`@capgo/capacitor-native-biometric`) y gestión de perfil de usuario/ingeniero con plantilla de asignación técnica.
2. **Módulo 2 · Catálogo de Equipos y Generación de Etiquetas QR (HU2):**
   * Registro y administración de activos (*Laptop*, *Desktop*, *Servidor*) con validación de número de serie único, generación automática de código QR y guardado de etiqueta física (600×360 px) en la galería del teléfono (álbum *TechCare*).
3. **Módulo 3 · Escáner de Código QR Instantáneo (HU3):**
   * Lectura mediante cámara trasera en tiempo real, análisis desde imagen de galería y consulta manual por código o serie.
4. **Módulo 4 · Checklist Interactivo de Mantenimiento — Partes 1 y 2 (HU4 / HU5):**
   * Verificaciones físicas (*limpieza*, *ventiladores*, *pasta térmica*) y lógicas (*inspección de puertos físicos*, *temperaturas pre/post con $\Delta^\circ\text{C}$*, *diagnóstico S.M.A.R.T.*), bloqueando el cierre si existen tareas obligatorias pendientes (TC06).
5. **Módulo 5 · Bitácora Fotográfica de Evidencias (HU6):**
   * Captura y compresión automática de hasta 3 fotografías por orden de servicio (`antes`, `proceso`, `despues`) vinculadas al historial del activo.
6. **Módulo 6 · Programación, Semáforo de Estado, Notificaciones y Causa Raíz (HU7 / HU8 / HU9):**
   * Cálculo automático de próxima fecha de mantenimiento (3, 6 o 12 meses), semáforo visual (*Verde*, *Amarillo*, *Rojo*), aplicación del **Patrón de Diseño Observer** al cierre de órdenes, notificaciones en pantalla de bloqueo dirigidas al último ingeniero responsable y detección automática de **Fallas Recurrentes por Subsistema** (`>= 2` intervenciones correctivas).

---

## Documentación por Sprint

* [Sprint 7 · Bitácora Fotográfica de Evidencias (HU6)](./docs/Sprint7_Documentacion.md)
* [Sprint 8 · Programación, Semáforo de Estado, Patrón Observer y Notificaciones (HU7 / HU8)](./docs/Sprint8_Documentacion.md)
* [Sprint 9 · Historial de Fallas, Causa Raíz, Perfil de Ingenieros e Integración General (HU9)](./docs/Sprint9_Documentacion.md)
* [Sprint 10 · Validación en Dispositivos, Manual de Usuario y Cierre del MVP](./docs/Sprint10_Manual_Usuario_y_Cierre.md)

---

## Requisitos e Instalación

* **Node.js** 20 LTS o superior y **npm**.
* Proyecto en **Supabase** configurado en el archivo `.env`:
  ```env
  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
  VITE_SUPABASE_ANON_KEY=tu_clave_publica_anon
  ```

### Comandos Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm install` | Instala las dependencias del proyecto. |
| `npm run dev` | Inicia el servidor de desarrollo en `http://localhost:5173`. |
| `npm run test:unit` | Ejecuta las 9 suites de pruebas unitarias y de integración con Jest (83 pruebas). |
| `npm run build` | Compila TypeScript y genera el bundle de producción en `dist/`. |
| `npx cap sync android` | Sincroniza el build web y plugins nativos con el proyecto Android. |
| `npx cap open android` | Abre el proyecto nativo en Android Studio para generar el APK. |
