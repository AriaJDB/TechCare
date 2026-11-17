# Documentación de Entrega: Sprint 7 · Bitácora Fotográfica de Evidencias

**Proyecto:** TechCare — Sistema Móvil de Gestión de Mantenimiento Preventivo y Trazabilidad Técnica  
**Sprint:** 7 (Semana 7)  
**Historia de Usuario:** HU6 — Bitácora fotográfica de evidencias  
**Objetivo del Sprint:** Permitir a los técnicos capturar, comprimir y almacenar hasta 3 fotografías técnicas (antes, proceso y después) asociadas a cada orden de servicio y reflejarlas en la ficha técnica e historial de mantenimiento del equipo.

---

## 1. Resumen de Tareas Realizadas

| Tarea del Sprint | Responsable | Estado | Archivos / Componentes |
| :--- | :--- | :--- | :--- |
| **1. Servicio de almacenamiento y compresión** | Flores Argüello Gabriel | ✅ Completado | [`src/services/evidenciasService.ts`](file:///c:/Users/gbflo/Downloads/techcare/src/services/evidenciasService.ts), validación MIME/tamaño (20 MB), compresión en canvas (>512 KB) y signed URLs |
| **2. Componente UI de evidencias y cámara nativa** | Flores Argüello Gabriel | ✅ Completado | [`src/components/Checklist/EvidenciaFotografica.tsx`](file:///c:/Users/gbflo/Downloads/techcare/src/components/Checklist/EvidenciaFotografica.tsx), integración `@capacitor/camera`, selector de archivos y lightbox |
| **3. Pestaña de fotos en Checklist y modo offline** | Flores Argüello Gabriel | ✅ Completado | [`src/components/Checklist/ChecklistScreen.tsx`](file:///c:/Users/gbflo/Downloads/techcare/src/components/Checklist/ChecklistScreen.tsx), pestaña dedicada `Fotos (X/3)` y banner informativo offline |
| **4. Integración con Historial y Ficha Técnica** | Flores Argüello Gabriel | ✅ Completado | [`src/utils/historialService.ts`](file:///c:/Users/gbflo/Downloads/techcare/src/utils/historialService.ts), [`src/components/Equipos/FichaTecnicaModal.tsx`](file:///c:/Users/gbflo/Downloads/techcare/src/components/Equipos/FichaTecnicaModal.tsx) |
| **5. Migración SQL y bucket de Supabase** | Flores Argüello Gabriel | ✅ Completado | [`supabase/migrations/20261103_01_evidencia_fotografica.sql`](file:///c:/Users/gbflo/Downloads/techcare/supabase/migrations/20261103_01_evidencia_fotografica.sql), tabla `evidencia_fotografica` y bucket `evidencias-servicio` |
| **6. Pruebas unitarias AAA (100% aprobadas)** | Flores Argüello Gabriel | ✅ Completado | [`tests/unit/sprint7_evidencias_fotograficas.test.ts`](file:///c:/Users/gbflo/Downloads/techcare/tests/unit/sprint7_evidencias_fotograficas.test.ts) |

---

## 2. Catálogo Oficial de Evidencias (Hasta 3 Fotos)

1. **`antes`**: Estado inicial del equipo (acumulación de polvo, pasta térmica degradada, estado físico previo).
2. **`proceso`**: Intervención técnica (limpieza de placa y ductos, desmontaje y reemplazo térmico).
3. **`despues`**: Equipo ensamblado, sellado, limpio y operativo tras las pruebas.

---

## 3. Reglas Técnicas y Escenarios Cumplidos

* **Restricción de formatos:** Solo imágenes JPG, PNG o WEBP. Archivos que no cumplan la extensión o formato MIME son rechazados con mensaje claro.
* **Límite de tamaño:** Rechazo de archivos mayores a 20 MB o vacíos (0 bytes).
* **Compresión inteligente:** Archivos mayores a 512 KB se optimizan mediante el Canvas API a resolución máxima de 1280px y calidad JPEG 0.72.
* **Límite por orden:** Máximo 3 fotografías por orden de servicio (1 por etapa). Se permite el reemplazo o eliminación de fotos existentes.
* **Resiliencia offline:** Almacenamiento local preventivo en `localStorage` con claves `techcare_evidencias_orden_` y sincronización con Supabase.

---

## 4. Resultados de Pruebas Automatizadas

* **Suites ejecutadas:** 7 suites (incluye todas las pruebas previas de Sprint 4 y Sprint 6).
* **Pruebas unitarias totales:** 76 pruebas aprobadas (0 fallidas).
* **Build de producción:** `npm run build` ejecutado exitosamente sin advertencias.
