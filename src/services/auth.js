import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../api/api'
import { supabase } from './supabase'

export async function logout() {
  try {
    await api.post('/auth/logout')
  } catch {
    // Si falla en el servidor igual limpiamos local
  } finally {
    await AsyncStorage.multiRemove(['token', 'refreshToken'])
  }
}

/**
 * Envía un enlace de recuperación de contraseña al email proporcionado
 * @param {string} email - Email del usuario
 * @returns {Promise<void>}
 */
export async function sendPasswordRecoveryEmail(email) {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getResetPasswordURL()}`
  })

  if (error) {
    throw error
  }
}

/**
 * Actualiza la contraseña del usuario autenticado
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<void>}
 */
export async function updatePassword(newPassword) {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    throw error
  }
}

/**
 * Obtiene la URL base para los enlaces de reset de contraseña
 * Detecta si es web o mobile/native
 */
function getResetPasswordURL() {
  // Para web
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/reset-password`
  }
  // Para mobile/native (usar el deep link de la app)
  return 'consorcio://reset-password'
}
