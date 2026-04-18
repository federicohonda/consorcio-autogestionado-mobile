# consorcio-autogestionado-mobile

Frontend mobile de la aplicación Consorcio Autogestionado. Desarrollado con React Native + Expo 51 y Expo Router.

## Stack

- React Native 0.74 + Expo 51
- Expo Router 3 (file-based routing)
- Axios (HTTP client con interceptores JWT)
- AsyncStorage (persistencia de tokens)
- Expo Notifications (push notifications)
- Expo Image Picker
- Expo Auth Session (OAuth)
- Vercel (deploy web)

## Setup local

```bash
cp .env.example .env
# Completar las variables en .env

npm install
npm start
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL base del backend (ej: `http://localhost:8001`) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Client ID de Google OAuth |

## Deploy web (Vercel)

```bash
npx expo export --platform web
# El output se genera en /dist — Vercel lo publica automáticamente
```

## Estructura

```
app/               # Rutas (Expo Router — file-based)
src/
  api/             # Instancia Axios + interceptores
  components/      # Componentes reutilizables
  constants/       # Colores, tema
  pages/           # Screens principales
  services/        # Lógica de negocio (auth, usuarios, etc.)
  utils/           # Helpers
```
