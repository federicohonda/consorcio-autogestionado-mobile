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

## Pantallas Principales (Actualizadas)

### HomeScreen (`/home`)
- Resumen del mes: balance personal con colores dinámicos (Verde "A favor" / Rojo "Debés").
- Lista de gastos del mes con categorías.
- Diccionario visual: Mapeo automático de colores de fondo e íconos Ionicons según la categoría del gasto.
- Badge verde de Código de Invitación visible exclusivamente si el perfil actual tiene rol Administrador.

### GroupSelection / CreateGroup
- Flujo de creación: Pide M2 del administrador creador.
- Flujo de unión: Exige Código de Invitación exacto (case-sensitive) y los M2 de la unidad del usuario.

### AddExpenseScreen (`/expenses/add`) - V2
- Selector horizontal de Categorías (Reparaciones, Servicios, Limpieza, Seguridad, Otros).
- Campos: descripción, monto con prefijo "$".
- Toggle de división de deuda: Partes Iguales vs % Proporcional (M2).
- Lista dinámica de pagadores: Permite cargar montos específicos por cada vecino que aportó plata.
- Validación matemática en tiempo real (evita guardar si la suma de pagos no coincide con el total).
- UI maquetada para subida de comprobantes/tickets.
- Al crear: navega de vuelta a /home.

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

Dado que el código corre tanto en Mobile como en Navegadores Web, se implementaron soluciones específicas:

### El "Bug del Escudo" en Web (`TouchableWithoutFeedback`)
Para ocultar el teclado en celulares se suele envolver la pantalla en `<TouchableWithoutFeedback>`. Sin embargo, en navegadores (Chrome/Edge), este componente intercepta los clics e impide hacer foco en los `TextInput`. 
**Solución:** Se implementó un renderizado condicional usando `Platform.OS === 'web'` para evitar montar este wrapper si el usuario está en PC.

### Formato numérico LATAM (Coma vs Punto)
Los teclados latinoamericanos usan la coma (`,`) por defecto. React Native suele ignorarla o romper el parseo a `float`. 
**Solución:** Se implementó limpieza mediante Regex (`value.replace(/[^0-9.,]/g, '')`) y conversión forzada de comas a puntos (`.replace(',', '.')`) justo antes de enviar el payload al backend para asegurar compatibilidad matemática universal.

### Doble borde negro en inputs Web
Al compilar para web, los navegadores le agregan su propia propiedad CSS `outline` a los inputs enfocados, rompiendo el diseño de bordes redondeados de React Native.
**Solución:** Se utilizó `Platform.select` en los StyleSheet para inyectar `{ outlineStyle: 'none' }` exclusivamente en compilaciones web.

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

El proyecto no tiene GitHub conectado en Vercel, por lo que **el push al repositorio no dispara un redeploy automático**. Hay que deployar manualmente desde la terminal cada vez que se quiera publicar una nueva versión. Vercel toma el `buildCommand` del `vercel.json`, construye el proyecto en su entorno y publica el resultado.

**Pasos:**

1. Hacé los cambios en el código.

2. Pararse en la carpeta del proyecto mobile:
   ```bash
   cd consorcio-autogestionado-mobile
   ```

3. Ejecutar el deploy:
   ```bash
   npx expo export --platform web
   vercel --prod
   ```
   > Si es la primera vez en esta máquina: primero `npm i -g vercel` y luego `vercel login`.

4. Vercel va a mostrar en la terminal el progreso del build. Al terminar vas a ver algo como:
   ```
   🔍  Inspect: https://vercel.com/fedeghonda-7443s-projects/consorcio-autogestionado-mobile/149XJ5qZuPsrtjJi8LFS1deRp9aP 
   ✅  Production: https://consorcio-autogestionado-mobile.vercel.app
   🔗  Aliased: https://consorcio-autogestionado-mobile.vercel.app
   ```

5. Abrí esa segunda URL en el navegador y verificá que los cambios estén reflejados.
