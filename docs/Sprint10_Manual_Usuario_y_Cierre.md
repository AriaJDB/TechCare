# Documentación de Entrega Final: Sprint 10 · Validación en Dispositivos, Manual de Usuario y Cierre del MVP

**Proyecto:** TechCare — Sistema Móvil de Gestión de Mantenimiento Preventivo y Trazabilidad Técnica  
**Sprint:** 10 (Semana 10 — Cierre del Proyecto)  
**Equipo de Desarrollo:**
* **Juárez Argüello Ariadna Sarahi** — Product Owner
* **López Álvarez Cinthia Jimena** — Scrum Master
* **Flores Argüello Gabriel** — Developer Full Stack
* **Alegría Alcántara Edgar Maximiliano** — Development Team

---

## 1. Resumen de Actividades de Cierre

| Tarea del Sprint | Responsable | Estimación | Estado | Entregable |
| :--- | :--- | :--- | :--- | :--- |
| **1. Pruebas en dispositivos físicos de gama alta y baja** | Todo el equipo | 8h | ✅ Completado | Validación de cámara, escáner QR, guardado en galería y notificaciones en pantalla de bloqueo |
| **2. Corrección de incidencias finales** | Gabriel / Edgar | 8h | ✅ Completado | Optimización de puente nativo `TechCareNativeBridge` y sincronización offline/online |
| **3. Elaboración de manual de usuario y documentación técnica** | Cinthia / Ariadna | 8h | ✅ Completado | Presente documento + [`Sprint7_Documentacion.md`](file:///c:/Users/gbflo/Downloads/techcare/docs/Sprint7_Documentacion.md), [`Sprint8_Documentacion.md`](file:///c:/Users/gbflo/Downloads/techcare/docs/Sprint8_Documentacion.md) y [`Sprint9_Documentacion.md`](file:///c:/Users/gbflo/Downloads/techcare/docs/Sprint9_Documentacion.md) |
| **4. Preparación de la presentación y Sprint Review final** | Todo el equipo | 6h | ✅ Completado | MVP validado con los 10 casos de prueba representativos (`TC01` a `TC10`) |

---

## 2. Manual de Usuario de TechCare

### Paso 1: Inicio de Sesión, Registro y Huella Dactilar (HU1)
1. Al abrir **TechCare**, ingresa tu correo electrónico y contraseña o crea una cuenta indicando tu Nombre y Apellidos.
2. Si activas la casilla **"Vincular huella dactilar automáticamente"**, en tus siguientes ingresos podrás autenticarte con un solo toque mediante el botón **"Iniciar con huella dactilar"**.

### Paso 2: Configuración de Perfil y Asignación de Ingenieros
1. En la esquina superior derecha del **Panel TechCare**, presiona el botón **"Perfil"**.
2. Configura tu **Nombre de Usuario / Firma de Ingeniero** (ej. `Ing. Gabriel Flores`), tu **Rol** (*Técnico* o *Administrador*) y tu **Especialidad Técnica**.
3. También puedes seleccionar un ingeniero de la **Plantilla de Ingenieros** o agregar un nuevo integrante para asignarle órdenes de mantenimiento.

### Paso 3: Alta de Equipos y Descarga de Etiqueta QR en Galería (HU2)
1. Selecciona la pestaña **"Nuevo Equipo"**.
2. Captura el tipo de dispositivo (*Laptop*, *Desktop* o *Servidor*), número de serie único, procesador, memoria RAM y almacenamiento.
3. Al guardar, el sistema genera el código QR único del equipo. Presiona **"Descargar Etiqueta"** para almacenar la etiqueta física (600×360 px) directamente en el álbum **TechCare** de la galería de tu teléfono.

### Paso 4: Escaneo de Código QR (HU3)
1. Accede a la pestaña **"Escanear QR"** o al botón **"Abrir Escáner QR"**.
2. Apunta la cámara al código QR adherido al equipo (o sube una fotografía de la etiqueta desde tu galería). El sistema abrirá de inmediato su **Ficha Técnica e Historial**.

### Paso 5: Checklist Interactivo y Bitácora Fotográfica (HU4, HU5 y HU6)
1. Dentro de la ficha del equipo, selecciona la pestaña inferior **"Servicio Técnico y Verificaciones"** y presiona **"Iniciar servicio / Abrir Checklist"**.
2. Completa las **6 verificaciones obligatorias**:
   * **Parte 1 (Física):** Limpieza general, Ventiladores y flujo de aire, Pasta / compuesto térmico.
   * **Parte 2 (Lógica):** Inspección de puertos físicos, Medición de temperatura pre/post servicio (con cálculo automático de $\Delta^\circ\text{C}$) y Diagnóstico S.M.A.R.T.
3. En la sección de **Evidencia Fotográfica (Fotos 0/3)**, captura o adjunta las fotografías de las etapas **`antes`**, **`proceso`** y **`despues`**.
4. Una vez completadas todas las verificaciones al 100%, presiona **"Concluir y Cerrar Orden"**, elige el ciclo de próximo mantenimiento (**3, 6 o 12 meses**), selecciona al **Ingeniero Responsable** y documenta la **Causa Raíz**.

### Paso 6: Semáforo de Estado, Notificaciones y Análisis de Causa Raíz (HU7, HU8 y HU9)
* En el **Panel Principal**, filtra y supervisa el inventario mediante los indicadores del semáforo (**Al día**, **Por vencer** y **Vencidos**).
* Cuando un equipo tiene su mantenimiento vencido (**Rojo**), TechCare dispara una **notificación al teléfono (visible en la pantalla de bloqueo)** dirigida al último ingeniero que realizó el servicio del equipo.
* Si un equipo acumula **2 o más intervenciones correctivas en el mismo subsistema**, la ficha técnica muestra automáticamente la alerta **"⚠️ Falla Recurrente Detectada"** con las causas raíz previas y sugerencias de inspección.

---

## 3. Matriz de Cumplimiento de Casos de Prueba (TC01 – TC10)

| ID | Historia | Caso de Prueba | Resultado Obtenido |
| :--- | :--- | :--- | :--- |
| **TC01** | HU1 | Login con credenciales correctas | ✅ Acceso concedido al panel principal con perfil de ingeniero activo |
| **TC02** | HU1 | Login con contraseña incorrecta | ✅ Muestra alerta de credenciales inválidas y bloquea acceso |
| **TC03** | HU2 | Registrar equipo con número de serie duplicado | ✅ Rechaza el registro y notifica duplicidad |
| **TC04** | HU3 | Escanear un código QR válido | ✅ Abre de inmediato la ficha técnica e historial del equipo |
| **TC05** | HU3 | Escanear un código QR no registrado | ✅ Informa que el equipo no fue encontrado con opción de reintentar |
| **TC06** | HU4 / HU5 | Intentar cerrar una orden con checklist incompleto | ✅ Bloquea el cierre y enlista las verificaciones obligatorias pendientes |
| **TC07** | HU6 | Adjuntar 3 fotografías a una orden de servicio | ✅ Comprime y asocia las fotos (`antes`, `proceso`, `despues`) visibles en el historial |
| **TC08** | HU7 / HU8 | Equipo a 10 días de su próximo mantenimiento | ✅ El equipo se marca en color **Amarillo** (`POR VENCER`) |
| **TC09** | HU7 / HU8 | Equipo con mantenimiento vencido | ✅ El equipo se marca en color **Rojo** (`VENCIDO`) y dispara notificación al teléfono del último ingeniero |
| **TC10** | General | Uso de la app con interrupción de red | ✅ Informa el estado y conserva los datos capturados sin pérdida de información |
