import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../constants/colors'
import PartnersList from '../components/PartnersList'

export default function PartnersScreen() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const listRef = useRef(null)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    // Trigger reload in PartnersList
    await new Promise((resolve) => setTimeout(resolve, 500))
    setRefreshing(false)
  }, [])

  // Reload cuando la pantalla se enfoca
  useFocusEffect(
    useCallback(() => {
      handleRefresh()
    }, [handleRefresh])
  )

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Gestión de Socios</Text>
          <Text style={styles.subtitle}>Estado económico actual</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: COLORS.success }]} />
          <Text style={styles.legendText}>Al día</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: COLORS.error }]} />
          <Text style={styles.legendText}>Debe</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#1976D2' }]} />
          <Text style={styles.legendText}>Cobra</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        ref={listRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
      >
        <PartnersList refreshing={refreshing} onRefresh={handleRefresh} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
})
