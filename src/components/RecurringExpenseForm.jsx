import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { createRecurringExpense, getRecurringExpenses } from '../services/recurringExpenses'
import EditRecurringExpenseModal from './EditRecurringExpenseModal'
import { COLORS } from '../constants/colors'

const CATEGORIES = [
  { id: 'Reparaciones', icon: 'build-outline', color: '#81c784' },
  { id: 'Servicios', icon: 'bulb-outline', color: '#64b5f6' },
  { id: 'Limpieza', icon: 'leaf-outline', color: '#aed581' },
  { id: 'Seguridad', icon: 'lock-closed-outline', color: '#ffb74d' },
  { id: 'Otros', icon: 'cube-outline', color: '#a1887f' }
]

export default function RecurringExpenseForm({ groupId, onSuccess = null }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('Otros')
  const [description, setDescription] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [isMarked, setIsMarked] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [recurringExpensesList, setRecurringExpensesList] = useState([])
  const [editingExpense, setEditingExpense] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Load recurring expenses when modal opens
  useEffect(() => {
    if (groupId && isMarked) {
      loadRecurringExpenses()
    }
  }, [groupId, isMarked])

  async function loadRecurringExpenses() {
    try {
      const expenses = await getRecurringExpenses(groupId)
      setRecurringExpensesList(expenses)
    } catch (err) {
      console.error('Error loading recurring expenses:', err)
    }
  }

  function validateForm() {
    setError('')

    if (!name.trim()) {
      setError('El nombre del gasto es requerido')
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

  async function handleSaveAsRecurring() {
    if (!validateForm()) return

    if (!isMarked) {
      setError('Debes marcar el checkbox para guardar como recurrente')
      return
    }

    setLoading(true)
    try {
      const parsedAmount = parseFloat(amount.replace(',', '.'))
      await createRecurringExpense({
        group_id: groupId,
        name: name.trim(),
        amount: parsedAmount,
        category_id: categoryId,
        description: description.trim() || null,
        frequency: 'monthly',
      })

      setSuccess(true)
      // Clear form after success
      clearForm()

      // Reload list
      loadRecurringExpenses()

      // Call callback if provided
      if (onSuccess) {
        onSuccess()
      }

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Error saving recurring expense:', err)
      setError(err.message || 'Error al guardar el gasto recurrente')
    } finally {
      setLoading(false)
    }
  }

  function clearForm() {
    setName('')
    setAmount('')
    setCategoryId('Otros')
    setDescription('')
    setIsRecurring(false)
    setIsMarked(false)
    setError('')
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Success Message */}
      {success && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.successText}>Gasto recurrente guardado ✓</Text>
        </View>
      )}

      {/* Error Message */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Form Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>CREAR GASTO RECURRENTE</Text>

        {/* Nombre */}
        <Text style={styles.label}>Nombre del gasto *</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Ej: Abono limpieza, Mantenimiento..."
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            maxLength={100}
          />
        </View>

        {/* Monto */}
        <Text style={styles.label}>Monto ($) *</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.currencyPrefix}>$</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#999"
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Categoría */}
        <Text style={styles.label}>Categoría *</Text>
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

        {/* Descripción */}
        <Text style={styles.label}>Descripción (opcional)</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Notas adicionales sobre este gasto..."
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={300}
            textAlignVertical="top"
          />
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setIsMarked(!isMarked)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isMarked ? 'checkbox' : 'square-outline'}
            size={22}
            color={COLORS.primary}
          />
          <View style={styles.checkboxLabel}>
            <Text style={styles.checkboxText}>Marcar como recurrente</Text>
            <Text style={styles.checkboxSub}>
              Podrás seleccionar este gasto cuando cargues nuevos gastos
            </Text>
          </View>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSaveAsRecurring}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Guardar como recurrente</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Recurring Expenses List */}
      {recurringExpensesList.length > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>GASTOS RECURRENTES GUARDADOS</Text>

          {recurringExpensesList.map((expense) => {
            const category = CATEGORIES.find((c) => c.id === expense.category_id)
            return (
              <View key={expense.id} style={styles.listItem}>
                <View style={[styles.listItemIcon, { backgroundColor: (category?.color || '#999') + '1A' }]}>
                  <Ionicons
                    name={category?.icon || 'cube-outline'}
                    size={18}
                    color={category?.color || '#999'}
                  />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemName}>{expense.name}</Text>
                  {expense.description && (
                    <Text style={styles.listItemDesc}>{expense.description}</Text>
                  )}
                  <Text style={styles.listItemMeta}>{expense.frequency}</Text>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={styles.listItemAmount}>${expense.amount.toFixed(2)}</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => {
                      setEditingExpense(expense)
                      setShowEditModal(true)
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {/* Edit Modal */}
      <EditRecurringExpenseModal
        visible={showEditModal}
        expense={editingExpense}
        onClose={() => {
          setShowEditModal(false)
          setEditingExpense(null)
        }}
        onSuccess={() => {
          setSuccess(true)
          loadRecurringExpenses()
          setTimeout(() => setSuccess(false), 3000)
        }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  successText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
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

  formSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
    letterSpacing: 0.5,
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

  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
  },

  checkboxLabel: {
    marginLeft: 12,
    flex: 1,
  },

  checkboxText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },

  checkboxSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexDirection: 'row',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  listSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface2,
  },

  listItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  listItemContent: {
    flex: 1,
  },

  listItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },

  listItemDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },

  listItemMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },

  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },

  listItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
    minWidth: 60,
    textAlign: 'right',
  },

  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
