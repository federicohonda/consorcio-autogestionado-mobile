import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../constants/colors'

/**
 * DelinquencyAlert - Componente para mostrar alertas de socios en mora
 * 
 * Props:
 * - delinquent: array de socios con balance negativo
 * - onDismiss: callback cuando se cierra la alerta
 * - isExpanded: boolean controlado externamente
 */
export default function DelinquencyAlert({ delinquent = [], onDismiss, isExpanded = false }) {
  const [expanded, setExpanded] = useState(isExpanded)
  const [fadeAnim] = useState(new Animated.Value(1))

  // Categorizar socios en mora por urgencia
  function getCriticalDelinquent() {
    return delinquent.filter(d => Math.abs(parseFloat(d.net_balance)) > 1000)
  }

  function getModerateDelinquent() {
    return delinquent.filter(
      d => Math.abs(parseFloat(d.net_balance)) > 100 && Math.abs(parseFloat(d.net_balance)) <= 1000
    )
  }

  function getLightDelinquent() {
    return delinquent.filter(d => Math.abs(parseFloat(d.net_balance)) <= 100)
  }

  if (!delinquent || delinquent.length === 0) {
    return null
  }

  const critical = getCriticalDelinquent()
  const moderate = getModerateDelinquent()
  const light = getLightDelinquent()

  const totalDelinquent = delinquent.length
  const totalOwed = delinquent.reduce((sum, d) => sum + Math.abs(parseFloat(d.net_balance)), 0)

  function handleDismiss() {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => onDismiss?.())
  }

  function renderDelinquentItem(item, severity) {
    const amount = Math.abs(parseFloat(item.net_balance))
    const color = severity === 'critical' ? '#D32F2F' : severity === 'moderate' ? '#F57C00' : '#FBC02D'
    const icon = severity === 'critical' ? 'alert-circle' : severity === 'moderate' ? 'warning' : 'information-circle'

    return (
      <View key={item.id} style={[styles.delinquentItem, { borderLeftColor: color }]}>
        <View style={[styles.severityIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.full_name ?? 'Usuario'}</Text>
          <Text style={styles.itemMeta}>{item.m2} M²</Text>
        </View>
        <View style={styles.itemAmount}>
          <Text style={[styles.amountText, { color }]}>
            ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header colapsable */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.alertIcon}>
            <Ionicons name="alert-outline" size={18} color="#fff" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Socios en Mora</Text>
            <Text style={styles.headerSub}>
              {totalDelinquent} socio{totalDelinquent !== 1 ? 's' : ''} · ${totalOwed.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textPrimary}
          />
          <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Contenido expandido */}
      {expanded && (
        <ScrollView
          style={styles.content}
          scrollEnabled={delinquent.length > 5}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {/* Crítica */}
          {critical.length > 0 && (
            <>
              <Text style={styles.severityTitle}>Crítica - Mayor a $1.000</Text>
              {critical.map(item => renderDelinquentItem(item, 'critical'))}
            </>
          )}

          {/* Moderada */}
          {moderate.length > 0 && (
            <>
              <Text style={styles.severityTitle}>Moderada - $100 a $1.000</Text>
              {moderate.map(item => renderDelinquentItem(item, 'moderate'))}
            </>
          )}

          {/* Leve */}
          {light.length > 0 && (
            <>
              <Text style={styles.severityTitle}>Leve - Menor a $100</Text>
              {light.map(item => renderDelinquentItem(item, 'light'))}
            </>
          )}

          {/* Sugerencia de acción */}
          <View style={styles.actionSuggestion}>
            <Ionicons name="lightbulb-outline" size={16} color={COLORS.primary} />
            <Text style={styles.suggestionText}>
              Considera contactar a los socios para coordinar los pagos pendientes.
            </Text>
          </View>
        </ScrollView>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB74D',
    overflow: 'hidden',
    shadowColor: '#F57F17',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFB74D',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F57F17',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    gap: 1,
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  headerSub: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxHeight: 320,
  },
  severityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 8,
  },
  delinquentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  severityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  itemMeta: {
    fontSize: 11,
    color: '#666',
  },
  itemAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionSuggestion: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  suggestionText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
    flex: 1,
  },
})
