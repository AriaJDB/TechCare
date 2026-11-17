# Documentación de Entrega: Sprint 8 · Programación de Próximo Servicio, Semáforo de Estado y Notificaciones

**Proyecto:** TechCare — Sistema Móvil de Gestión de Mantenimiento Preventivo y Trazabilidad Técnica  
**Sprint:** 8 (Semana 8)  
**Historias de Usuario:**
* **HU7** — Cálculo automático del próximo mantenimiento (5 SP)
* **HU8** — Semáforo de estado y notificaciones de vencimiento (8 SP)  

**Objetivo del Sprint:** Anticipar el próximo mantenimiento de cada equipo mediante el cálculo automático configurable a 3, 6 o 12 meses, visualizar su estado mediante un semáforo (verde, amarillo y rojo) en el panel principal y en la ficha técnica, implementar el patrón de diseño **Observer** al cierre de la orden de servicio y enviar notificaciones al teléfono (visibles en pantalla de bloqueo) dirigidas al ingeniero responsable cuando un mantenimiento se encuentre vencido.

---

## 1. Resumen de Tareas Realizadas

| Tarea del Sprint | Responsable | Estimación | Estado | Archivos / Componentes |
| :--- | :--- | :--- | :--- | :--- |
| **1. Calcular automáticamente la próxima fecha de mantenimiento** | Flores Argüello Gabriel | 8h | ✅ Completado | [`src/utils/mantenimiento.ts`](file:///c:/Users/gbflo/Downloads/techcare/src/utils/mantenimiento.ts), [`src/utils/historialService.ts`](file:///c:/Users/gbflo/Downloads/techcare/src/utils/historialService.ts) |
| **2. Implementar Patrón Observer al cierre de orden** | Flores Argüello Gabriel | — | ✅ Completado | [`src/services/ordenServicioObserver.ts`](file:///c:/Users/gbflo/Downloads/techcare/src/services/ordenServicioObserver.ts), [`src/services/checklistService.ts`](file:///c:/Users/gbflo/Downloads/techcare/src/services/checklistService.ts) |
| **3. Implementar notificaciones push / locales en pantalla de bloqueo** | Flores Argüello Gabriel | 6h | ✅ Completado | [`src/services/notificationService.ts`](file:///c:/Users/gbflo/Downloads/techcare/src/services/notificationService.ts), [`public/sw.js`](file:///c:/Users/gbflo/Downloads/techcare/public/sw.js), [`android/app/src/main/java/com/example/app/MainActivity.java`](file:///c:/Users/gbflo/Downloads/techcare/android/app/src/main/java/com/example/app/MainActivity.java) |
| **4. Diseñar panel principal con semáforo verde / amarillo / rojo** | Alegría Alcántara Edgar Maximiliano | 8h | ✅ Completado | [`src/components/Equipos/EquiposCatalog.tsx`](file:///c:/Users/gbflo/Downloads/techcare/src/components/Equipos/EquiposCatalog.tsx), [`src/components/Equipos/FichaTecnicaModal.tsx`](file:///c:/Users/gbflo/Downloads/techcare/src/components/Equipos/FichaTecnicaModal.tsx) |
| **5. Migración SQL de programación, índices y notificaciones** | Flores Argüello Gabriel | — | ✅ Completado | [`supabase/migrations/20261110_01_sprint8_semaforo_notificaciones.sql`](file:///c:/Users/gbflo/Downloads/techcare/supabase/migrations/20261110_01_sprint8_semaforo_notificaciones.sql) |
| **6. Pruebas de vencimientos y notificaciones (TC08 / TC09)** | Juárez Argüello Ariadna Sarahi | 5h | ✅ Completado | [`tests/unit/mantenimiento.test.ts`](file:///c:/Users/gbflo/Downloads/techcare/tests/unit/mantenimiento.test.ts), [`tests/unit/sprint8_semaforo_observer_notificaciones.test.ts`](file:///c:/Users/gbflo/Downloads/techcare/tests/unit/sprint8_semaforo_observer_notificaciones.test.ts) |

---

## 2. Reglas de Negocio Implementadas (HU7 y HU8)

### 2.1 Cálculo Automático de Próxima Fecha (`calcularProximaFecha`)
Al cerrar una orden de servicio o registrar una intervención técnica, el sistema suma exactamente el ciclo configurado (**3, 6 o 12 meses**) a la fecha de cierre en UTC, respetando los límites de días de cada mes (incluyendo años bisiestos y meses de 28, 30 o 31 días) sin desbordar al mes siguiente.

### 2.2 Lógica del Semáforo de Estado (`calcularSemaforo`)
El estado de cada equipo se determina comparando la fecha actual (`hoy`) con la `proxima_fecha_mtto`:
* **🟢 Verde (`Al día`):** Faltan **más de 15 días** (`diasRestantes > 15`) para la fecha programada de mantenimiento.
* **🟡 Amarillo (`Por vencer` — TC08):** Faltan **15 días o menos** (`0 <= diasRestantes <= 15`) para el próximo mantenimiento.
* **🔴 Rojo (`Vencido` — TC09):** La fecha programada de mantenimiento **ya pasó** (`diasRestantes < 0`) sin haberse registrado el servicio correspondiente.

### 2.3 Sistema de Notificaciones en Pantalla de Bloqueo al Ingeniero Responsable
Cuando un equipo entra en estado **Rojo** (mantenimiento vencido), el sistema identifica automáticamente al **último ingeniero que realizó el servicio del equipo** y dispara una notificación crítica mediante tres canales coordinados:
1. **Canal Nativo Android (`TechCareNativeBridge.sendMaintenanceNotification`):** Utiliza `NotificationChannel` con `IMPORTANCE_HIGH`, `CATEGORY_ALARM`, vibración activa y `VISIBILITY_PUBLIC` para mostrarse directamente en la pantalla de bloqueo del dispositivo móvil.
2. **Service Worker y Web Notifications API (`public/sw.js`):** Registra y emite notificaciones del sistema operativo (`registration.showNotification`) con `requireInteraction: true` y patrón de vibración háptica `[250, 120, 250, 120, 400]`.
3. **Bitácora de Notificaciones (`notificacion_vencimiento`):** Persiste el registro de la alerta enviada indicando el equipo (`numero_serie`), la fecha vencida y el ingeniero destinatario.

---

## 3. Aplicación del Patrón de Diseño Observer

Conforme a la **Parte 4 de la Arquitectura de la Aplicación**, se implementó la clase [`OrdenServicioEventEmitter`](file:///c:/Users/gbflo/Downloads/techcare/src/services/ordenServicioObserver.ts) que actúa como *Subject/Publisher* cuando se ejecuta `cerrarOrdenServicio()`. Tres observadores independientes reaccionan al evento `ordenCerrada`:
1. **`ProgramacionSemaforoObserver`:** Calcula `proxima_fecha_mtto` según el ciclo (3, 6 o 12 meses) y actualiza el semáforo a `verde`.
2. **`HistorialCausaRaizObserver`:** Registra la intervención y la causa raíz en la bitácora histórica y evalúa si existen 2 o más fallas correctivas en el mismo subsistema.
3. **`NotificacionesVencimientoObserver`:** Verifica el estado de vencimiento y dispara la notificación al ingeniero asignado en caso de estado crítico.

---

## 4. Casos de Prueba Validados

* **TC08 (HU7/HU8):** Equipo a 10 días de su próximo mantenimiento se clasifica y muestra en color **amarillo** en el panel principal.
* **TC09 (HU7/HU8):** Equipo con mantenimiento vencido se clasifica en color **rojo** y dispara notificación dirigida al último ingeniero responsable.

