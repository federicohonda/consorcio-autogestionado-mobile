import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { rejectPayment } from '../services/payments'
import { COLORS } from '../constants/colors'

export default function RejectPaymentModal({
  visible,
  groupId = null,
  payment = null,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleReject() {
    setError('')

    if (!reason.trim()) {
      setError('Debes ingresar un motivo del rechazo')
      return
    }

    if (!groupId || !payment) {
      setError('Datos incompletos')
      return
    }

    setLoading(true)
    try {
      await rejectPayment(groupId, payment.id, reason.trim())
      onSuccess()
      setReason('')
      onClose()
    } catch (err) {
      console.error('Error rejecting payment:', err)
      const errorMsg = err.response?.data?.detail || 'Error al rechazar el pago'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Rechazar pago</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            {payment && (
              <View style={styles.paymentInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Titular</Text>
                  <Text style={styles.infoValue}>{payment.full_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Monto</Text>
                  <Text style={styles.infoValue}>
                    ${payment.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <Text style={styles.label}>Motivo del rechazo *</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textarea}
                placeholder="Ej: Monto incorrecto, Comprobante ilegible, Ya fue registrado, etc."
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>

            <Text style={styles.helperText}>
              El titular recibirá notificación de este rechazo junto con el motivo.
            </Text>

            {/* Buttons */}
            <TouchableOpacity
              style={[styles.button, styles.buttonDanger, loading && styles.buttonDisabled]}
              onPress={handleReject}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Rechazar pago</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: COLORS.primary }]}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  paymentInfo: {
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  error: {
    backgroundColor: COLORS.errorLight,
    color: COLORS.error,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  inputWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    marginBottom: 12,
  },

  textarea: {
    fontSize: 14,
    color: COLORS.textPrimary,
    padding: 0,
    minHeight: 100,
  },

  helperText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 16,
    fontStyle: 'italic',
  },

  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonDanger: {
    backgroundColor: COLORS.error,
  },

  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
})
