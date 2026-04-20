# Frontend RastroPet

Aplicacion Angular para mostrar publicaciones de mascotas perdidas y encontradas.

## Desarrollo local

```bash
npm install
npm start
```

La app corre en `http://localhost:4200`.

## Produccion en Vercel

- Define la variable de entorno `RAILWAY_API_URL` con la URL publica de tu backend en Railway, por ejemplo `https://tu-backend.up.railway.app`.
- El script `npm run build` ejecuta `scripts/write-env.js` y genera `src/environments/environment.prod.ts` con la URL correcta.
- `vercel.json` mantiene activas las rutas del frontend como `/admin`.

## Nota

En desarrollo, la app usa `/api/reports`. En produccion, usa la URL de Railway generada al compilar.
