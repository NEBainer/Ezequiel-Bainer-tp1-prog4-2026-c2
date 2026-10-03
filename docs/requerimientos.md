# Requerimientos — Sistema web para un cine

Documento que resume los requerimientos del sistema, extraídos del intercambio de correos con el cliente.

**Criterio de lectura:** los correos se leen como un conjunto y no como una secuencia de tareas. Si un correo posterior ajusta o contradice a uno anterior, prevalece el más reciente.

---

## 1. Requerimientos del cliente (por correo)

### Mail 1 — 01/01/2020 (propuesta inicial)
| ID | Pedido |
|---|---|
| R-01 | Página propia del cine para que los clientes saquen entradas. Un solo edificio con varias salas. |
| R-02 | Al sacar entrada, el sistema genera un **PDF** con los datos de la entrada y un **QR** para presentar y ver la película. |
| R-03 | Todas las salas tienen la misma forma: **20 filas** numeradas con **letras** y **3 columnas** con **4, 20 y 4 butacas**. |
| R-04 | Control total desde el sistema: qué películas aparecen al entrar a la página, en qué horarios está cada película, si es **2D/3D/4D/5D**, si es **castellano o subtitulada**. "TODO". |
| R-05 | Toda película tiene **duración, imagen, nombre y sinopsis**. |
| R-06 | No puede haber una función antes de que pasen **30 min** desde que terminó la función anterior en esa sala. |
| R-07 | Registro de usuarios: **mail, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos, cantidad de días de vacaciones por año**. |
| R-08 | Beneficio por registrarse: **cupón de 20%** de descuento en la **primera compra**. |
| R-09 | Se puede comprar siendo **anónimo**, siempre que se pague. |

### Mail 2 — 16/01/2020 (reseñas y portada)
| ID | Pedido |
|---|---|
| R-10 | **Reseñas**: cada persona califica con **estrellas** cada película y deja un **comentario corto**. Se ve **antes de sacar las entradas**. |
| R-11 | Mostrar la **puntuación promedio** de cada película. |
| R-12 | En la página principal se muestran **primero las 3 películas más vendidas**. El listado de películas tiene un **buscador**. |

### Mail 3 — 16/01/2020 (buscador)
| ID | Pedido |
|---|---|
| R-13 | El buscador **filtra por género**. Cada película puede tener **varios géneros**. |

### Mail 4 — 30/01/2020 (cupones y candy)
| ID | Pedido |
|---|---|
| R-14 | El cupón de primera compra es **configurable**: el admin cambia el porcentaje cuando quiera. |
| R-15 | Poder crear **cupones que solo afecten a usuarios de más de 50 años**. |
| R-16 | **Candy** (pochoclos, bebidas, etc.): el admin crea todos los productos, los pone en **categorías**, y se compran **junto con la entrada**. Con el **mismo QR** se retira también la comida. |
| R-17 | Pantalla con **mapa del cine** que indique la sala de la entrada comprada. **"No tenemos luz verde aún."** (Ver §3: queda a criterio del alumno.) |

### Mail 5 — 06/02/2020 (administración y empleados)
| ID | Pedido |
|---|---|
| R-18 | Un usuario **admin** que controla todo lo de **salas, funciones, distribución de butacas, productos**, etc. |
| R-19 | Usuarios **empleados** que **escanean QR** para validar entradas (cine) y también para el **Candy bar**. |
| R-20 | Poder ingresar el **código a mano** si el lector no funciona. |
| R-21 | Una vez que la entrada se valida o se entrega la comida, **el QR deja de funcionar**. |
| R-22 | **Asignación de salas automática**. Bajo ningún término dos funciones en la misma sala al mismo tiempo. Ejemplo: una película los **lunes, martes y viernes a las 18hs**; la sala la asigna el sistema, donde no haya otra película en ese horario. |

### Mail 6 — 12/02/2020 (edad, cambios en salas, tiempo real)
| ID | Pedido |
|---|---|
| R-23 | Restricciones de edad: algunas películas **18**, otras **13**, otras sin restricción. A menores de 18 o 13 **no se les deja comprar** esas entradas. Toda entrada de esas películas debe **aclarar que debe ir un adulto**. |
| R-24 | Cambio en las salas: se quitan las **dos filas del medio (J y K)** para dar lugar a **una fila de butacas para personas con discapacidad**. En cada columna quedan **2, 10 y 2** butacas de ese estilo. |
| R-25 | Butacas en **tiempo real**: quien está eligiendo ve cuáles ya están ocupadas por **otra compra en ese mismo momento**. |
| R-26 | Las butacas **accesibles** ("filas J y K adaptadas") se **resaltan visualmente de forma diferente**. |

