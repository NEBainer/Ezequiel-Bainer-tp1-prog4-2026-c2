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

_Se completa con las ambigüedades detectadas en los correos y el criterio elegido para cada una, por módulo._

### 4.1 Usuarios, roles y autenticación
_A completar._

### 4.2 Catálogo: películas, géneros, salas, butacas y funciones
_A completar._

### 4.3 Compra: butacas en tiempo real, precios, cupones y pago
_A completar._

### 4.4 Candy bar y combos
_A completar._

### 4.5 Entradas: PDF, QR y validación
_A completar._

### 4.6 Reseñas y "Mis películas"
_A completar._

### 4.7 Fidelización: puntos y crédito
_A completar._

### 4.8 Próximamente, preventa y notificaciones
_A completar._

### 4.9 Administración: reportes, gráficos y registro de actividad
_A completar._

### 4.10 Experiencia de usuario y estilo visual
_A completar._
