import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { updatePassword } from '../services/auth'
import PasswordStrengthIndicator, { evaluatePasswordStrength } from '../components/PasswordStrengthIndicator'
import { COLORS } from '../constants/colors'

export default function ResetPasswordScreen() {
  const router = useRouter()
  const searchParams = useLocalSearchParams()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Validar que tenemos el token
  useEffect(() => {
    const code = searchParams?.code
    const type = searchParams?.type

    if (!code || type !== 'recovery') {
      setError('El enlace para restablecer ha expirado o no es válido. Intenta de nuevo.')
    }
  }, [searchParams])

  function validatePasswords() {
    if (!newPassword) {
      return 'Ingresá una contraseña'
    }

    if (newPassword.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres'
    }

    if (!/[A-Z]/.test(newPassword)) {
      return 'La contraseña debe contener al menos una mayúscula'
    }

    if (!/[0-9]/.test(newPassword)) {
      return 'La contraseña debe contener al menos un número'
    }

    if (newPassword !== confirmPassword) {
      return 'Las contraseñas no coinciden'
    }

    return null
  }

  async function handleChangePassword() {
    setError('')
    setSuccess(false)

    const validationError = validatePasswords()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      await updatePassword(newPassword)
      setSuccess(true)
      setSuccessMessage('✅ Contraseña actualizada correctamente')

      // Redirigir a login después de 2 segundos
      setTimeout(() => {
        router.replace('/login')
      }, 2000)
    } catch (err) {
      const errorMessage = err.message || 'Error desconocido'

      // Manejo de errores específicos
      if (errorMessage.includes('session_not_found') || errorMessage.includes('invalid_grant')) {
        setError('El enlace para restablecer ha expirado. Intenta de nuevo.')
      } else if (errorMessage.includes('same as old password')) {
        setError('La nueva contraseña no puede ser igual a la anterior')
      } else {
        setError(errorMessage || 'No se pudo actualizar la contraseña. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = evaluatePasswordStrength(newPassword)

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <View style={styles.heroIconWrapper}>
          <Ionicons name="lock-outline" size={42} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Restablecer Contraseña</Text>
        <Text style={styles.heroTagline}>Crea una nueva contraseña segura</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {error && error.includes('expirado') ? (
            <View style={styles.expiredContainer}>
              <Ionicons name="alert-circle" size={48} color={COLORS.error} />
              <Text style={styles.expiredTitle}>Enlace Expirado</Text>
              <Text style={styles.expiredText}>{error}</Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.buttonText}>Volver al Login</Text>
              </TouchableOpacity>
            </View>
          ) : success ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              <Text style={styles.successTitle}>{successMessage}</Text>
              <Text style={styles.successText}>
                Serás redirigido al login en unos segundos...
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.description}>
                Ingresá una contraseña fuerte para tu cuenta
              </Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {/* Nueva Contraseña */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nueva Contraseña</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={COLORS.textMuted}
                    style={styles.leftIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor={COLORS.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.rightIconButton}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Indicador de Fortaleza */}
              {newPassword ? (
                <PasswordStrengthIndicator password={newPassword} />
              ) : null}

              {/* Confirmar Contraseña */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmar Contraseña</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={COLORS.textMuted}
                    style={styles.leftIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Repite tu contraseña"
                    placeholderTextColor={COLORS.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.rightIconButton}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botón Cambiar Contraseña */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={loading || !passwordStrength.isValid}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>Cambiar Contraseña</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.replace('/login')}
                disabled={loading}
              >
                <Text style={styles.cancelText}>Volver al Login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: 64,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 8
  },
  heroIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3
  },
  heroTagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.3
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center'
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 20,
    lineHeight: 20
  },
  expiredContainer: {
    alignItems: 'center',
    paddingVertical: 20
  },
  expiredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 8
  },
  expiredText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
    marginTop: 12,
    marginBottom: 8
  },
  successText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginLeft: 4
  },
  inputWrapper: {
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12
  },
  leftIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingVertical: 0
  },
  rightIconButton: {
    paddingLeft: 8,
    paddingVertical: 4
  },
  error: {
    color: COLORS.error,
    backgroundColor: COLORS.errorLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 16,
    overflow: 'hidden'
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12
  }
})
