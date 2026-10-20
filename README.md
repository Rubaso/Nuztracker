# Nuztracker estático

La web se compila como un sitio estático y muestra una instantánea de los archivos JSON en `data/`. No necesita conexión a Supabase ni un servidor para funcionar. La edición, el acceso con PIN y las actualizaciones en tiempo real no están disponibles.

## Desarrollo y compilación

```bash
npm ci
npm run dev
npm run build
```

La compilación estática se genera en `out/`.

Vercel compila y publica la web al subir cambios a la rama conectada. El proyecto mantiene `output: "export"` para generar una versión estática en `out/`; no hace falta configurar un workflow de GitHub Pages.

## Actualizar la instantánea

Los datos actuales están guardados en `data/capturas.json`, `data/torneo.json` y `data/torneo_historial.json`. Para actualizar el archivo público hay que exportar de nuevo los datos de la base de datos y reemplazar estos JSON antes de publicar. Solo incluye datos que quieras que cualquiera pueda leer.

La exportación recibida no incluía la tabla `directos`; por eso esta versión no muestra el estado de Twitch ni los PokéPaste actuales. Los PokéPaste guardados dentro del historial de torneos sí forman parte de la instantánea histórica.