### Mail 7 — 28/02/2020 (usabilidad y reporte)
| ID | Pedido |
|---|---|
| R-27 | Interfaces **fáciles de navegar y entender**, para clientes **y empleados**. |
| R-28 | Mejor forma de **ingresar fechas y horas**, sin tanto tiempo de búsqueda (el mail adjunta una imagen de lo que NO quieren). |
| R-29 | **Demasiado scroll** no. |
| R-30 | En el admin, **reporte de facturación por día** y **cantidad de entradas vendidas**. |

### Mail 8 — 03/03/2020 (fidelización y combos)
| ID | Pedido |
|---|---|
| R-31 | **Puntos**: cada compra de un usuario **registrado** acumula puntos. **1 punto por cada peso gastado**. |
| R-32 | Los puntos se **canjean** por **entradas gratis** o **productos del candy bar**. El admin **configura cuántos puntos cuesta cada recompensa** (ej.: entrada 500, pochoclo grande 150). |
| R-33 | En su **perfil**, el usuario ve sus **puntos acumulados** y el **historial de canjes**. Los puntos **no se transfieren** entre usuarios. |
| R-34 | **Combos** especiales: entrada + pochoclos + bebida a **precio fijo configurable** desde el admin. Aparecen **destacados** en la página de compra. |

### Mail 9 — 08/03/2020 (próximamente, preventa, mis películas)
| ID | Pedido |
|---|---|
| R-35 | Sección **"Próximamente"** con películas que se estrenan en las próximas semanas. El usuario puede **activar una alerta** para recibir una **notificación** cuando las entradas estén a la venta. |
| R-36 | **Preventa**: abrir la venta **7 días antes del estreno** con **precio especial**; pasada esa fecha vuelve al normal. **Configurable película por película**. |
| R-37 | Sección **"Mis películas"**: historial **visual** de lo que el usuario vio, con **pósters, fechas y su propia calificación**. |

### Mail 10 — 10/03/2020 (últimos cambios)
| ID | Pedido |
|---|---|
| R-38 | **Cancelar** una compra hasta **2 horas antes** de la función. **Sin devolución de dinero**: se da **crédito en la cuenta** para futuras compras. El crédito aparece en el **perfil** y se puede usar **junto con otros métodos de pago**. |
| R-39 | **Butacas VIP** en las **últimas 3 filas (R, S y T)**: **precio más alto**, **marca visual distinta** en el mapa, y el usuario debe saber **claramente** que compra VIP **antes de pagar**. |
| R-40 | El admin **exporta el reporte de facturación a PDF y a Excel**. |
| R-41 | Admin: **gráfico** de películas **más vistas por semana y por mes**, y **producto del candy bar más vendido**. |
| R-42 | **Log de actividad** en el admin: quién creó qué función, quién modificó un precio, quién validó un QR. Todo con **fecha y hora**. |

---

## 2. Requisitos de la entrega
- **E-01** Documento que resuma los requerimientos (este archivo).
- **E-02** Aplicación completa que aplique los temas vistos en la materia.
- **E-03** Defensa oral de las decisiones tomadas.
- **E-04** Aplicación desplegada con URL funcional, código en GitHub y README con arquitectura y decisiones técnicas.
- **E-05** Estilo visual propio.
- **E-06** Uso correcto de Angular y buenas prácticas, integración con Supabase, integración de PWA y lógica de negocio.

## 3. Aclaraciones recibidas del docente
- **Compra anónima:** sin ningún dato rastreable del comprador (ni siquiera correo). La consigna no pide enviar la entrada por correo.
- **Restricción de edad:** el menor no puede comprar entradas de películas con restricción. Si se permitiera la compra sin verificación, la entrada aclara que debe asistir con un adulto. La verificación real es presencial y queda fuera del sistema.
- **Superposición de funciones:** en una sala no puede haber dos funciones a la misma hora ni funciones que se pisen, considerando la duración de la película más 30 minutos.
- **Inicio de la compra:** antes de comprar, el usuario elige explícitamente si compra registrado o como anónimo.
- **Butacas:** se respeta la distribución indicada en la consigna (filas identificadas con letras, columnas agrupadas) y se distingue con claridad qué butacas están seleccionadas.
- **Registro:** se incluyen todos los campos solicitados.
- **Mapa del cine (R-17):** queda a criterio del alumno; no es una funcionalidad confirmada por el cliente.
- **Estilo visual:** identidad propia (paleta, logo, íconos), sin replicar el diseño de cadenas de cine existentes.
- **PWA:** nombre e íconos propios y caché configurado según la aplicación. Notificaciones push reales.

