# consorcio-autogestionado-mobile

Frontend de la aplicación **Consorcio Autogestionado** (GDSI TP4). Aplicación React Native + Expo con soporte para iOS, Android y web (Vercel).

---

## Stack

| Tecnología | Versión / Uso |
|---|---|
| React Native | 0.74 |
| Expo | 51 |
| Expo Router | 3 — routing file-based (`app/` directory) |
| Axios | HTTP client con interceptores JWT automáticos |
| AsyncStorage | Persistencia de tokens y datos de sesión |
| @expo/vector-icons | Ionicons para todos los íconos de la UI |
| Vercel | Deploy web (build estático con `expo export`) |

---

## Estructura del proyecto

```
consorcio-autogestionado-mobile/
├── app/                          # Rutas Expo Router (file-based)
│   ├── _layout.jsx               # RootLayout: carga de fuentes Ionicons
│   ├── index.jsx                 # Splash: verifica token → redirige a home o login
│   ├── login.jsx                 # → LoginScreen
│   ├── register.jsx              # → RegisterScreen
│   ├── home.jsx                  # Auth guard → HomeScreen
│   ├── members.jsx               # → MembersScreen
│   ├── groups/
│   │   ├── index.jsx             # → GroupSelectionScreen
│   │   └── create.jsx            # → CreateGroupScreen
│   └── expenses/
│       └── add.jsx               # → AddExpenseScreen
├── src/
│   ├── api/
│   │   └── api.js                # Instancia Axios + interceptor de refresh token
│   ├── constants/
│   │   └── colors.js             # Paleta de colores (COLORS)
│   ├── pages/
│   │   ├── LoginScreen.jsx
│   │   ├── RegisterScreen.jsx
│   │   ├── HomeScreen.jsx
│   │   ├── GroupSelectionScreen.jsx
│   │   ├── CreateGroupScreen.jsx
│   │   ├── MembersScreen.jsx
│   │   └── AddExpenseScreen.jsx
│   └── services/
│       ├── auth.js               # login, register, logout, refreshToken
│       └── group.js              # getMyGroup, listGroups, createGroup, joinGroup,
│                                 # getMembers, transferAdmin, leaveGroup,
│                                 # createExpense, getMonthlySummary, getExpenses
├── vercel.json                   # Build command + rewrite rules para SPA
├── app.json                      # Configuración Expo
├── package.json
└── .env.example
```

---

## Variables de entorno

Copiá `.env.example` a `.env` y completá:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | URL base del backend | `http://localhost:8001` (local) o URL de Railway |

Las variables con prefijo `EXPO_PUBLIC_` son accesibles en el código del cliente.

---

## Ejecución local

```bash
cp .env.example .env
# Completar EXPO_PUBLIC_API_URL con la URL del backend

npm install
npm start
```

Expo levanta el servidor de desarrollo. Opciones:
- `i` — abrir en simulador iOS
- `a` — abrir en emulador Android
- `w` — abrir en el navegador (web)
- Escanear QR con la app Expo Go en el dispositivo físico

Para correr solo en web:

```bash
npx expo start --web
```

---

## Flujo de autenticación

La sesión se mantiene con dos tokens almacenados en `AsyncStorage`:

| Key | Descripción |
|---|---|
| `token` | JWT de acceso (corta duración) |
| `refreshToken` | Token de refresco (larga duración) |
| `groupId` | ID del grupo actual del usuario |
| `groupName` | Nombre del grupo actual |

El interceptor en `src/api/api.js` adjunta automáticamente el `Authorization: Bearer <token>` a cada request. Si recibe un 401, intenta renovar el access token con el refresh token antes de reintentar. Si el refresh también falla, redirige al login.

---

## Flujo de navegación

```
index.jsx (splash)
  ├── Sin token → /login
  ├── Con token, con grupo → /home
  └── Con token, sin grupo → /groups

/groups (GroupSelectionScreen)
  ├── Unirse a grupo existente → /home
  └── /groups/create (CreateGroupScreen) → /home

/home (HomeScreen)
  ├── /expenses/add (AddExpenseScreen) → /home
  └── /members (MembersScreen)
       └── Transferir admin / Salir del grupo → /groups
```

