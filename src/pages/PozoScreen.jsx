import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getPozoInfo, updatePozoConfig, advanceMonth } from '../services/pozo'
import { detectGroupRole } from '../utils/auth'
import { COLORS } from '../constants/colors'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MOVEMENT_CONFIG = {
  PAYMENT_INCOME: {
    icon: 'cash-outline',
    color: '#2E7D32',
    bg: '#E8F5E9',
    label: 'Pago recibido',
    sign: '+',
  },
  EXPENSE_DEDUCTION: {
    icon: 'receipt-outline',
    color: '#B71C1C',
    bg: '#FFEBEE',
    label: 'Gasto del Pozo',
    sign: '-',
  },
  MONTH_DISTRIBUTION: {
    icon: 'swap-horizontal-outline',
    color: '#1565C0',
    bg: '#E3F2FD',
    label: 'Distribución mensual',
    sign: '-',
  },
}

function formatAmount(value) {
  const n = parseFloat(value)
  if (isNaN(n)) return '0,00'
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatMonth(yyyymm) {
  if (!yyyymm) return ''
  const year = Math.floor(yyyymm / 100)
  const month = yyyymm % 100
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function ConfirmModal({ visible, title, message, onConfirm, onCancel, loading }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.box}>
          <Text style={modalStyles.title}>{title}</Text>
          <Text style={modalStyles.message}>{message}</Text>
          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={modalStyles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.confirmBtn} onPress={onConfirm} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={modalStyles.confirmText}>Confirmar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default function PozoScreen() {
  const router = useRouter()

  const scrollRef = useRef(null)
  const [groupId, setGroupId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pozo, setPozo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Config aporte mensual
  const [contribution, setContribution] = useState('')
  const [showContribConfirm, setShowContribConfirm] = useState(false)
  const [savingContrib, setSavingContrib] = useState(false)

  // Avanzar mes
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [advanceResult, setAdvanceResult] = useState(null)

  const loadData = useCallback(async (gid) => {
    try {
      setError('')
      const data = await getPozoInfo(gid)
      setPozo(data)
      setContribution(data.monthly_contribution > 0 ? String(data.monthly_contribution) : '')
    } catch {
      setError('No se pudo cargar la información del Pozo.')
    }
  }, [])

  useEffect(() => {
    async function init() {
      const gid = await AsyncStorage.getItem('groupId')
      if (!gid) { router.replace('/groups'); return }
      setGroupId(gid)

      const { isAdmin: admin } = await detectGroupRole()
      setIsAdmin(admin)

      await loadData(gid)
      setLoading(false)
    }
    init()
  }, [loadData, router])

  async function handleRefresh() {
    setRefreshing(true)
    if (groupId) await loadData(groupId)
    setRefreshing(false)
  }

  async function handleSaveContribution() {
    const val = parseFloat(contribution.replace(',', '.'))
    if (isNaN(val) || val < 0) {
      setError('Ingresá un monto válido (0 o mayor).')
      setShowContribConfirm(false)
      return
    }
    setSavingContrib(true)
    try {
      await updatePozoConfig(groupId, val)
      setShowContribConfirm(false)
      await loadData(groupId)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'No se pudo guardar la configuración.')
      setShowContribConfirm(false)
    } finally {
      setSavingContrib(false)
    }
  }

  async function handleAdvanceMonth() {
    setAdvancing(true)
    try {
      const result = await advanceMonth(groupId)
      setAdvanceResult(result)
      setShowAdvanceConfirm(false)
      await loadData(groupId)
      // Scrollear después de que React termine de renderizar el banner de éxito.
      // Sin el timeout, el browser cancela el scroll cuando inserta el banner arriba.
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false })
      }, 80)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'No se pudo avanzar el mes.')
      setShowAdvanceConfirm(false)
    } finally {
      setAdvancing(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const activeMonthLabel = pozo ? formatMonth(pozo.active_month) : ''

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pozo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {advanceResult && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
            <Text style={styles.successText}>{advanceResult.message}</Text>
          </View>
        )}

        {/* Tarjeta saldo */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Mes activo</Text>
          <Text style={styles.balanceMonth}>{activeMonthLabel}</Text>
          <View style={styles.balanceDivider} />
          <Text style={styles.balanceLabel}>Saldo del Pozo</Text>
          <Text style={styles.balanceAmount}>${formatAmount(pozo?.balance ?? 0)}</Text>
          {pozo?.monthly_contribution > 0 && (
            <View style={styles.contributionBadge}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.contributionText}>
                Aporte mensual: ${formatAmount(pozo.monthly_contribution)}
              </Text>
            </View>
          )}
        </View>

        {/* Configurar aporte (solo admin) */}
        {isAdmin && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Configurar aporte mensual</Text>
            <Text style={styles.cardSub}>
              Monto que cada socio deberá aportar al comienzo del próximo mes.
              Si se modifica en el mes actual, aplica a partir del siguiente.
            </Text>
            <View style={styles.inputRow}>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  value={contribution}
                  onChangeText={v => setContribution(v.replace(/[^0-9.,]/g, ''))}
                  keyboardType="decimal-pad"
                />
              </View>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => setShowContribConfirm(true)}
              >
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Movimientos recientes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Movimientos recientes</Text>
        </View>

        {(!pozo?.movements || pozo.movements.length === 0) ? (
          <View style={styles.empty}>
            <Ionicons name="archive-outline" size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>No hay movimientos aún</Text>
          </View>
        ) : (
          pozo.movements.map((mv) => {
            const cfg = MOVEMENT_CONFIG[mv.type] || MOVEMENT_CONFIG.PAYMENT_INCOME
            const dateStr = new Date(mv.created_at).toLocaleDateString('es-AR', {
              day: '2-digit', month: 'short', year: 'numeric',
            })
            return (
              <View key={mv.id} style={styles.movementRow}>
                <View style={[styles.movementIcon, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                </View>
                <View style={styles.movementInfo}>
                  <Text style={styles.movementLabel}>{cfg.label}</Text>
                  <Text style={styles.movementMeta}>
                    {mv.user_name ? `${mv.user_name} · ` : ''}{dateStr}
                  </Text>
                  {mv.description ? (
                    <Text style={styles.movementDesc} numberOfLines={1}>{mv.description}</Text>
                  ) : null}
                </View>
                <Text style={[styles.movementAmount, { color: cfg.color }]}>
                  {cfg.sign}${formatAmount(mv.amount)}
                </Text>
              </View>
            )
          })
        )}

        {/* Avanzar mes (solo admin) */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.advanceBtn}
            onPress={() => { setAdvanceResult(null); setShowAdvanceConfirm(true) }}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward-circle-outline" size={22} color="#fff" />
            <Text style={styles.advanceBtnText}>Avanzar mes</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmModal
        visible={showContribConfirm}
        title="Confirmar cambio"
        message="¿Estás seguro? Este cambio se verá reflejado a partir del mes siguiente."
        onConfirm={handleSaveContribution}
        onCancel={() => setShowContribConfirm(false)}
        loading={savingContrib}
      />

      <ConfirmModal
        visible={showAdvanceConfirm}
        title="¿Avanzar al mes siguiente?"
        message="Esta acción distribuirá el saldo del Pozo entre los miembros con saldo a favor y no se puede deshacer."
        onConfirm={handleAdvanceMonth}
        onCancel={() => setShowAdvanceConfirm(false)}
        loading={advancing}
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
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface2, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, alignItems: 'center' },

  error: { width: '100%', maxWidth: 500, color: COLORS.error, backgroundColor: COLORS.errorLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, textAlign: 'center', marginBottom: 12, fontSize: 13 },

  successBanner: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  successText: { flex: 1, fontSize: 13, color: '#2E7D32', fontWeight: '500' },

  balanceCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#6A1B9A',
    borderRadius: 20,
    padding: 24,
    marginBottom: 12,
    shadowColor: '#6A1B9A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceMonth: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 2, marginBottom: 2 },
  balanceDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 14 },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 4 },
  contributionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 10,
  },
  contributionText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  cardSub: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 14 },

  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  inputWrapper: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  currencyPrefix: { fontSize: 16, fontWeight: '500', color: COLORS.textMuted, marginRight: 6 },
  ...Platform.select({
    web: { input: { flex: 1, color: COLORS.textPrimary, fontSize: 15, paddingVertical: 0, outlineStyle: 'none' } },
    default: { input: { flex: 1, color: COLORS.textPrimary, fontSize: 15, paddingVertical: 0 } },
  }),
  saveBtn: { height: 48, paddingHorizontal: 18, backgroundColor: COLORS.primary, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  sectionHeader: { width: '100%', maxWidth: 500, marginBottom: 8, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8, width: '100%', maxWidth: 500 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },

  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    width: '100%',
    maxWidth: 500,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  movementIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  movementInfo: { flex: 1, gap: 2 },
  movementLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  movementMeta: { fontSize: 11, color: COLORS.textMuted },
  movementDesc: { fontSize: 12, color: COLORS.textSecondary },
  movementAmount: { fontSize: 15, fontWeight: '700' },

  advanceBtn: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 54,
    marginTop: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  advanceBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
})

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 420, backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 16 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  message: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  confirmBtn: { flex: 1, height: 46, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})