---

## 4. Interpretación y criterios adoptados

Ambigüedades detectadas en los correos y criterio adoptado para cada una, por módulo.

### 4.1 Usuarios, roles y autenticación
- Hay tres roles: **cliente** (cualquier usuario registrado), **empleado** y **admin**.
- El rol se guarda en `app_metadata` de Supabase Auth. Ese dato solo puede modificarlo un administrador desde el panel de Supabase (no el propio usuario) y viaja en el JWT, por lo que las políticas RLS pueden consultarlo. Un usuario sin rol asignado es cliente.
- Las cuentas de admin y empleados se crean desde el registro y luego se les asigna el rol desde Supabase.
- El registro pide todos los datos solicitados: correo, nombre, apellido, fecha de nacimiento, tipo de sangre (lista cerrada), color de ojos (lista cerrada) y días de vacaciones por año (entero entre 0 y 365).
- La fecha de nacimiento se ingresa con tres listas (día, mes, año) en lugar de un calendario desplegable (R-28).

### 4.2 Catálogo: películas, géneros, salas, butacas y funciones

**Distribución de las salas**

Cada sala tiene 19 filas, identificadas con letras de la A a la T sin incluir la letra K.

- Las filas A-I y L-T (18 filas) tienen 28 butacas cada una, en tres columnas de 4, 20 y 4 butacas.
- La fila J concentra las butacas accesibles para personas con discapacidad, en el mismo sector físico que ocupaban originalmente las filas J y K de la distribución inicial. Tiene 14 butacas, en tres columnas de 2, 10 y 2.
- Las filas R, S y T conservan la distribución estándar de 28 butacas y son además butacas VIP, con un precio superior y una marca visual diferenciada en el mapa de butacas.
- En total, cada sala tiene 518 butacas.

**Películas**
- Cada película tiene nombre, sinopsis, duración, póster (opcional), edad mínima (sin restricción, 13 o 18), fecha de estreno, precio de preventa (opcional) y uno o más géneros.
- El admin decide si la película se muestra en la página. Una película con ventas no se borra: se oculta.
- El formato (2D, 3D, 4D, 5D) y el idioma (castellano o subtitulada) son datos de cada **función**, no de la película: una misma película puede proyectarse en 3D subtitulada a una hora y en 2D castellano a otra.

**Funciones y asignación automática de sala (R-06, R-22)**
- El admin elige película, formato, idioma, días de la semana, uno o más horarios, desde qué día y durante cuántas semanas (por ejemplo: lunes, martes y viernes a las 18:00 durante 2 semanas).
- El sistema asigna a cada función la primera sala libre. Una sala está libre si ninguna función (existente o creada en la misma tanda) se superpone considerando la duración de la película más 30 minutos de limpieza.
- Si en algún horario no hay ninguna sala libre, esa función no se crea y se informa al admin.
- No se crean funciones en el pasado ni antes de la fecha de estreno.

### 4.3 Compra: butacas en tiempo real, precios, cupones y pago

**Registrado o anónimo:** antes de elegir butacas, el usuario elige comprar con su cuenta o como anónimo. Un usuario logueado también puede comprar como anónimo.

**Restricción de edad**

- En una compra registrada, la validación es automática, contra la fecha de nacimiento cargada en el registro. Si el usuario no cumple la edad mínima de la película, no puede adquirir esa entrada.
- En una compra anónima no hay fecha de nacimiento disponible, por lo que se solicita una declaración jurada mediante un checkbox específico para la restricción de la película. La compra no avanza sin esa confirmación.
- En ambos casos, si la película tiene restricción de edad, la entrada incluye una leyenda indicando que debe asistir acompañado de un adulto. La verificación presencial de la edad queda fuera del alcance del sistema.

**Butacas en tiempo real**
- El mapa distingue butacas libres, ocupadas, elegidas, accesibles y VIP con colores y símbolos distintos.
- Cuando otra persona compra o cancela, el mapa se actualiza sin recargar. Si alguien compra una butaca que el usuario tenía elegida, se le quita de la selección y se le avisa.
- La base de datos impide que dos compras se queden con la misma butaca de la misma función.
- Máximo 10 butacas por compra.

**Precio final, cupones, puntos y crédito**

1. Precio de cada entrada: el normal o, si la película está en preventa, el de preventa. Las butacas VIP suman la diferencia entre el precio VIP y el normal.
2. Un combo reemplaza el precio de una entrada por el precio fijo del combo.
3. Las entradas y productos canjeados con puntos no se cobran (en una butaca VIP canjeada se paga solo el recargo VIP).
4. Sobre el subtotal se aplica automáticamente el **mejor** cupón disponible; los cupones no se acumulan. Los compradores anónimos no tienen cupones.
5. Sobre el total, el crédito de la cuenta funciona como medio de pago (total o parcial). El resto se paga con tarjeta.
6. Se gana 1 punto por cada peso pagado con tarjeta (no por lo pagado con crédito ni por lo canjeado).

