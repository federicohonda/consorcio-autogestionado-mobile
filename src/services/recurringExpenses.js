import { supabase } from './supabase'

/**
 * Obtiene todos los gastos recurrentes activos de un grupo
 * @param {number} groupId - ID del grupo
 * @returns {Promise<Array>} - Array de gastos recurrentes
 */
export async function getRecurringExpenses(groupId) {
  try {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching recurring expenses:', err)
    throw err
  }
}

/**
 * Obtiene un gasto recurrente específico por ID
 * @param {number} recurringExpenseId - ID del gasto recurrente
 * @returns {Promise<Object>} - Objeto del gasto recurrente
 */
export async function getRecurringExpenseById(recurringExpenseId) {
  try {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('id', recurringExpenseId)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error fetching recurring expense:', err)
    throw err
  }
}

/**
 * Crea un nuevo gasto recurrente
 * @param {Object} expenseData - Datos del gasto recurrente
 * @returns {Promise<Object>} - El gasto creado
 */
export async function createRecurringExpense(expenseData) {
  try {
    const {
      group_id,
      name,
      amount,
      category_id,
      description = null,
      frequency = 'monthly',
    } = expenseData

    // Validar datos
    if (!group_id || !name || amount === undefined || !category_id) {
      throw new Error('Faltan datos requeridos para crear el gasto recurrente')
    }

    if (amount <= 0) {
      throw new Error('El monto debe ser mayor a 0')
    }

    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert([
        {
          group_id,
          name: name.trim(),
          amount: parseFloat(amount),
          category_id,
          description: description ? description.trim() : null,
          frequency,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error creating recurring expense:', err)
    throw err
  }
}

/**
 * Actualiza un gasto recurrente
 * @param {number} id - ID del gasto recurrente
 * @param {Object} updates - Datos a actualizar
 * @returns {Promise<Object>} - El gasto actualizado
 */
export async function updateRecurringExpense(id, updates) {
  try {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error updating recurring expense:', err)
    throw err
  }
}

/**
 * Desactiva un gasto recurrente (soft delete)
 * @param {number} id - ID del gasto recurrente
 * @returns {Promise<Object>} - El gasto desactivado
 */
export async function deactivateRecurringExpense(id) {
  return updateRecurringExpense(id, { is_active: false })
}

/**
 * Elimina un gasto recurrente
 * @param {number} id - ID del gasto recurrente
 * @returns {Promise<void>}
 */
export async function deleteRecurringExpense(id) {
  try {
    const { error } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (err) {
    console.error('Error deleting recurring expense:', err)
    throw err
  }
}
