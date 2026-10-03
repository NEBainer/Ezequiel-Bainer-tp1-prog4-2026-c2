# Fotograma — TP1 Programación IV (2026 C2)

Sistema web para un cine: venta de entradas con selección de butacas en tiempo real, candy bar, administración, validación de entradas por QR y programa de fidelización.

- **Alumno:** Nicolas Ezequiel Bainer
- **Demo (deploy):** https://ezequiel-bainer-tp1-prog4-2026-c2.vercel.app/
- **Repositorio:** https://github.com/NEBainer/Ezequiel-Bainer-tp1-prog4-2026-c2

## Usuarios de prueba
| Rol | Email | Contraseña |
|---|---|---|
| Admin | admin@fotograma.com.ar | Fotograma2026 |
| Empleado | empleado@fotograma.com.ar | Fotograma2026 |
| Cliente (58 años) | cliente@fotograma.com.ar | Fotograma2026 |

También se puede comprar sin cuenta (compra anónima).

## Funcionalidades
- **Cartelera:** las 3 películas más vendidas primero, buscador por nombre y filtro por uno o más géneros, puntuación promedio. Sección "Próximamente" con alerta por notificación push.
- **Película:** ficha con géneros, duración, edad mínima, reseñas (estrellas + comentario) y funciones por día.
- **Compra:** elección registrado / anónimo → mapa de butacas en tiempo real (común, accesible, VIP) → candy y combos destacados, canje de puntos → pago simulado con crédito de cuenta → entrada con QR y PDF.
- **Perfil:** puntos, crédito, historial de canjes, entradas próximas con cancelación (hasta 2 h antes, devuelve crédito) y compras anteriores. **Mis películas:** historial visual con la calificación propia.
- **Empleados:** validación de entradas y candy por cámara o código manual; cada parte del QR se usa una sola vez.
- **Admin:** películas (póster en Storage, géneros, edad, preventa, visibilidad, aviso push), funciones con asignación automática de sala, salas, candy, combos, precios y cupones, reportes de facturación (PDF y Excel) con gráficos, y registro de actividad.

## Stack
- Angular 22 (componentes standalone, signals, `computed`, lazy loading, guards funcionales, formularios reactivos, pipes y directivas propias)
- Supabase: Auth, Postgres con RLS, Realtime, Storage y Edge Functions
- PWA con `@angular/service-worker` y notificaciones push (`SwPush` + `web-push`)
- Deploy en Vercel

## Requerimientos y decisiones
- [`docs/requerimientos.md`](docs/requerimientos.md): requerimientos R-01 a R-42 y criterios adoptados.
- [`docs/decisiones.md`](docs/decisiones.md): decisiones técnicas D-01 a D-14 con alternativas y ubicación en el código.

## Arquitectura

### Estructura del proyecto
```
src/app/
  admin/            Panel de administración (rutas hijas con layout propio, carga diferida)
    layout/         Menú lateral + router-outlet
    peliculas/  funciones/  salas/  candy/  precios/  reportes/  log/
  auth/             Login y registro (auth.routes.ts)
  pages/            home, pelicula, compra, perfil, mis-peliculas, validar
  components/       Reutilizables: mapa-butacas, poster, estrellas, selector-fecha,
                    tarjeta-pelicula, entrada-ticket
  services/         Un servicio por área + lógica de negocio pura
  guards/           logueado, no-logueado, rolGuard('admin' | 'empleado')
  pipes/            duracion, textoLargo
  directives/       imagenRespaldo
  interfaces/       Entidad / EntidadPorCrear / EntidadPorModificar
src/environments/   URL y clave pública de Supabase, clave pública VAPID
supabase/           Scripts SQL (modelo, RLS, datos iniciales) y Edge Function
```

### Servicios
| Servicio | Responsabilidad |
|---|---|
| `SupabaseService` | Único cliente de Supabase (singleton) con getters `Sup`, `Auth`, `Stg` |
| `Auth` | Sesión (`onAuthStateChange` → signal `usuarioActual`), perfil, rol y edad |
| `PeliculasService` | Películas y géneros; reglas de estreno y preventa |
| `FuncionesService` | Funciones, salas y **asignación automática de sala** |
| `ComprasService` | Compra, butacas ocupadas, cancelación, saldos, **validación de QR** y datos de reportes |
| `CalculadoraPrecio` | **Precio final** (preventa, VIP, combos, canjes, cupón, crédito, puntos) |
| `CandyService`, `ConfigService`, `ResenasService`, `StorageService` | ABM de cada área |
| `ComprobanteService` | QR, PDF de la entrada, PDF y CSV de reportes |
| `NotificacionesService` | Suscripción push, alertas y llamada a la Edge Function |
| `LogService` | Registro de actividad |

