import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Platform
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { sendPasswordRecoveryEmail } from '../services/auth'
import { COLORS } from '../constants/colors'

export default function PasswordRecoveryModal({ visible, onClose }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!visible) {
      // Reset form when modal closes
      setEmail('')
      setError('')
      setSuccess(false)
      setSuccessMessage('')
    }
  }, [visible])

  function validateEmail(emailValue) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(emailValue)
  }

  async function handleSendRecoveryEmail() {
    setError('')
    setSuccess(false)

    // Validation
    if (!email.trim()) {
      setError('El email es obligatorio')
      return
    }

    if (!validateEmail(email.trim())) {
      setError('Ingresá un email válido')
      return
    }

    setLoading(true)
    try {
      await sendPasswordRecoveryEmail(email.trim())
      setSuccess(true)
      setSuccessMessage('Revisa tu email para restablecer tu contraseña')
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      const errorMessage = err.message || 'Error desconocido'
      
      // Supabase specific error handling
      if (errorMessage.includes('Email rate limit exceeded')) {
        setError('Intentaste demasiadas veces. Aguardá unos minutos.')
      } else if (errorMessage.includes('User not found')) {
        setError('No encontramos una cuenta con ese email')
      } else {
        setError(errorMessage || 'No se pudo enviar el email. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Recuperar Contraseña</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {success ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              </View>
              <Text style={styles.successMessage}>{successMessage}</Text>
              <Text style={styles.successSubtext}>
                Presioná el enlace del email para restablecer tu contraseña.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.description}>
                Te enviaremos un enlace para restablecer tu contraseña
              </Text>

              {error ? (
                <Text style={styles.error}>{error}</Text>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color={COLORS.textMuted} 
                    style={styles.leftIcon} 
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="tu@email.com"
                    placeholderTextColor={COLORS.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendRecoveryEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Enviar enlace de recuperación</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 20,
    lineHeight: 20
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20
  },
  successIcon: {
    marginBottom: 16
  },
  successMessage: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8
  },
  successSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: 20
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
    marginBottom: 12
  },
  buttonDisabled: {
    opacity: 0.7
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
