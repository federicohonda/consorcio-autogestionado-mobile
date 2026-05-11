import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { updateRecurringExpense, deactivateRecurringExpense, deleteRecurringExpense } from '../services/recurringExpenses'
import { COLORS } from '../constants/colors'

const CATEGORIES = [
  { id: 'Reparaciones', icon: 'build-outline', color: '#81c784' },
  { id: 'Servicios', icon: 'bulb-outline', color: '#64b5f6' },
  { id: 'Limpieza', icon: 'leaf-outline', color: '#aed581' },
  { id: 'Seguridad', icon: 'lock-closed-outline', color: '#ffb74d' },
  { id: 'Otros', icon: 'cube-outline', color: '#a1887f' }
]

export default function EditRecurringExpenseModal({
  visible,
  expense = null,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const [name, setName] = useState(expense?.name || '')
  const [amount, setAmount] = useState(expense?.amount?.toString() || '')
  const [categoryId, setCategoryId] = useState(expense?.category_id || 'Otros')
  const [description, setDescription] = useState(expense?.description || '')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Update form when expense changes
  if (visible && expense && name !== expense.name) {
    setName(expense.name)
    setAmount(expense.amount.toString())
    setCategoryId(expense.category_id)
    setDescription(expense.description || '')
    setError('')
  }

  function validateForm() {
    setError('')

    if (!name.trim()) {
      setError('El nombre es requerido')
      return false
    }

    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('El monto debe ser mayor a 0')
      return false
    }

    if (!categoryId) {
      setError('Debes seleccionar una categoría')
      return false
    }

    return true
  }

  async function handleUpdate() {
    if (!validateForm() || !expense) return

    setLoading(true)
    try {
      const parsedAmount = parseFloat(amount.replace(',', '.'))
      await updateRecurringExpense(expense.id, {
        name: name.trim(),
        amount: parsedAmount,
        category_id: categoryId,
        description: description.trim() || null,
      })

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error updating expense:', err)
      setError(err.message || 'Error al actualizar el gasto')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate() {
    if (!expense) return

    Alert.alert(
      'Desactivar gasto',
      `¿Estás seguro que querés desactivar "${expense.name}"? Ya no aparecerá en la lista de gastos recurrentes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            try {
              await deactivateRecurringExpense(expense.id)
              onSuccess()
              onClose()
            } catch (err) {
              console.error('Error deactivating expense:', err)
              setError('Error al desactivar el gasto')
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  async function handleDelete() {
    if (!expense) return

    Alert.alert(
      'Eliminar gasto',
      `¿Estás seguro que querés eliminar "${expense.name}" permanentemente? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            try {
              await deleteRecurringExpense(expense.id)
              onSuccess()
              onClose()
            } catch (err) {
              console.error('Error deleting expense:', err)
              setError('Error al eliminar el gasto')
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
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
            <Text style={styles.title}>Editar gasto recurrente</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {error && <Text style={styles.error}>{error}</Text>}

            <Text style={styles.label}>Nombre</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Nombre del gasto"
                value={name}
                onChangeText={setName}
                maxLength={100}
                editable={!loading}
              />
            </View>

            <Text style={styles.label}>Monto ($)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>

            <Text style={styles.label}>Categoría</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    categoryId === cat.id && {
                      borderColor: cat.color,
                      backgroundColor: cat.color + '1A',
                    },
                  ]}
                  onPress={() => setCategoryId(cat.id)}
                  disabled={loading}
                >
                  <Ionicons name={cat.icon} size={16} color={cat.color} />
                  <Text
                    style={[
                      styles.categoryText,
                      categoryId === cat.id && {
                        color: cat.color,
                        fontWeight: 'bold',
                      },
                    ]}
                  >
                    {cat.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Descripción (opcional)</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Notas adicionales..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={300}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>

            <View style={styles.divider} />

            {/* Buttons */}
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
              onPress={handleUpdate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Guardar cambios</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonWarn]}
              onPress={handleDeactivate}
              disabled={loading}
            >
              <Ionicons name="eye-off-outline" size={18} color={COLORS.warn} />
              <Text style={[styles.buttonText, { color: COLORS.warn }]}>Desactivar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={handleDelete}
              disabled={loading}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              <Text style={[styles.buttonText, { color: COLORS.error }]}>Eliminar</Text>
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
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    marginBottom: 12,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    padding: 0,
  },

  textarea: {
    height: 80,
    paddingVertical: 8,
  },

  currencyPrefix: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: 4,
    marginTop: 2,
  },

  categoryScroll: {
    paddingVertical: 8,
    marginBottom: 12,
  },

  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },

  categoryText: {
    fontSize: 12,
    marginLeft: 4,
    color: COLORS.textSecondary,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
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

  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },

  buttonWarn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warn,
  },

  buttonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.error,
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
