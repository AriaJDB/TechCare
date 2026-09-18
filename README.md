# TechCare

![CI](https://github.com/ORG/techcare/actions/workflows/ci.yml/badge.svg)

Sistema móvil de gestión de mantenimiento preventivo y trazabilidad técnica para equipos de cómputo (laptops, desktops, servidores), dirigido a técnicos y administradores de TI. Permite registrar equipos con código QR, ejecutar checklists guiados de servicio, documentar evidencia fotográfica, calcular automáticamente el próximo mantenimiento y detectar fallas recurrentes por subsistema.

**Materia:** Desarrollo Móvil Integral — Décimo Cuatrimestre, DS03SV-25
**Universidad Tecnológica de San Juan del Río**

## Equipo

| Integrante | Rol Scrum |
|---|---|
| Ariadna Juárez Argüello | Product Owner |
| Cinthia López Álvarez | Scrum Master |
| Gabriel Flores Argüello | Developer Full Stack |
| Edgar Alegría Alcántara | Development Team |

## Stack

- **Frontend:** React + Vite + TypeScript, empaquetado a móvil con Capacitor (Android/iOS)
- **Backend / BaaS:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Monitoreo:** Firebase Crashlytics / Sentry
- **Distribución:** Firebase App Distribution (alfa/beta), Google Play Console (producción)

## Cómo construir y ejecutar

```bash
npm install
npm run dev          # servidor de desarrollo (Vite)
npm run build         # build de producción
npx cap sync           # sincroniza el build web al proyecto nativo
npx cap open android   # abre el proyecto en Android Studio
```

Variables de entorno requeridas en `.env` (ver `.env.example`):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Estructura del repositorio

```
/docs      # documentación del proyecto (planeación, plan DevOps)
/app       # código de la app móvil (React + Vite + Capacitor)
/ci        # scripts auxiliares de CI
README.md
```

## Ramas y versionamiento

- `main` — estable, protegida, solo recibe merges vía Pull Request aprobado
- `develop` — integración de funcionalidades terminadas
- `feature/*`, `bugfix/*`, `hotfix/*` — ramas de trabajo (`tipo/nombre-corto-descriptivo`)
- Commits siguiendo [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, …)
- Tags semánticos `v0.x.y` al cerrar una versión estable

Detalle completo en [`docs/Plan_DevOps_TechCare.docx`](docs/Plan_DevOps_TechCare.docx).

## Board y planeación

- Tablón de trabajo: GitHub Projects — columnas Backlog, To-Do, In-Progress, Review, Done
- Documento de planeación Scrum y Plan DevOps: carpeta `/docs`

## Comunicación

El equipo usa **Discord** como herramienta principal (ver dictamen en `docs/Plan_DevOps_TechCare.docx`, Anexo A). Canales: `#anuncios`, `#dev`, `#qa`, `#ops`, `#dudas`, `#random`.

## Demo

Enlace a la demo del mapa DevOps, el board y la herramienta de comunicación configurada: *(agregar enlace del video de 3–5 min)*