### Rutas
Todas las páginas se cargan de forma diferida (`loadComponent` / `loadChildren`).

| Ruta | Acceso |
|---|---|
| `/`, `/pelicula/:id`, `/comprar/:funcionId` | Público (la compra permite anónimos) |
| `/auth/login`, `/auth/registro` | Sin sesión (`noLogueadoGuard`) |
| `/perfil`, `/mis-peliculas` | Con sesión (`logueadoGuard`) |
| `/validar` | `rolGuard('empleado', 'admin')` |
| `/admin/**` | `rolGuard('admin')` |

### Flujo de compra
1. `/comprar/:funcionId` carga función, precios, candy y butacas ocupadas, y se suscribe a Realtime.
2. El usuario elige comprar con su cuenta (se valida la edad con su fecha de nacimiento) o como anónimo (declaración jurada si la película tiene restricción).
3. Elige butacas: el mapa se actualiza en vivo con las compras de otros.
4. Agrega candy, combos y canjes de puntos; el resumen (un `computed` sobre `CalculadoraPrecio`) se actualiza solo.
5. Paga (tarjeta simulada y/o crédito). Se insertan primero las entradas (la base rechaza butacas repetidas), después la compra, los productos y los canjes.
6. Se muestra la entrada con el QR y se puede descargar el PDF.

### Modelo de datos
| Tabla | Contenido |
|---|---|
| `usuarios` | Perfil del registro (id = id de `auth.users`) |
| `peliculas`, `generos`, `pelicula_generos` | Catálogo; muchos a muchos entre películas y géneros |
| `salas`, `funciones` | Funciones con inicio, fin, formato e idioma |
| `configuracion` | Una fila: precio común, precio VIP, % de primera compra, puntos por entrada gratis |
| `cupones` | Cupones (para todos o solo mayores de 50) |
| `categorias`, `productos`, `combos` | Candy bar |
| `compras` | Código del QR, montos, medios de pago, puntos, estado y estado de validación |
| `entradas` | Una fila por butaca vendida, `UNIQUE (funcion_id, fila, numero)` |
| `compra_items` | Productos y combos de cada compra |
| `canjes` | Historial de canjes de puntos |
| `resenas` | Estrellas y comentario, una por usuario y película |
| `alertas`, `suscripciones_push` | Alertas de "Próximamente" y suscripciones push |
| `log_actividad` | Quién hizo qué y cuándo |

**RLS:** el rol se lee del JWT (`app_metadata.rol`). Catálogo: lectura pública, escritura del admin. Compras, canjes y alertas: cada usuario las suyas; empleados y admin leen y validan compras. Butacas ocupadas: lectura pública (sin datos personales). Storage: bucket público `imagenes`, solo el admin sube. Los scripts están en `supabase/`.

## PWA y notificaciones
- `manifest.webmanifest` con nombre, colores e íconos propios de Fotograma.
- `ngsw-config.json`: la aplicación (JS, CSS, index, logo) se precarga (`prefetch`); íconos y fuentes se cachean al usarse (`lazy`); los pósters de Supabase Storage se cachean con estrategia `performance` (máx. 60, 7 días). Los datos de la base no se cachean: siempre se piden actualizados.
- **Push:** un usuario registrado activa la alerta de una película de "Próximamente" → `SwPush.requestSubscription` con la clave pública VAPID → la suscripción se guarda en `suscripciones_push`. El admin, desde Películas, presiona "Avisar" → la Edge Function `notificar-estreno` (con `web-push` y la clave privada como secret) envía la notificación a esos usuarios. Al tocarla se abre la película.
- Secrets de la Edge Function (Supabase → Edge Functions → Secrets): `VAPID_PUBLIC`, `VAPID_SECRET`, `VAPID_MAIL` (formato `mailto:...`).

## Cómo correrlo en local
```bash
npm install
ng serve -o
```
Para probar PWA / push (no funcionan en `ng serve`):
```bash
ng build
npx http-server dist/cine/browser -p 8080
```
Variables en `src/environments/environment.ts` y `environment.development.ts` (solo claves públicas). Las claves privadas viven como secrets en Supabase.

## Librerías no vistas en clase
| Librería | Uso | Alternativa descartada |
|---|---|---|
| `qrcode` | Generar el QR de la entrada | Servicios web de QR (dependen de un tercero) |
| `html5-qrcode` | Escanear el QR con la cámara | Solo ingreso manual |
| `jspdf` | PDF de la entrada y del reporte | `window.print()` |
| (sin librería) CSV | Exportar a Excel | SheetJS (pesada para una tabla) |
| (sin librería) CSS | Gráficos de barras | Chart.js |
