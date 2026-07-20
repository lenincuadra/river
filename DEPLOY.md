# DEPLOY.md — Publicar la instancia personal de River

> Guía para poner River en internet (celular + Mac) con los datos personales en la nube.
> La instancia de **trabajo** no necesita nada de esto: es este repo corriendo con `npm run dev`.

```
                    UN SOLO CÓDIGO (github.com/lenincuadra/river)
                                      │
              git push ───────────────┤
                                      │
        ┌─────────────────────────────┴─────────────────────────────┐
        │                                                           │
  PERSONAL (nube)                                             TRABAJO (local)
  Vercel se actualiza sola con cada push                      npm run dev en la Mac
  Datos en Turso (river-personal)                             Datos en river.db (archivo)
  Login con contraseña · celular y Mac                        Sin login · solo tu Mac
```

## Paso 1 — Crear la base en Turso (los datos personales)

1. Crear cuenta gratis en https://turso.tech (con tu GitHub `lenincuadra` es un clic).
2. Instalar su herramienta en la Mac e iniciar sesión:
   ```bash
   brew install tursodatabase/tap/turso
   turso auth login
   ```
3. Crear la base y obtener sus dos credenciales:
   ```bash
   turso db create river-personal
   turso db show river-personal --url        # → TURSO_DATABASE_URL (libsql://…)
   turso db tokens create river-personal     # → TURSO_AUTH_TOKEN (texto largo)
   ```
4. Crear las tablas y cargar el caso de ejemplo, desde la carpeta del repo:
   ```bash
   TURSO_DATABASE_URL="libsql://…" TURSO_AUTH_TOKEN="…" npm run db:push
   TURSO_DATABASE_URL="libsql://…" TURSO_AUTH_TOKEN="…" npm run db:seed
   ```
   (Pegando tus valores reales. El seed es opcional: podés arrancar vacía omitiendo esa línea.)

## Paso 2 — Publicar la app en Vercel

1. Crear cuenta gratis en https://vercel.com (también con tu GitHub `lenincuadra`).
2. **Add New → Project** → importar el repo `lenincuadra/river`. Vercel detecta Next.js solo; no tocar nada de build.
3. Antes de darle Deploy, en **Environment Variables** agregar las tres:

   | Nombre | Valor |
   |---|---|
   | `TURSO_DATABASE_URL` | la URL `libsql://…` del paso 1 |
   | `TURSO_AUTH_TOKEN` | el token del paso 1 |
   | `RIVER_PASSWORD` | la contraseña que quieras para entrar |

4. **Deploy**. En un minuto te da la URL (algo como `river-xxx.vercel.app`).

## Paso 3 — En el celular

1. Abrir la URL en el navegador del celular y entrar con tu contraseña (queda recordada un año).
2. **Compartir → Agregar a pantalla de inicio** (iPhone) o menú ⋮ → **Agregar a pantalla principal** (Android). River queda con su ícono 1R y se abre a pantalla completa, como app.

## Desde entonces

- **Actualizar la app**: nada que hacer — cada `git push` a `main` redeploya solo.
- **Backup personal**: `turso db shell river-personal ".dump" > backup-personal.sql`
- **Backup trabajo**: copiar el archivo `river.db`.
- La misma URL funciona en la Mac para tus cosas personales; lo laboral sigue en `localhost:3000`.
