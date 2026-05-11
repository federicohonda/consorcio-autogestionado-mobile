/**
 * GUÍA DE CONFIGURACIÓN - Sistema de Recuperación de Contraseña
 * 
 * PASO 1: Configurar Supabase Email Template
 * ==========================================
 * 1. Ve a Supabase Dashboard → tu proyecto
 * 2. Authentication → Email Templates
 * 3. Haz clic en "Password Reset"
 * 4. Verifica que el enlace incluya los parámetros necesarios:
 *    {{ .ConfirmationURL }}
 * 
 * El URL debe ser algo como:
 * https://tuapp.com/reset-password?type=recovery&code=ABC123...
 * 
 * Para mobile con deep linking:
 * consorcio://reset-password?type=recovery&code=ABC123...
 * 
 * 
 * PASO 2: Agregar Deep Linking (Solo para React Native/Mobile)
 * ===========================================================
 * 
 * En app.json, verifica que ya exists:
 * ```json
 * "scheme": "consorcio"
 * ```
 * 
 * Expo Router maneja automáticamente los deep links
 * 
 * 
 * PASO 3: Variables de Entorno
 * ============================
 * El archivo .env ya debe tener:
 * EXPO_PUBLIC_SUPABASE_URL=
 * EXPO_PUBLIC_SUPABASE_ANON_KEY=
 * 
 * 
 * PASO 4: Probar Localmente (WEB)
 * ================================
 * 1. npm run web
 * 2. En login, click "¿Olvidaste tu contraseña?"
 * 3. Ingresa tu email
 * 4. Supabase enviará un email con el link
 * 5. Abre el link y test el reset
 * 
 * Para testing sin email real:
 * - Usa vercel.json o ngrok para crear URL pública
 * - O usa emails de desarrollo (si Supabase está en modo dev)
 * 
 * 
 * PASO 5: Pruebas Funcionales
 * ============================
 * 
 * Test 1: Flujo Completo
 * - Usuario nuevo con email válido
 * - Enviar reset
 * - Abrir email → click link
 * - Cambiar contraseña
 * - Login con nueva contraseña ✅
 * 
 * Test 2: Validaciones
 * - Email vacío → Error
 * - Email inválido → Error
 * - Contraseña < 8 chars → Error
 * - Contraseñas no coinciden → Error
 * - Sin mayúscula/número → Error
 * 
 * Test 3: Manejo de Errores
 * - Link expirado (> 24h) → Error específico
 * - Usuario no encontrado → Error
 * - Red desconectada → Error
 * 
 * Test 4: UX
 * - Modal abre y cierra ✅
 * - Botón deshabilitado durante loading ✅
 * - Mensajes de éxito/error claros ✅
 * - Auto-redirect en 2s después de éxito ✅
 * 
 * 
 * PASO 6: Troubleshooting
 * ======================
 * 
 * "Email rate limit exceeded"
 * → Usuario intentó demasiadas veces en poco tiempo
 * → Esperar 15-60 minutos
 * 
 * "User not found"
 * → Email no existe en base de datos
 * → Crear usuario primero o registro
 * 
 * "Invalid grant"
 * → Token/sesión expirada
 * → Solicitar nuevo email de reset
 * 
 * "Link not working"
 * → Verificar que app.json tiene "scheme": "consorcio"
 * → Verificar email template en Supabase
 * → Para web: verificar CORS en Supabase
 * 
 * "No email recibido"
 * → Revisar SPAM
 * → Verificar que Supabase Email está habilitado
 * → Verificar que el email del usuario existe
 * 
 * 
 * CÓDIGO RELEVANTE
 * ================
 * 
 * Servicios:
 * - src/services/auth.js (sendPasswordRecoveryEmail, updatePassword)
 * 
 * Componentes:
 * - src/components/PasswordRecoveryModal.jsx
 * - src/components/PasswordStrengthIndicator.jsx
 * 
 * Páginas:
 * - src/pages/LoginScreen.jsx (modificada)
 * - src/pages/ResetPasswordScreen.jsx (nueva)
 * 
 * Rutas:
 * - app/reset-password.jsx (nueva)
 * 
 * 
 * INSTALACIÓN DE DEPENDENCIAS
 * ===========================
 * Las siguientes están ya en package.json:
 * - @supabase/supabase-js ✅
 * - expo-router ✅
 * - react-native ✅
 * 
 * No se requieren nuevas instalaciones.
 * 
 */
