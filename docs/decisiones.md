# Decisiones técnicas y de negocio

Registro de las decisiones de diseño e implementación del proyecto. Cada decisión indica el problema, las alternativas consideradas, lo resuelto y su ubicación en el código.

## Formato

```
### D-XX — Título
- **Fecha:**
- **Requerimientos relacionados:** R-..
- **Problema:**
- **Alternativas consideradas:**
- **Decisión y fundamento:**
- **Ubicación en el código:** ruta/archivo.ts
- **Temas de la materia relacionados:**
```

## Decisiones

### D-00 — Criterios generales
- **Lectura de los requerimientos:** los correos del cliente se consolidan en un único conjunto de requerimientos; ante contradicciones prevalece el más reciente (ver `requerimientos.md`).
- **Stack:** Angular 22 (componentes standalone, signals, lazy loading, guards, interceptors) y Supabase (Auth, Postgres, Realtime, Storage, Edge Functions), con PWA. Deploy en Vercel.
- **Perfil de usuario:** tabla propia en el esquema `public`, con `id` como clave foránea a `auth.users`.
- **Seguridad:** los permisos se aplican en el servidor mediante políticas RLS de Supabase; los guards de rutas cumplen una función de experiencia de usuario.

### D-01 — Dónde se guarda el rol del usuario
- **Requerimientos relacionados:** R-18, R-19
- **Problema:** distinguir clientes, empleados y admin de forma que un usuario no pueda darse permisos a sí mismo.
- **Alternativas consideradas:** (a) `user_metadata`; (b) columna `rol` en la tabla `usuarios`; (c) `app_metadata`.
- **Decisión y fundamento:** `app_metadata`. El usuario puede modificar su propio `user_metadata` con `updateUser()`, por lo que cualquiera podría asignarse "admin". `app_metadata` solo se escribe desde el panel de Supabase o con la clave de servicio, y viaja en el JWT: las políticas RLS lo leen con `auth.jwt() -> 'app_metadata' ->> 'rol'`. Sin rol = cliente.
- **Ubicación en el código:** `src/app/services/auth.service.ts` (`rol()`), `src/app/guards/rol-guard.ts`, políticas en `supabase/02_cine.sql`.
- **Temas de la materia relacionados:** Supabase Auth, RLS, guards.

### D-02 — Seguridad: RLS por rol y guards como experiencia de usuario
- **Requerimientos relacionados:** R-18, R-19, R-33
- **Decisión y fundamento:** todas las tablas tienen RLS activada. El catálogo lo leen todos y solo lo escribe el admin; cada usuario lee únicamente sus compras, canjes y alertas; los empleados leen y validan compras; el log lo escriben admin y empleados y lo lee el admin. Los guards (`logueadoGuard`, `rolGuard`) solo evitan mostrar pantallas que no corresponden. Consultan la sesión con `getSession()` porque, al recargar la página, el guard se ejecuta antes de que `onAuthStateChange` cargue el usuario.
- **Ubicación en el código:** `supabase/02_cine.sql`, `src/app/guards/`.

### D-03 — Butacas: que dos personas no compren la misma
- **Requerimientos relacionados:** R-25
- **Problema:** dos usuarios pueden elegir la misma butaca al mismo tiempo.
- **Alternativas consideradas:** (a) verificar en el cliente antes de comprar; (b) reservas temporales con vencimiento; (c) restricción `UNIQUE` en la base.
- **Decisión y fundamento:** tabla `entradas` (una fila por butaca vendida) con `UNIQUE (funcion_id, fila, numero)`. Las entradas se insertan **antes** que la compra y en una sola sentencia: si otra persona ganó alguna butaca, la base rechaza todo el insert (error 23505) y no se registra la compra. La verificación en el cliente sola no alcanza porque entre la consulta y el insert puede comprar otro.
- **Consecuencia:** como las entradas se insertan antes que la compra, `entradas.compra_id` no tiene clave foránea; las entradas de una compra se consultan aparte.
- **Ubicación en el código:** `src/app/services/compras.service.ts` (`comprar`).

