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
import { COLORS } from '../constants/colors'

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
      const data = await getMembersWithBalance(groupId)
      setPartners(data)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los socios.')
    } finally {
      setLoading(false)
    }
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
    const severity = getStatusSeverity(item.net_balance)
    
    // Agregar borde extra si está en mora crítica
    const extraBorderWidth = severity === 'critical' ? 2 : 0
    const extraBorderColor = severity === 'critical' ? '#D32F2F' : 'transparent'

    return (
      <View
        style={[
          styles.partnerRow,
          { borderLeftColor: color },
          extraBorderWidth > 0 && { borderWidth: extraBorderWidth, borderColor: extraBorderColor }
        ]}
      >
        <View style={styles.partnerInfo}>
          <Text style={styles.partnerName}>{item.full_name ?? 'Usuario'}</Text>
          <Text style={styles.partnerMeta}>{item.role} · {item.m2} M²</Text>
          <Text style={[styles.balanceText, { color }]}>{label}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: color }]}>
          <Text style={styles.statusText}>{icon}</Text>
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
