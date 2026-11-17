# Documentación de Entrega: Sprint 9 · Historial de Fallas, Causa Raíz, Perfil de Ingenieros e Integración General

**Proyecto:** TechCare — Sistema Móvil de Gestión de Mantenimiento Preventivo y Trazabilidad Técnica  
**Sprint:** 9 (Semana 9)  
**Historias de Usuario y Alcance:**
* **HU9** — Historial de fallas y análisis de causa raíz (5 SP)
* **HU1 (Extensión)** — Gestión de perfil de usuario y plantilla de asignación de ingenieros
* **Integración General** — Integración de los 6 módulos del MVP en un flujo único estable  

**Objetivo del Sprint:** Integrar los seis módulos del MVP (Autenticación/Perfiles, Equipos/QR, Escáner, Checklist Interactivo, Bitácora Fotográfica y Programación/Semáforo/Historial), incorporar el análisis de causas raíz con detección automática de fallas recurrentes por subsistema (`>= 2` intervenciones correctivas) y habilitar el módulo de **Perfil de Ingeniero** para personalizar el nombre de usuario y asignar adecuadamente a los ingenieros responsables de cada servicio.

---

## 1. Resumen de Tareas Realizadas

| Tarea del Sprint | Responsable | Estimación | Estado | Archivos / Componentes |
| :--- | :--- | :--- | :--- | :--- |
| **1. Integrar todos los módulos en un flujo único + Causa Raíz (HU9)** | Flores Argüello Gabriel | 10h | ✅ Completado | [`src/utils/historialService.ts`](file:///c:/Users/gbflo/Downloads/techcare/src/utils/historialService.ts), [`src/components/Equipos/FichaTecnicaModal.tsx`](file:///c:/Users/gbflo/Downloads/techcare/src/components/Equipos/FichaTecnicaModal.tsx), [`src/components/Checklist/CierreOrdenModal.tsx`](file:///c:/Users/gbflo/Downloads/techcare/src/components/Checklist/CierreOrdenModal.tsx) |
| **2. Módulo de Perfil de Usuario y Plantilla de Ingenieros** | Flores Argüello Gabriel / Alegría Alcántara Edgar | — | ✅ Completado | [`src/services/perfilService.ts`](file:///c:/Users/gbflo/Downloads/techcare/src/services/perfilService.ts), [`src/components/Perfil/PerfilUsuarioModal.tsx`](file:///c:/Users/gbflo/Downloads/techcare/src/components/Perfil/PerfilUsuarioModal.tsx) |
| **3. Pruebas de integración extremo a extremo (E2E / Unitarias)** | Juárez Argüello Ariadna Sarahi | 8h | ✅ Completado | [`tests/unit/sprint9_causa_raiz_integracion_perfil.test.ts`](file:///c:/Users/gbflo/Downloads/techcare/tests/unit/sprint9_causa_raiz_integracion_perfil.test.ts) |
| **4. Corrección de errores identificados (bugfixing)** | Alegría Alcántara Edgar Maximiliano | 8h | ✅ Completado | Sincronización de sesiones, estado reactivo entre modales y persistencia híbrida Supabase + LocalStorage |
| **5. Revisión de UI/UX y ajustes visuales Claymorphism** | López Álvarez Cinthia Jimena | 6h | ✅ Completado | [`src/index.css`](file:///c:/Users/gbflo/Downloads/techcare/src/index.css), [`src/App.tsx`](file:///c:/Users/gbflo/Downloads/techcare/src/App.tsx), [`src/components/Equipos/EquiposCatalog.tsx`](file:///c:/Users/gbflo/Downloads/techcare/src/components/Equipos/EquiposCatalog.tsx) |
| **6. Migración SQL de Causa Raíz, Índices y Función RPC de Fallas Recurrentes** | Flores Argüello Gabriel | — | ✅ Completado | [`supabase/migrations/20261117_01_sprint9_causa_raiz_perfiles.sql`](file:///c:/Users/gbflo/Downloads/techcare/supabase/migrations/20261117_01_sprint9_causa_raiz_perfiles.sql) |

---

## 2. Funcionalidades Implementadas en el Sprint 9

### 2.1 Historial Cronológico Inverso y Análisis de Causa Raíz (HU9)
* **Consulta cronológica inversa:** En la pestaña *Historial de Mantenimientos* de cada activo se despliegan todas las intervenciones de la más reciente a la más antigua, mostrando fecha, subsistema atendido (*Refrigeración / Térmico*, *Almacenamiento (SSD / Disco)*, *Fuente de poder y Batería*, *Placa Base y Conectores*, *Pantalla y Video*, *Sistema Operativo y Firmware*), tipo de intervención (*Preventivo* / *Correctivo*), diagnóstico técnico, **causa raíz subyacente**, evidencias fotográficas (hasta 3 fotos) e **ingeniero responsable**.
* **Detección automática de fallas recurrentes (`analizarFallasRecurrentes`):**
  * Evalúa automáticamente si un equipo acumula **2 o más intervenciones correctivas previas en el mismo subsistema** (`GROUP BY subsistema_atendido HAVING COUNT(*) >= 2`).
  * Cuando se cumple la condición, despliega la alerta destacada **"⚠️ Falla Recurrente Detectada"**, indicando el subsistema crítico, el listado de causas raíz previas y una recomendación técnica específica antes de cerrar una nueva orden.
* **Métricas de Fiabilidad del Equipo (`calcularMetricasFiabilidad`):**
  * Calcula el porcentaje de fiabilidad operativa del equipo (`0% - 100%`) considerando la proporción de mantenimientos preventivos frente a fallas correctivas y reincidencias por subsistema.

### 2.2 Módulo de Perfil de Usuario y Asignación de Ingenieros
Para garantizar la trazabilidad real del personal técnico que interviene cada activo, se implementó el módulo de **Perfil de Usuario e Ingenieros** ([`PerfilUsuarioModal.tsx`](file:///c:/Users/gbflo/Downloads/techcare/src/components/Perfil/PerfilUsuarioModal.tsx) y [`perfilService.ts`](file:///c:/Users/gbflo/Downloads/techcare/src/services/perfilService.ts)):
* **Edición de Nombre de Usuario / Firma Técnica:** Permite al usuario autenticado configurar y actualizar en cualquier momento su nombre visible de ingeniero (ej. `Ing. Gabriel Flores`, `Ing. Cinthia López`), nombre, apellidos, rol (`tecnico` o `administrador`) y especialidad técnica.
* **Sincronización con Supabase y Plantilla de Asignación:** Los cambios se guardan en los metadatos de `Supabase Auth` (`auth.updateUser`), en la tabla `usuario` y en el directorio local de ingenieros.
* **Asignación Directa en Órdenes y Mantenimientos:** Tanto al cerrar una orden del checklist como al registrar un mantenimiento en la ficha técnica, el selector de **Ingeniero Responsable** toma por defecto el perfil activo del usuario y permite seleccionar o asignar a cualquier ingeniero registrado en la plantilla, quedando vinculado también como destinatario de futuras notificaciones de vencimiento.

---

## 3. Integración de los 6 Módulos del MVP

| Módulo | Historias | Estado de Integración |
| :--- | :--- | :--- |
| **Módulo 1 · Autenticación y Perfiles** | HU1 | ✅ Integrado con Supabase Auth, biometría dactilar y gestión de perfil de ingeniero |
| **Módulo 2 · Catálogo de Equipos y QR** | HU2 | ✅ Alta, edición, baja, generación de QR único y guardado de etiqueta física en galería |
| **Módulo 3 · Escáner de Código QR** | HU3 | ✅ Lectura por cámara trasera, carga desde galería y búsqueda manual instantánea |
| **Módulo 4 · Checklist Interactivo (Partes 1 y 2)** | HU4 / HU5 | ✅ 6 verificaciones obligatorias con modales de Puertos, Temperatura (Δ°C) y S.M.A.R.T. |
| **Módulo 5 · Bitácora Fotográfica** | HU6 | ✅ Captura/compresión de hasta 3 fotos (`antes`, `proceso`, `despues`) visibles en historial |
| **Módulo 6 · Programación, Semáforo y Causa Raíz** | HU7 / HU8 / HU9 | ✅ Cálculo a 3/6/12 meses, semáforo visual, patrón Observer, notificaciones y alertas de falla recurrente |

---

## 4. Resultados de Pruebas Automatizadas

* **Suites ejecutadas:** 9 suites de pruebas unitarias y de integración (`npm run test:unit`).
* **Total de pruebas:** **83 pruebas aprobadas (100% pass rate)**.
* **Build de producción:** Compilación limpia mediante TypeScript y Vite (`npm run build`).