### D-04 — Butacas en tiempo real
- **Requerimientos relacionados:** R-25
- **Decisión y fundamento:** Realtime (`postgres_changes`) sobre la tabla `entradas`. El componente de compra se suscribe en `ngOnInit` y se desuscribe en `ngOnDestroy`. En un `INSERT` marca la butaca como ocupada (creando un nuevo `Set` para que Angular detecte el cambio) y, si el usuario la tenía elegida, se la quita y le avisa. En un `DELETE` (cancelación) Supabase solo envía el id, así que se vuelven a pedir las butacas ocupadas.
- **Ubicación en el código:** `src/app/pages/compra/compra.ts` (`ngOnInit`, `marcarOcupada`).
- **Temas de la materia relacionados:** Realtime, signals, ciclo de vida.

### D-05 — Modelo de la sala
- **Requerimientos relacionados:** R-03, R-24, R-26, R-39
- **Decisión y fundamento:** la distribución es igual en todas las salas, por eso no se guarda en la base: se genera en el código (`plano-sala.ts`). El tipo de butaca (común, accesible, VIP) se deriva de la fila. Ver criterios en `requerimientos.md` §4.2.
- **Ubicación en el código:** `src/app/services/plano-sala.ts`, `src/app/components/mapa-butacas/`.

### D-06 — Asignación automática de salas
- **Requerimientos relacionados:** R-06, R-22
- **Decisión y fundamento:** el admin indica días de la semana, horarios y período; el sistema arma la lista de funciones pedidas y, para cada una, busca la primera sala sin superposición. Dos funciones se pisan si `a.inicio < b.fin + 30 min` y `b.inicio < a.fin + 30 min`. La función guarda `fin` (inicio + duración) para facilitar esta comparación. Las funciones asignadas en la misma tanda se suman a la ocupación para que no se pisen entre sí. Los horarios sin sala libre se informan y no se crean.
- **Limitación conocida:** la verificación se hace en la aplicación; si dos administradores programaran a la vez la misma sala podría haber un conflicto (la base solo impide dos funciones con el mismo inicio en la misma sala).
- **Ubicación en el código:** `src/app/services/funciones.service.ts` (`asignarSalas`, `sePisan`), `src/app/admin/funciones/`.

### D-07 — Cálculo del precio final
- **Requerimientos relacionados:** R-08, R-14, R-15, R-31, R-32, R-34, R-36, R-38, R-39
- **Decisión y fundamento:** un servicio con una única función `calcular()` que recibe el pedido y los datos del comprador y devuelve el detalle completo. Se usa desde un `computed`, por lo que el resumen se actualiza solo con cada cambio. Orden: precio base o de preventa (+ recargo VIP) → combos y canjes → mejor cupón → crédito como medio de pago → puntos a ganar. Ver `requerimientos.md` §4.3.
- **Ubicación en el código:** `src/app/services/calculadora-precio.ts`.

### D-08 — Puntos y crédito sin saldo guardado
- **Requerimientos relacionados:** R-31, R-32, R-33, R-38
- **Alternativas consideradas:** (a) columnas `puntos` y `credito` en `usuarios`; (b) calcularlos con el historial.
- **Decisión y fundamento:** se calculan con el historial: puntos = puntos ganados en compras activas − puntos de canjes de compras activas; crédito = crédito otorgado por cancelaciones − crédito usado. Un saldo guardado necesitaría que el usuario pueda modificarlo (y entonces podría ponerse cualquier valor) o lógica en el servidor. Al cancelar, todo se recalcula solo.
- **Ubicación en el código:** `src/app/services/compras.service.ts` (`traerSaldos`, `cancelar`).

