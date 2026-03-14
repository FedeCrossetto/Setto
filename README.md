# Stitch Fitness

PWA mobile-first de seguimiento fitness personalizado. Instalable en iPhone via "Agregar a pantalla de inicio".

## Módulos

- **Inicio** — Dashboard con resumen diario, calorías, próximo entrenamiento
- **Entrenamiento** — Crear rutinas, sesión activa con tracking de series (peso/reps), historial
- **Antropometría** — Importar Excel, gráficos de tendencia, formulario de medidas
- **Nutrición** — Plan de comidas, tracking de calorías/macros, templates
- **Progreso** — Fotos, galería semanal, comparación before/after, streak

## Stack

- React 18 + Vite
- Tailwind CSS v4
- React Router v6
- Recharts
- IndexedDB (via `idb`)
- SheetJS (xlsx)
- vite-plugin-pwa

## Desarrollo local

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
npm run preview
```

## Deploy

La app necesita HTTPS para funcionar como PWA. Opciones gratuitas:

1. **Vercel** — Conectar el repo de GitHub, deploy automático
2. **Netlify** — Igual de simple
3. **GitHub Pages** — Gratis con dominio `.github.io`

### Instalar en iPhone

1. Abrir la URL en Safari
2. Tocar "Compartir" (ícono de flecha)
3. "Agregar a pantalla de inicio"

## Datos

Todos los datos se guardan localmente en IndexedDB. Podés exportar un backup JSON desde la app.
La capa de datos está aislada en `src/lib/db.js`, por lo que se puede reemplazar por un backend (Supabase, Firebase) cambiando solo ese archivo.
