# Diccionario de Datos · TechCare

TechCare es una aplicación móvil de mantenimiento preventivo y trazabilidad de equipos de cómputo construida con **React + Vite + TypeScript + Capacitor** y backend **Supabase (PostgreSQL + PostgREST + Auth + Storage)**.

---

## 1. Esquema de Base de Datos (PostgreSQL)

### 1.1 Tabla `equipo`
Almacena el inventario de equipos de cómputo registrados para su control técnico y trazabilidad mediante código QR.

| Columna | Tipo de Dato | Nulo | Por Defecto | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id_equipo` / `id` | `uuid` | NO | `gen_random_uuid()` | Identificador único de la máquina (clave primaria). |
| `id_usuario_registro` | `uuid` | SÍ | `auth.uid()` | Referencia al usuario (`auth.users`) que dio de alta el equipo. |
| `numero_serie` | `varchar(100)` | NO | - | Número de serie del fabricante (único, índice único). |
| `tipo_dispositivo` | `varchar(50)` | NO | `'laptop'` | Tipo de equipo (`'laptop'`, `'desktop'`, `'servidor'`). |
| `procesador` | `varchar(150)` | SÍ | - | Modelo de CPU (ej. "Intel Core i5-1135G7"). |
| `ram` | `varchar(50)` | SÍ | - | Capacidad de memoria RAM (ej. "16GB DDR4"). |
| `almacenamiento` | `varchar(100)` | SÍ | - | Capacidad y tipo de disco (ej. "512GB NVMe SSD"). |
| `codigo_qr` | `varchar(150)` | NO | - | Cadena identificadora codificada en el QR impreso en carcasa. |
| `created_at` | `timestamptz` | NO | `now()` | Fecha y hora de registro. |

---

### 1.2 Tabla `orden_servicio`
Registra las intervenciones y órdenes de mantenimiento técnico ejecutadas sobre cada equipo.

| Columna | Tipo de Dato | Nulo | Por Defecto | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id_orden` | `uuid` | NO | `gen_random_uuid()` | Identificador único de la orden de servicio (clave primaria). |
| `id_equipo` | `uuid` | NO | - | Clave foránea que referencia a `equipo(id_equipo)`. |
| `id_tecnico` | `uuid` | NO | `auth.uid()` | Técnico asignado responsable de la intervención. |
| `fecha_inicio` | `timestamptz` | NO | `now()` | Fecha y hora en que se inicia la orden de servicio. |
| `fecha_cierre` | `timestamptz` | SÍ | `NULL` | Fecha y hora en que se concluye y cierra la orden. |
| `ciclo_meses` | `smallint` | NO | `6` | Periodicidad del mantenimiento (3, 6 o 12 meses). |
| `proxima_fecha_mtto`| `date` | SÍ | `NULL` | Fecha proyectada para el siguiente servicio preventivo. |
| `estado_semaforo` | `varchar(20)` | SÍ | `'verde'` | Estado del semáforo preventivo (`'verde'`, `'amarillo'`, `'rojo'`). |
| `tipo_intervencion` | `varchar(30)` | NO | `'preventiva'` | Tipo de servicio (`'preventiva'`, `'correctiva'`). |
| `subsistema_atendido`| `varchar(100)` | SÍ | - | Área atendida (ej. "Refrigeración / Térmico", "Almacenamiento"). |
| `diagnostico` | `text` | SÍ | - | Observaciones y diagnóstico técnico inicial. |
| `causa_raiz` | `text` | SÍ | - | Causa raíz identificada de fallas o degradación térmica. |
| `cerrada` | `boolean` | NO | `false` | Indica si la orden fue finalizada (`true`) o continúa abierta (`false`). |

---

### 1.3 Tabla `checklist_item`
Almacena las verificaciones técnicas paso a paso asociadas a cada orden de servicio.

| Columna | Tipo de Dato | Nulo | Por Defecto | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id_item` | `uuid` | NO | `gen_random_uuid()` | Identificador único del ítem de verificación. |
| `id_orden` | `uuid` | NO | - | Clave foránea que referencia a `orden_servicio(id_orden)`. |
| `tarea` | `enum` / `text` | NO | - | Código identificador de la tarea técnica (ver Catálogo). |
| `obligatorio` | `boolean` | NO | `true` | Determina si el ítem es prerrequisito para permitir el cierre. |
| `completado` | `boolean` | NO | `false` | Estado de cumplimiento de la verificación por el técnico. |
| `fecha_marcado` | `timestamptz` | SÍ | `NULL` | Timestamp fijado automáticamente por trigger al completarse. |

---

## 2. Catálogo Oficial de Tareas de Servicio (Checklist)

A partir del **Sprint 5 (HU4)**, el catálogo total consta de **6 tareas técnicas** divididas en dos partes:

### Parte 1 (Sprint 5 - Inspección Física y Térmica Inicial)
1. **`limpieza`**: Limpieza general y remoción profunda de polvo y residuos en placa base, disipador y chasis.
2. **`ventiladores`** *(NUEVA)*: Inspección visual, verificación de giro libre, lubricación de rodamientos y prueba de flujo de aire en disipadores/fan coolers.
3. **`pasta_termica`**: Limpieza de compuesto térmico degradado y aplicación de pasta térmica de alta conductividad en CPU/GPU.

### Parte 2 (Sprint 6 - Pruebas Funcionales y Diagnóstico Lógico)
4. **`puertos`**: Verificación de integridad física y transmisión en puertos USB, HDMI, Jack de audio y RJ45.
5. **`temperatura`**: Monitoreo de temperaturas en reposo (idle) y bajo estrés de disipación térmica.
6. **`smart`**: Lectura y verificación de parámetros de salud S.M.A.R.T. del disco de estado sólido o HDD.

---

## 3. Reglas de Negocio y Seguridad (RLS)

1. **Inmutabilidad de Órdenes Cerradas**:
   - Una vez que `orden_servicio.cerrada = true`, no se permite agregar, editar ni eliminar ningún `checklist_item` asociado.
2. **Restricción de Cierre Seguro (CP-05)**:
   - No se permite cerrar una orden (`cerrada = true`) si existen tareas con `obligatorio = true` y `completado = false`. La base de datos emite error `P0001`.
3. **Auditoría de Marcado**:
   - Al pasar `completado = true`, el trigger asigna `fecha_marcado = now()`.
   - Al desmarcar `completado = false`, el trigger restablece `fecha_marcado = NULL`.
4. **Row Level Security (RLS)**:
   - Técnicos (`rol = 'tecnico'`): solo leen y actualizan los ítems de órdenes creadas bajo su propio `auth.uid()`.
   - Administradores (`rol = 'administrador'`): lectura y gestión global.