### D-09 — QR de un solo uso con dos partes
- **Requerimientos relacionados:** R-16, R-19, R-20, R-21
- **Decisión y fundamento:** la compra tiene `entrada_validada` y `candy_validado` (null si no compró candy). La validación es un `update` condicionado: `.eq('entrada_validada', false)`. Si dos empleados validan el mismo código a la vez, la base procesa los updates de a uno: el primero modifica la fila y el segundo no encuentra filas que cumplan la condición, así que recibe una lista vacía y se informa "ya usada". El QR contiene solo el código; el empleado puede escanearlo o tipearlo.
- **Ubicación en el código:** `src/app/services/compras.service.ts` (`validarEntrada`, `validarCandy`), `src/app/pages/validar/`.

### D-10 — Compra anónima
- **Requerimientos relacionados:** R-09
- **Decisión y fundamento:** la compra se guarda con `usuario_id` nulo y sin datos de contacto. Como un anónimo no puede leer compras (si pudiera, vería los códigos de otros), la entrada se arma en pantalla con los datos locales y se descarga en PDF. Los ids de compra se generan en el cliente con `crypto.randomUUID()`.
- **Detalle de RLS:** la política de insert de `compra_items` no puede verificar la compra con una subconsulta, porque esa subconsulta se ejecuta con los permisos de quien inserta y el anónimo no puede leer `compras`. El `compra_id` es un UUID aleatorio que solo conoce quien compró.
- **Ubicación en el código:** `src/app/pages/compra/compra.ts` (`confirmar`).

### D-11 — Librerías no vistas en clase
- **QR:** `qrcode` (genera la imagen del QR). Alternativa descartada: servicios web de QR (dependen de un tercero y exponen el código).
- **Escaneo:** `html5-qrcode` (usa la cámara del dispositivo). Alternativa: solo ingreso manual, que la consigna pide igualmente como respaldo.
- **PDF:** `jsPDF` (entrada y reporte). Alternativa descartada: `window.print()`, que no genera un archivo con diseño controlado.
- **Excel:** archivo CSV separado por `;` con BOM UTF-8, que Excel abre en columnas y con acentos. Alternativa descartada: SheetJS (`xlsx`), una librería pesada para una tabla simple.
- **Gráficos:** barras horizontales con CSS. Alternativa descartada: Chart.js, innecesaria para rankings de una sola serie.

### D-12 — Ingreso de fechas y horas
- **Requerimientos relacionados:** R-28, R-29
- **Decisión y fundamento:** no se usa el calendario desplegable que el cliente pidió evitar. Fechas de nacimiento y estreno: componente `selector-fecha` con tres listas, que recibe el `FormControl` del formulario padre por `input()`. Días y horarios de funciones y de compra: botones (chips) de un click.
- **Ubicación en el código:** `src/app/components/selector-fecha/selector-fecha.ts`, `src/app/admin/funciones/`.

### D-13 — Notificaciones de "Próximamente"
- **Requerimientos relacionados:** R-35
- **Decisión y fundamento:** al activar la alerta se pide la suscripción con `SwPush` y se guarda en `suscripciones_push` junto con el id del usuario (así se notifica solo a quienes activaron la alerta de esa película). El envío lo hace la Edge Function `notificar-estreno` con `web-push`; verifica que quien la llama sea admin y usa la clave de servicio, que solo existe en el servidor. El payload incluye `onActionClick` para que el Service Worker de Angular abra la película al tocar la notificación. Las suscripciones vencidas (404/410) se borran.
- **Ubicación en el código:** `src/app/services/notificaciones.service.ts`, `supabase/functions/notificar-estreno/index.ts`.

### D-14 — Estado y comunicación entre componentes
- **Decisión y fundamento:** servicios con `@Service()` e `inject()`, un único `SupabaseService`. El estado que cambia de forma asincrónica está en signals y los valores derivados (filtros del buscador, detalle de precio, ranking de reportes) en `computed`. Los componentes reutilizables (mapa de butacas, póster, estrellas, entrada, selector de fecha) reciben datos con `input()` y avisan con `output()`; no consultan la base.
- **Interceptors:** `supabase-js` usa `fetch` y no `HttpClient`, por lo que un interceptor de Angular no intercepta sus pedidos; no se usa.
