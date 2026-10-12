# Tu Sticker

Aplicacion de comercio de stickers organizada como monorepo. El backend y el frontend se versionan juntos, pero pueden compilarse y desplegarse de forma independiente.

## Estructura

```text
tu-sticker-app/
|-- tu-sticker-api/       API REST con Express, TypeScript y MongoDB
|-- tu-sticker-frontend/  Aplicacion web con Angular
|-- .gitignore
`-- README.md
```

## Desarrollo local

### API

```bash
cd tu-sticker-api
npm ci
cp .env.example .env
npm run dev
```

Completa `.env` con una instancia de MongoDB y un `JWT_SECRET` seguro. La API ofrece Swagger en `/api/docs/`.

### Frontend

```bash
cd tu-sticker-frontend
npm ci
npm start
```

## Despliegue de la API en Render

Crea un servicio **Web Service** conectado a este repositorio y configura:

- Branch: `main`
- Root Directory: `tu-sticker-api`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Auto-Deploy: al subir cambios a `main`

Configura en Render las variables requeridas indicadas en `tu-sticker-api/.env.example`, incluyendo `MONGO_URI` y `JWT_SECRET`. Agrega las credenciales de Wompi y del administrador inicial solo si corresponde. No subas archivos `.env` ni secretos a GitHub.

Render proporciona `PORT` automaticamente. Para produccion tambien se debe configurar el origen del frontend en CORS y compilar el frontend con la URL publica de la API; actualmente sus archivos de entorno usan una URL local.