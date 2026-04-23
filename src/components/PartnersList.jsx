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
import { supabase } from '../services/supabase'
import { COLORS } from '../constants/colors'

export default function PartnersList({ refreshing, onRefresh }) {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPartners()
  }, [])

  async function loadPartners() {
    try {
      setError('')
      setLoading(true)

      if (!supabase) {
        throw new Error(
          'Supabase no está configurado. Verifica que las variables de entorno EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY estén definidas.'
        )
      }

      // Obtener el groupId actual del usuario
      const groupId = await AsyncStorage.getItem('groupId')
      
      if (!groupId) {
        throw new Error('No hay consorcio seleccionado.')
      }

      // Consultar socios del grupo actual, filtrados por group_id
      const { data, error: fetchError } = await supabase
        .from('socios_con_estado')
        .select('*')
        .eq('group_id', groupId)
        .order('nombre', { ascending: true })

      if (fetchError) throw fetchError

      setPartners(data || [])
    } catch (err) {
      setError(
        err.message || 'No se pudieron cargar los socios. Verifica tu conexión.'
      )
      console.error('Error loading partners:', err)
    } finally {
      setLoading(false)
    }
  }

  function getStatusColor(estado, montoAdeudado, montoACobrar) {
    if (!estado) return COLORS.textMuted

    const text = String(estado).toLowerCase().trim()

    if (text === 'al_dia' || text === 'al día' || text === 'al dia') {
      return COLORS.success // Verde
    }
    if (text === 'debe') {
      return COLORS.error // Rojo
    }
    if (text === 'cobra' || (montoACobrar && parseFloat(montoACobrar) > 0)) {
      return '#1976D2' // Azul
    }

    return COLORS.textMuted
  }

  function formatStatusText(estado, montoAdeudado, montoACobrar) {
    if (!estado) return 'Sin información'

    const text = String(estado).toLowerCase().trim()
    const debe = parseFloat(montoAdeudado || 0)
    const cobra = parseFloat(montoACobrar || 0)

    if (text === 'al_dia' || text === 'al día' || text === 'al dia') {
      return 'Al día'
    }
    if (text === 'debe' && debe > 0) {
      return `Debe $${debe.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    if ((text === 'cobra' || cobra > 0) && cobra > 0) {
      return `Cobra $${cobra.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    return 'Sin información'
  }

  function getStatusIcon(estado, montoAdeudado, montoACobrar) {
    if (!estado) return '–'

    const text = String(estado).toLowerCase().trim()
    const debe = parseFloat(montoAdeudado || 0)
    const cobra = parseFloat(montoACobrar || 0)

    if (text === 'al_dia' || text === 'al día' || text === 'al dia') {
      return '✓'
    }
    if (text === 'debe' && debe > 0) {
      return '↑'
    }
    if ((text === 'cobra' || cobra > 0) && cobra > 0) {
      return '↓'
    }

    return '–'
  }

  function renderPartner({ item }) {
    const statusColor = getStatusColor(
      item.estado_economico,
      item.monto_adeudado,
      item.monto_a_cobrar
    )
    const statusText = formatStatusText(
      item.estado_economico,
      item.monto_adeudado,
      item.monto_a_cobrar
    )
    const icon = getStatusIcon(
      item.estado_economico,
      item.monto_adeudado,
      item.monto_a_cobrar
    )

    return (
      <View style={styles.partnerRow}>
        <View style={styles.partnerInfo}>
          <Text style={styles.partnerName}>{item.nombre}</Text>
          {item.email && <Text style={styles.partnerEmail}>{item.email}</Text>}
          <Text style={[styles.balanceText, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
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
      keyExtractor={(item) => String(item.id)}
      renderItem={renderPartner}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
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
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  partnerEmail: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  balanceText: {
    fontSize: 13,
    fontWeight: '600',
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
    color: COLORS.white,
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