Antes de pagar se muestra el detalle completo, con las butacas VIP identificadas y un aviso explícito de que se está comprando VIP.

**Pago:** el pago con tarjeta es simulado (se validan los datos del formulario, pero no se realiza ningún cobro).

### 4.4 Candy bar y combos
- El admin crea categorías y productos (precio, categoría, costo en puntos opcional, disponible o no).
- Los combos tienen nombre, descripción de lo que incluyen y precio fijo. Cada combo incluye una entrada, por lo que no se pueden agregar más combos que butacas elegidas. Se muestran destacados al inicio del paso de candy.
- El candy se compra junto con la entrada y se retira con el mismo QR.

### 4.5 Entradas: PDF, QR y validación

**Validación del QR combinado (entrada y candy bar)**

- El estado de validación de la entrada y el de la parte de candy bar (cuando existe) se registran por separado, y cada uno puede confirmarse en cualquier orden.
- El QR deja de ser válido recién cuando se confirmaron todas las partes de esa compra. Si la compra no incluyó candy bar, alcanza con validar la entrada.
- Al escanear el código o ingresarlo manualmente, la pantalla de validación indica qué parte de la compra todavía está pendiente.

**Generación**
- El QR contiene un código de 8 caracteres (sin caracteres que se confundan, como O/0 o I/1), que también puede dictarse e ingresarse a mano.
- La entrada se descarga en PDF con los datos de la función, butacas, candy, total, QR y, si corresponde, la leyenda de restricción de edad.
- El comprador anónimo ve su entrada al terminar la compra y debe descargarla: no queda asociada a ninguna cuenta.

### 4.6 Reseñas y "Mis películas"
- Solo los usuarios registrados pueden reseñar: de 1 a 5 estrellas y un comentario de hasta 280 caracteres. Una reseña por usuario y película (se puede editar o borrar).
- Las reseñas y el promedio se ven en la ficha de la película, antes de comprar, y el promedio también en la cartelera.
- "Mis películas" muestra las películas de funciones ya pasadas de compras no canceladas, con póster, fecha y la calificación que el usuario le dio.

### 4.7 Fidelización: puntos y crédito
- Los puntos y el crédito no se guardan como un saldo modificable: se calculan a partir del historial de compras y canjes del propio usuario. Por eso no pueden transferirse.
- **Cancelación:** hasta 2 horas antes de la función y si la entrada no fue usada. No se devuelve dinero: se acredita en la cuenta todo lo pagado (tarjeta y crédito usado). Las butacas se liberan, los puntos ganados en esa compra se anulan y los canjeados se devuelven.
- El perfil muestra puntos, crédito, historial de canjes, entradas próximas y compras anteriores.

### 4.8 Próximamente, preventa y notificaciones
- "Próximamente" muestra las películas visibles cuya fecha de estreno es futura.
- Un usuario registrado puede activar una alerta por película. Al activarla, el navegador pide permiso de notificaciones y se guarda la suscripción push.
- Cuando las entradas están a la venta, el admin envía el aviso desde el panel; la notificación llega aunque la aplicación esté cerrada y al tocarla abre la película.
- **Preventa:** si la película tiene precio de preventa, la venta abre 7 días antes del estreno a ese precio. Desde el día del estreno rige el precio normal. Sin precio de preventa, la venta abre el día del estreno.

### 4.9 Administración: reportes, gráficos y registro de actividad
- Reporte de facturación por día y entradas vendidas, para los últimos 7, 30 o 90 días, exportable a PDF y a Excel (archivo CSV).
- Gráfico de películas más vistas (entradas vendidas) de la última semana o del último mes, y ranking de productos de candy más vendidos.
- Registro de actividad con fecha, hora y usuario: creación de funciones y películas, cambios de precios, cupones y productos, validación de entradas, entrega de candy y avisos enviados.

### 4.10 Experiencia de usuario y estilo visual
- Identidad propia "Fotograma": paleta oscura de sala con acento ámbar, tipografías Bricolage Grotesque y DM Sans, logo propio.
- Fechas y horas se eligen con botones o listas, sin calendarios desplegables.
- El mapa de butacas y el resumen de la compra se ven a la vez, para evitar scroll.
- **Mapa del cine (R-17):** no se implementa, porque el cliente indicó que no tiene aprobación.