---

## Pantallas

### HomeScreen (`/home`)
- Resumen del mes: total de gastos del grupo y balance personal (Debés / Recuperás / Estás al día).
- Lista de gastos del mes con descripción, monto y quién pagó.
- FAB (+) y botón en header para agregar gasto.
- Icono de personas para ir a miembros.
- Confirmación de logout inline (sin Alert.alert, compatible con web).

### GroupSelectionScreen (`/groups`)
- Lista todos los grupos disponibles con nombre, icono y cantidad de miembros.
- Botón "Unirme" en cada fila — un usuario solo puede pertenecer a un grupo a la vez.
- Empty state con CTA para crear el primer grupo.
- Botón de logout en header con confirmación inline.

### CreateGroupScreen (`/groups/create`)
- Campos: nombre (requerido) y descripción (opcional).
- Selector de icono: grid 3×2 con 6 íconos preset (edificio, casa, local, torre, hotel, complejo).
- Al crear: guarda groupId y groupName en AsyncStorage y navega a /home.

### MembersScreen (`/members`)
- Lista de miembros con nombre, iniciales como avatar y chip de rol.
- El Administrador ve botón "Hacer admin" en cada miembro — confirmación inline (sin Alert.alert).
- Botón "Salir del grupo" al final con confirmación inline.
  - Bloqueado si el usuario tiene deuda pendiente.
  - El admin debe transferir el rol antes de salir si hay otros miembros.

### AddExpenseScreen (`/expenses/add`)
- Campos: descripción, monto con prefijo "$".
- Selector de quién pagó: lista de miembros estilo radio (por defecto el usuario actual).
- Muestra el monto por persona calculado dinámicamente.
- Al crear: navega de vuelta a /home.

---

## Consideraciones para web

### Fuentes de íconos

`@expo/vector-icons` requiere cargar explícitamente el archivo de fuente TTF en builds web. Esto se hace en `app/_layout.jsx`:

```jsx
import { useFonts } from 'expo-font'
import Ionicons from '@expo/vector-icons/Ionicons'

export default function RootLayout() {
  const [fontsLoaded] = useFonts(Ionicons.font)
  if (!fontsLoaded) return null
  return <Stack screenOptions={{ headerShown: false }} />
}
```

Sin esto, los íconos aparecen como cuadrados vacíos en producción.

### Alert.alert

`Alert.alert` de React Native no funciona en web. Todas las confirmaciones destructivas (logout, hacer admin, salir del grupo) usan estado React local para mostrar una strip de confirmación inline en lugar de un diálogo nativo.

### JWT decode en cliente

Para obtener el userId del token sin librería externa, se usa decodificación base64url manual:

```js
const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
```

El reemplazo de `-` → `+` y `_` → `/` es necesario porque JWT usa base64url (no base64 estándar).

---

## Deploy en Vercel

### Primera vez

1. Crear proyecto en [vercel.com](https://vercel.com) e importar el repositorio.
2. Vercel detecta automáticamente el `vercel.json`:

```json
{
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

3. En **Environment Variables**, agregar:
   - `EXPO_PUBLIC_API_URL` — URL pública del backend en Railway

4. La rewrite rule `/(.*) → /` es necesaria para que Expo Router (SPA) maneje el routing del lado del cliente sin que Vercel devuelva 404 en rutas directas.

### Deployar cambios nuevos

Vercel redeploya automáticamente con cada push a la rama conectada:

```bash
git add .
git commit -m "descripción del cambio"
git push
```

Vercel detecta el push, ejecuta `npx expo export --platform web` en su entorno y publica el nuevo `dist/` automáticamente.

> **Nota**: `dist/` está en `.gitignore`. Vercel construye el proyecto en su propio entorno usando el `buildCommand` del `vercel.json` — no es necesario commitear la carpeta `dist/` ni hacer build local antes de pushear.
