import { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getMembersWithBalance } from '../services/group'
import { supabase } from '../services/supabase'
import { COLORS } from '../constants/colors'
import MoraBadge from './MoraBadge'

export default function PartnersList({ refreshing, onRefresh }) {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPartners()
  }, [])

  useEffect(() => {
    if (refreshing) loadPartners()
  }, [refreshing])

  async function loadPartners() {
    try {
      setError('')
      setLoading(true)
      const groupId = await AsyncStorage.getItem('groupId')
      if (!groupId) throw new Error('No hay consorcio seleccionado.')
      let data = await getMembersWithBalance(groupId)

      // Enriquecer cada partner con información de mora
      const partnersWithMora = await Promise.all(
        data.map(async (partner) => {
          const { lastPaymentDate } = await getPartnerMoraInfo(partner.user_id, groupId)
          const is_mora = calculateMoraStatus(partner, lastPaymentDate)

          return {
            ...partner,
            payment_date: lastPaymentDate,
            is_mora,
          }
        })
      )

      // Ordenar partners
      const sortedPartners = orderPartners(partnersWithMora)
      setPartners(sortedPartners)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los socios.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Obtiene información de mora (último payment_date) para un partner
   * desde la tabla expense_splits en Supabase
   */
  async function getPartnerMoraInfo(userId, groupId) {
    try {
      if (!supabase) {
        console.warn('Supabase no está configurado')
        return { lastPaymentDate: null, totalDebt: 0 }
      }

      // Obtener los expense_splits del partner que están asociados a expenses del grupo
      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('id')
        .eq('group_id', groupId)

      if (expenseError) {
        console.warn('Error fetching expenses:', expenseError)
        return { lastPaymentDate: null, totalDebt: 0 }
      }

      if (!expenses || expenses.length === 0) {
        return { lastPaymentDate: null, totalDebt: 0 }
      }

      const expenseIds = expenses.map((e) => e.id)

      // Obtener expense_splits del partner
      const { data: splits, error: splitsError } = await supabase
        .from('expense_splits')
        .select('payment_date, amount, paid_amount')
        .eq('user_id', userId)
        .in('expense_id', expenseIds)
        .order('payment_date', { ascending: false })

      if (splitsError) {
        console.warn('Error fetching expense_splits:', splitsError)
        return { lastPaymentDate: null, totalDebt: 0 }
      }

      if (!splits || splits.length === 0) {
        return { lastPaymentDate: null, totalDebt: 0 }
      }

      // El payment_date más reciente es el primero (por order)
      const lastPaymentDate = splits.length > 0 ? splits[0].payment_date : null

      // Calcular deuda total (sum de amount - paid_amount para positivos)
      const totalDebt = splits.reduce((sum, split) => {
        const owed = parseFloat(split.amount) - parseFloat(split.paid_amount)
        return sum + (owed > 0 ? owed : 0)
      }, 0)

      return { lastPaymentDate, totalDebt }
    } catch (err) {
      console.warn('Error en getPartnerMoraInfo:', err)
      return { lastPaymentDate: null, totalDebt: 0 }
    }
  }

  /**
   * Calcula si un partner está en MORA
   * Criterios:
   * - Tiene deuda (net_balance < 0)
   * - La deuda tiene más de 30 días sin pagar
   */
  function calculateMoraStatus(partner, lastPaymentDate) {
    const netBalance = parseFloat(partner.net_balance)

    // No está en mora si no debe
    if (isNaN(netBalance) || netBalance >= -0.009) {
      return false
    }

    // No está en mora si no hay payment_date
    if (!lastPaymentDate) {
      return false
    }

    try {
      const paymentDate = new Date(lastPaymentDate)
      const today = new Date()

      today.setHours(0, 0, 0, 0)
      paymentDate.setHours(0, 0, 0, 0)

      const daysSincePayment = Math.floor((today - paymentDate) / (1000 * 60 * 60 * 24))

      return daysSincePayment > 30
    } catch (err) {
      console.warn('Error calculating mora status:', err)
      return false
    }
  }

  /**
   * Ordena los partners según:
   * 1. En mora (primero)
   * 2. Debe pero sin mora (segundo)
   * 3. Al día (tercero)
   * 4. Cobra (último)
   */
  function orderPartners(partnersList) {
    return partnersList.sort((a, b) => {
      const aBalance = parseFloat(a.net_balance)
      const bBalance = parseFloat(b.net_balance)
      const aMora = a.is_mora ? 1 : 0
      const bMora = b.is_mora ? 1 : 0

      // Primero, mora antes que no mora
      if (aMora !== bMora) {
        return bMora - aMora // descending (mora primero)
      }

      // Si ambos están o no en mora, ordenar por estado económico
      // Debe < Al día < Cobra (de izquierda a derecha en valor)
      const aOwes = aBalance < -0.009 ? 1 : 0
      const bOwes = bBalance < -0.009 ? 1 : 0

      if (aOwes !== bOwes) {
        return bOwes - aOwes // debe primero
      }

      // Si ambos deben (o ambos están al día/cobran), mantener orden alfabético
      return (a.full_name || '').localeCompare(b.full_name || '')
    })
  }

  function getStatusColor(netBalance) {
    const n = parseFloat(netBalance)
    if (isNaN(n)) return COLORS.textMuted
    if (n > 0.009) return '#1976D2'
    if (n < -0.009) return COLORS.error
    return COLORS.success
  }

  function getStatusLabel(netBalance) {
    const n = parseFloat(netBalance)
    if (isNaN(n)) return 'Sin información'
    if (n > 0.009) return `A favor $${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (n < -0.009) return `Debe $${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    return 'Al día'
  }

  function getStatusIcon(netBalance) {
    const n = parseFloat(netBalance)
    if (isNaN(n)) return '–'
    if (n > 0.009) return '↓'
    if (n < -0.009) {
      // Mostrar urgencia según el monto adeudado
      const absBalance = Math.abs(n)
      if (absBalance > 1000) return '‼️'
      if (absBalance > 100) return '⚠️'
      return '⚡'
    }
    return '✓'
  }

  function getStatusSeverity(netBalance) {
    const n = parseFloat(netBalance)
    if (isNaN(n) || n >= -0.009) return null
    const absBalance = Math.abs(n)
    if (absBalance > 1000) return 'critical'
    if (absBalance > 100) return 'moderate'
    return 'light'
  }

  function renderPartner({ item }) {
    const color = getStatusColor(item.net_balance)
    const label = getStatusLabel(item.net_balance)
    const icon = getStatusIcon(item.net_balance)

    return (
      <View style={[styles.partnerRow, { borderLeftColor: item.is_mora ? '#d32f2f' : color }]}>
        <View style={styles.partnerInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.partnerName}>{item.full_name ?? 'Usuario'}</Text>
            <MoraBadge
              monto_adeudado={item.net_balance}
              payment_date={item.payment_date}
              estado_economico={item.is_mora}
            />
          </View>
          <Text style={styles.partnerMeta}>{item.role} · {item.m2} M²</Text>
          <Text style={[styles.balanceText, { color }]}>{label}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.is_mora ? '#d32f2f' : color }]}>
          <Text style={styles.statusText}>{item.is_mora ? '⚠️' : icon}</Text>
        </View>
      </View>
    )
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando socios...</Text>
      </View>
    )
  }

  if (error && partners.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={partners}
      keyExtractor={(item) => String(item.user_id)}
      renderItem={renderPartner}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay socios disponibles</Text>
        </View>
      }
      scrollEnabled={false}
    />
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  partnerInfo: {
    flex: 1,
    marginRight: 12,
    gap: 3,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  partnerMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  balanceText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
})
