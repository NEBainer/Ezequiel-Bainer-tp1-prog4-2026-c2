# Fotograma — TP1 Programación IV (2026 C2)

Sistema web para un cine: venta de entradas con selección de butacas en tiempo real, candy bar, administración, validación de entradas por QR y programa de fidelización.

- **Alumno:** Nicolas Ezequiel Bainer
- **Demo (deploy):** https://ezequiel-bainer-tp1-prog4-2026-c2.vercel.app/
- **Repositorio:** https://github.com/NEBainer/Ezequiel-Bainer-tp1-prog4-2026-c2

## Usuarios de prueba
| Rol | Email | Contraseña |
|---|---|---|
| Admin | | |
| Empleado | | |
| Cliente | | |

## Stack
- Angular 22 (standalone, signals, lazy loading, guards, interceptors, pipes, directivas)
- Supabase (Auth, Postgres con RLS, Realtime, Storage, Edge Functions)
- PWA con `@angular/service-worker` y notificaciones push
- Deploy en Vercel

## Requerimientos
Ver [`docs/requerimientos.md`](docs/requerimientos.md).

## Arquitectura
_(completar: estructura de carpetas, servicios, rutas y guards, flujo de compra, cómo se usa Realtime, modelo de roles)_

### Modelo de datos
_(completar: tablas, relaciones y políticas RLS principales)_

### Estructura del proyecto
```
src/app/
  auth/
  pages/
  components/
  services/
  guards/
  interceptors/
  directives/
  pipes/
  interfaces/
src/environments/
```

## Decisiones técnicas
Ver [`docs/decisiones.md`](docs/decisiones.md). _(resumir acá las más importantes)_

## PWA y notificaciones
_(completar: qué se cachea, íconos propios, cómo se suscribe el usuario y qué dispara el envío)_

## Cómo correrlo en local
```bash
npm install
ng serve -o
```
Para probar PWA / push (no funcionan en `ng serve`):
```bash
ng build
# servir la carpeta dist/<proyecto>/browser con un servidor estático
```
Variables en `src/environments/environment.ts` y `environment.development.ts` (solo claves públicas). Las claves privadas viven como secrets en Supabase.

## Librerías no vistas en clase
_(completar con cada librería, por qué se eligió y qué alternativas se descartaron)_
