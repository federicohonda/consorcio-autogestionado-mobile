import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getRecurringExpenses } from '../services/recurringExpenses'
import { COLORS } from '../constants/colors'

const CATEGORIES = [
  { id: 'Reparaciones', icon: 'build-outline', color: '#81c784' },
  { id: 'Servicios', icon: 'bulb-outline', color: '#64b5f6' },
  { id: 'Limpieza', icon: 'leaf-outline', color: '#aed581' },
  { id: 'Seguridad', icon: 'lock-closed-outline', color: '#ffb74d' },
  { id: 'Otros', icon: 'cube-outline', color: '#a1887f' }
]

export default function RecurringExpenseSelector({
  groupId,
  onSelect,
  selectedExpense = null,
  placeholder = 'Seleccionar gasto recurrente...',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (groupId) {
      loadRecurringExpenses()
    }
  }, [groupId, isOpen])

  async function loadRecurringExpenses() {
    setLoading(true)
    setError('')
    try {
      const expenses = await getRecurringExpenses(groupId)
      setRecurringExpenses(expenses)
    } catch (err) {
      console.error('Error loading recurring expenses:', err)
      setError('No se pudieron cargar los gastos recurrentes')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryIcon = (categoryId) => {
    const category = CATEGORIES.find(c => c.id === categoryId)
    return category || CATEGORIES[CATEGORIES.length - 1]
  }

  const handleSelectExpense = (expense) => {
    onSelect({
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      category_id: expense.category_id,
      description: expense.description,
    })
    setIsOpen(false)
  }

  const handleSelectNewExpense = () => {
    onSelect(null)
    setIsOpen(false)
  }

  const selectedLabel = selectedExpense
    ? `${selectedExpense.name} • $${selectedExpense.amount.toFixed(2)}`
    : placeholder

  return (
    <View>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.triggerContent}>
          <Text
            style={[
              styles.triggerText,
              !selectedExpense && styles.triggerPlaceholder,
            ]}
            numberOfLines={1}
          >
            {selectedLabel}
          </Text>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textSecondary}
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar gasto</Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Options */}
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : error ? (
              <View style={styles.centerContainer}>
                <Ionicons name="alert-circle" size={40} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <FlatList
                data={recurringExpenses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                  const category = getCategoryIcon(item.category_id)
                  return (
                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={() => handleSelectExpense(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionIcon}>
                        <Ionicons
                          name={category.icon}
                          size={20}
                          color={category.color}
                        />
                      </View>
                      <View style={styles.optionContent}>
                        <Text style={styles.optionName}>{item.name}</Text>
                        {item.description && (
                          <Text style={styles.optionDescription}>
                            {item.description}
                          </Text>
                        )}
                      </View>
                      <View style={styles.optionAmount}>
                        <Text style={styles.optionAmountText}>
                          ${item.amount.toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                }}
                contentContainerStyle={styles.optionsList}
                scrollEnabled={recurringExpenses.length > 5}
                nestedScrollEnabled={true}
              />
            )}

            {/* Divider */}
            {!loading && !error && recurringExpenses.length > 0 && (
              <View style={styles.divider} />
            )}

            {/* New Expense Option */}
            <TouchableOpacity
              style={styles.newExpenseOption}
              onPress={handleSelectNewExpense}
              activeOpacity={0.7}
            >
              <View style={styles.newExpenseIcon}>
                <Ionicons name="add-circle" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.newExpenseText}>Cargar nuevo gasto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
  },
  triggerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triggerText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  triggerPlaceholder: {
    color: COLORS.textMuted,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  centerContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
  },

  optionsList: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface2,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  optionAmount: {
    marginLeft: 8,
  },
  optionAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },

  newExpenseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  newExpenseIcon: {
    marginRight: 12,
  },
  newExpenseText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
})
