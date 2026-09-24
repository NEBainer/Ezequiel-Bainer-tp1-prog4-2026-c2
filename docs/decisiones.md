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

_Las decisiones siguientes se agregan como D-01, D-02, …_
