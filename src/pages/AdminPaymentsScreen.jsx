import { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Image,
  Linking,
  Dimensions,
  Platform,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getAllGroupPayments } from '../services/payments'
import { getMyGroup } from '../services/group'
import { COLORS } from '../constants/colors'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? ''
const { width: SCREEN_WIDTH } = Dimensions.get('window')

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function formatAmount(value) {
  const n = parseFloat(value)
  if (isNaN(n)) return '0,00'
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function monthKey(dateStr) {
  return dateStr ? dateStr.substring(0, 7) : ''
}

function monthLabel(key) {
  const [year, month] = key.split('-')
  return `${MONTHS_ES[parseInt(month, 10) - 1]} ${year}`
}

function ReceiptModal({ visible, receiptUrl, onClose }) {
  const fullUrl = receiptUrl ? `${API_URL}${receiptUrl}` : null
  const isPdf = receiptUrl && receiptUrl.toLowerCase().endsWith('.pdf')

  async function handleOpenExternal() {
    if (!fullUrl) return
    try { await Linking.openURL(fullUrl) } catch { /* noop */ }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {isPdf || !fullUrl ? (
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.topBar}>
              <Text style={modalStyles.title}>Comprobante</Text>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            {isPdf && (
              <View style={modalStyles.pdfContainer}>
                <Ionicons name="document-text-outline" size={64} color={COLORS.primary} />
                <Text style={modalStyles.pdfText}>Documento PDF</Text>
                <TouchableOpacity style={modalStyles.openButton} onPress={handleOpenExternal}>
                  <Ionicons name="open-outline" size={18} color="#fff" />
                  <Text style={modalStyles.openButtonText}>Abrir PDF</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={modalStyles.imageOverlay}>
          <TouchableOpacity style={modalStyles.imageClose} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: fullUrl }} style={modalStyles.imageFullscreen} resizeMode="contain" />
          <TouchableOpacity style={modalStyles.openButton} onPress={handleOpenExternal}>
            <Ionicons name="expand-outline" size={18} color="#fff" />
            <Text style={modalStyles.openButtonText}>Ver en pantalla completa</Text>
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  )
}

export default function AdminPaymentsScreen() {
  const router = useRouter()
  const [groupId, setGroupId] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)
  const [groupActiveMonth, setGroupActiveMonth] = useState(null) // YYYYMM
  const [groupCreatedAt, setGroupCreatedAt] = useState(null)    // Date

  useEffect(() => {
    async function init() {
      const gid = await AsyncStorage.getItem('groupId')
      if (!gid) { router.replace('/groups'); return }
      setGroupId(gid)
      await loadData(gid)
      setLoading(false)
    }
    init()
  }, [])

  async function loadData(gid) {
    try {
      setError('')
      const [data, group] = await Promise.all([
        getAllGroupPayments(gid),
        getMyGroup(),
      ])
      setPayments(data)
      if (group.active_month) setGroupActiveMonth(group.active_month)
      if (group.created_at) setGroupCreatedAt(new Date(group.created_at))
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Solo el administrador puede ver esta sección.')
      } else {
        setError('No se pudieron cargar los pagos.')
      }
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    if (groupId) await loadData(groupId)
    setRefreshing(false)
  }

  const months = useMemo(() => {
    // Current month: from the group's active_month (YYYYMM) or real date as fallback
    const endKey = groupActiveMonth
      ? `${Math.floor(groupActiveMonth / 100)}-${String(groupActiveMonth % 100).padStart(2, '0')}`
      : (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}` })()

    // Start month: from group creation date
    const startKey = groupCreatedAt
      ? `${groupCreatedAt.getFullYear()}-${String(groupCreatedAt.getMonth() + 1).padStart(2, '0')}`
      : endKey

    const all = []
    let [y, m] = startKey.split('-').map(Number)
    const [endY, endM] = endKey.split('-').map(Number)
    while (y < endY || (y === endY && m <= endM)) {
      all.push(`${y}-${String(m).padStart(2, '0')}`)
      m++
      if (m > 12) { m = 1; y++ }
    }
    return all.sort((a, b) => b.localeCompare(a))
  }, [groupActiveMonth, groupCreatedAt])

  const members = useMemo(() => {
    const map = {}
    payments.forEach(p => {
      if (p.user_id && !map[p.user_id]) map[p.user_id] = p.full_name
    })
    return Object.entries(map)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [payments])

  const grouped = useMemo(() => {
    let filtered = payments
    if (selectedMember) filtered = filtered.filter(p => String(p.user_id) === String(selectedMember))
    if (selectedMonth) filtered = filtered.filter(p => monthKey(p.payment_date) === selectedMonth)

    const groups = {}
    filtered.forEach(p => {
      const key = monthKey(p.payment_date)
      if (!key) return
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    })

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [payments, selectedMember, selectedMonth])

  const filteredTotal = useMemo(() =>
    grouped.reduce((acc, [, items]) => acc + items.reduce((s, p) => s + parseFloat(p.amount || 0), 0), 0),
    [grouped]
  )

  const filteredCount = useMemo(() =>
    grouped.reduce((acc, [, items]) => acc + items.length, 0),
    [grouped]
  )

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagos del consorcio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        {/* ─── RESUMEN ─── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryLabel}>Total recibido</Text>
              <Text style={styles.summaryValue}>${formatAmount(filteredTotal)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryLabel}>Pagos registrados</Text>
              <Text style={styles.summaryValue}>{filteredCount}</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ─── FILTRO POR SOCIO ─── */}
        {members.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Socio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <TouchableOpacity
                style={[styles.chip, !selectedMember && styles.chipActive]}
                onPress={() => setSelectedMember(null)}
              >
                <Text style={[styles.chipText, !selectedMember && styles.chipTextActive]}>Todos</Text>
              </TouchableOpacity>
              {members.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, selectedMember === m.id && styles.chipActive]}
                  onPress={() => setSelectedMember(selectedMember === m.id ? null : m.id)}
                >
                  <Text style={[styles.chipText, selectedMember === m.id && styles.chipTextActive]} numberOfLines={1}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── FILTRO POR MES ─── */}
        {months.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Mes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <TouchableOpacity
                style={[styles.chip, !selectedMonth && styles.chipActive]}
                onPress={() => setSelectedMonth(null)}
              >
                <Text style={[styles.chipText, !selectedMonth && styles.chipTextActive]}>Todos</Text>
              </TouchableOpacity>
              {months.map(key => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, selectedMonth === key && styles.chipActive]}
                  onPress={() => setSelectedMonth(selectedMonth === key ? null : key)}
                >
                  <Text style={[styles.chipText, selectedMonth === key && styles.chipTextActive]}>
                    {monthLabel(key)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── HISTORIAL AGRUPADO POR MES ─── */}
        {grouped.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={44} color={COLORS.border} />
            <Text style={styles.emptyText}>
              {selectedMonth
                ? `No hubo pagos en ${monthLabel(selectedMonth)}`
                : 'No hay pagos registrados'}
            </Text>
          </View>
        ) : (
          grouped.map(([key, items]) => {
            const monthTotal = items.reduce((s, p) => s + parseFloat(p.amount || 0), 0)
            return (
              <View key={key} style={styles.monthGroup}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthTitle}>{monthLabel(key)}</Text>
                  <View style={styles.monthMeta}>
                    <Text style={styles.monthCount}>{items.length} {items.length === 1 ? 'pago' : 'pagos'}</Text>
                    <Text style={styles.monthTotal}>${formatAmount(monthTotal)}</Text>
                  </View>
                </View>

                {items.map(item => {
                  const isPdf = item.receipt_url?.toLowerCase().endsWith('.pdf')
                  return (
                    <View key={item.id} style={styles.paymentCard}>
                      <View style={styles.paymentIconWrap}>
                        <Ionicons name="cash-outline" size={20} color={COLORS.primaryLight} />
                      </View>

                      <View style={styles.paymentBody}>
                        <Text style={styles.paymentName}>{item.full_name}</Text>
                        {item.notes ? (
                          <Text style={styles.paymentNotes} numberOfLines={2}>{item.notes}</Text>
                        ) : null}
                      </View>

                      <View style={styles.paymentRight}>
                        <Text style={styles.paymentAmount}>${formatAmount(item.amount)}</Text>
                        {item.receipt_url ? (
                          <TouchableOpacity
                            style={styles.receiptBtn}
                            onPress={() => setSelectedReceipt(item.receipt_url)}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Ionicons
                              name={isPdf ? 'document-text-outline' : 'image-outline'}
                              size={13}
                              color={COLORS.primaryLight}
                            />
                            <Text style={styles.receiptBtnText}>Comprobante</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  )
                })}
              </View>
            )
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ReceiptModal
        visible={Boolean(selectedReceipt)}
        receiptUrl={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface2, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, alignItems: 'center' },

  summaryCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryStat: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.25)' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryValue: { fontSize: 24, fontWeight: '800', color: '#fff' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.errorLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    width: '100%',
    maxWidth: 500,
  },
  errorText: { flex: 1, fontSize: 13, color: COLORS.error },

  filterSection: {
    width: '100%',
    maxWidth: 500,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10, width: '100%', maxWidth: 500 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },

  monthGroup: {
    width: '100%',
    maxWidth: 500,
    marginBottom: 20,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  monthTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  monthMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  monthTotal: { fontSize: 14, fontWeight: '700', color: COLORS.primaryLight },

  paymentCard: {
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  paymentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentBody: { flex: 1, gap: 2 },
  paymentName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  paymentNotes: { fontSize: 12, color: COLORS.textSecondary },

  paymentRight: { alignItems: 'flex-end', gap: 6 },
  paymentAmount: { fontSize: 15, fontWeight: '800', color: '#00897B' },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  receiptBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.primaryLight },
})

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { width: '100%', maxWidth: 440, backgroundColor: COLORS.surface, borderRadius: 20, overflow: 'hidden' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surface2, justifyContent: 'center', alignItems: 'center' },
  pdfContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, gap: 12 },
  pdfText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  openButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  openButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  imageOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingBottom: 20 },
  imageFullscreen: { width: SCREEN_WIDTH, flex: 1 },
  imageClose: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 30, right: 16, zIndex: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
})
