import { useState, useEffect } from 'react'
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
  Alert,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getAllGroupPayments, approvePayment } from '../services/payments'
import RejectPaymentModal from '../components/RejectPaymentModal'
import { COLORS } from '../constants/colors'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? ''
const { width: SCREEN_WIDTH } = Dimensions.get('window')

function formatAmount(value) {
  const n = parseFloat(value)
  if (isNaN(n)) return '0,00'
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  const [filterStatus, setFilterStatus] = useState('pending') // 'pending', 'approved', 'rejected', 'all'
  const [rejectingPayment, setRejectingPayment] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

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
      const data = await getAllGroupPayments(gid)
      setPayments(data)
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

  async function handleApprovePayment(paymentId) {
    Alert.alert(
      'Aprobar pago',
      '¿Estás seguro que querés aprobar este pago?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: async () => {
            setActionLoading(true)
            try {
              await approvePayment(groupId, paymentId)
              setPayments(payments.map(p => p.id === paymentId ? { ...p, status: 'approved' } : p))
            } catch (err) {
              console.error('Error approving payment:', err)
              Alert.alert('Error', 'No se pudo aprobar el pago')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  function handleOpenRejectModal(payment) {
    setRejectingPayment(payment)
    setShowRejectModal(true)
  }

  const total = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0)

  const filteredPayments = payments.filter(p => {
    if (filterStatus === 'all') return true
    return (p.status || 'pending') === filterStatus
  })

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
              <Text style={styles.summaryValue}>${formatAmount(total)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryLabel}>Pagos registrados</Text>
              <Text style={styles.summaryValue}>{payments.length}</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ─── FILTER BUTTONS ─── */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'pending' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('pending')}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={filterStatus === 'pending' ? '#fff' : COLORS.warn}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === 'pending' && styles.filterButtonTextActive,
              ]}
            >
              Pendientes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'approved' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('approved')}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={filterStatus === 'approved' ? '#fff' : COLORS.success}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === 'approved' && styles.filterButtonTextActive,
              ]}
            >
              Aprobados
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'rejected' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('rejected')}
          >
            <Ionicons
              name="close-circle-outline"
              size={16}
              color={filterStatus === 'rejected' ? '#fff' : COLORS.error}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === 'rejected' && styles.filterButtonTextActive,
              ]}
            >
              Rechazados
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={filterStatus === 'all' ? '#fff' : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === 'all' && styles.filterButtonTextActive,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── LISTA DE PAGOS ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filterStatus === 'pending' && 'Pagos pendientes de aprobación'}
            {filterStatus === 'approved' && 'Pagos aprobados'}
            {filterStatus === 'rejected' && 'Pagos rechazados'}
            {filterStatus === 'all' && 'Todos los pagos'}
          </Text>
        </View>

        {filteredPayments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={44} color={COLORS.border} />
            <Text style={styles.emptyText}>
              {filterStatus === 'pending' && 'No hay pagos pendientes'}
              {filterStatus === 'approved' && 'No hay pagos aprobados'}
              {filterStatus === 'rejected' && 'No hay pagos rechazados'}
              {filterStatus === 'all' && 'No hay pagos registrados aún'}
            </Text>
          </View>
        ) : (
          filteredPayments.map((item) => {
            const isPdf = item.receipt_url?.toLowerCase().endsWith('.pdf')
            const dateStr = new Date(item.payment_date + 'T12:00:00').toLocaleDateString('es-AR', {
              day: '2-digit', month: 'short', year: 'numeric',
            })
            const status = item.status || 'pending'
            const statusColor =
              status === 'approved'
                ? COLORS.success
                : status === 'rejected'
                ? COLORS.error
                : COLORS.warn

            return (
              <View key={item.id} style={[styles.paymentCard, status !== 'pending' && styles.paymentCardInactive]}>
                <View style={[styles.paymentIconWrap, { backgroundColor: statusColor + '1A' }]}>
                  <Ionicons
                    name={
                      status === 'approved'
                        ? 'checkmark-circle'
                        : status === 'rejected'
                        ? 'close-circle'
                        : 'time'
                    }
                    size={20}
                    color={statusColor}
                  />
                </View>

                <View style={styles.paymentBody}>
                  <Text style={styles.paymentName}>{item.full_name}</Text>
                  <Text style={styles.paymentDate}>{dateStr}</Text>
                  {item.notes ? (
                    <Text style={styles.paymentNotes} numberOfLines={1}>{item.notes}</Text>
                  ) : null}
                  {item.rejection_reason && (
                    <Text style={styles.rejectionReason}>{item.rejection_reason}</Text>
                  )}
                </View>

                <View style={styles.paymentRight}>
                  <View style={styles.paymentAmountColumn}>
                    <Text style={styles.paymentAmount}>${formatAmount(item.amount)}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: statusColor + '1A',
                          borderColor: statusColor,
                        },
                      ]}
                    >
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                        {status === 'pending'
                          ? 'Pendiente'
                          : status === 'approved'
                          ? 'Aprobado'
                          : 'Rechazado'}
                      </Text>
                    </View>
                  </View>
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
                </View>

                {/* Action Buttons for Pending */}
                {status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApprovePayment(item.id)}
                      disabled={actionLoading}
                    >
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleOpenRejectModal(item)}
                      disabled={actionLoading}
                    >
                      <Ionicons name="close" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                )}
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

      <RejectPaymentModal
        visible={showRejectModal}
        groupId={groupId}
        payment={rejectingPayment}
        onClose={() => {
          setShowRejectModal(false)
          setRejectingPayment(null)
        }}
        onSuccess={() => {
          setPayments(
            payments.map((p) =>
              p.id === rejectingPayment?.id ? { ...p, status: 'rejected' } : p
            )
          )
        }}
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

  filterContainer: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 0,
    justifyContent: 'space-between',
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterButtonTextActive: {
    color: '#fff',
  },

  sectionHeader: {
    width: '100%',
    maxWidth: 500,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10, width: '100%', maxWidth: 500 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },

  paymentCard: {
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
  paymentCardInactive: {
    opacity: 0.75,
  },
  paymentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentBody: { flex: 1, gap: 2 },
  paymentName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  paymentDate: { fontSize: 12, color: COLORS.textMuted },
  paymentNotes: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  rejectionReason: {
    fontSize: 12,
    color: COLORS.error,
    fontStyle: 'italic',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.errorLight,
  },
  paymentRight: { alignItems: 'flex-end', gap: 6 },
  paymentAmountColumn: { alignItems: 'flex-end', gap: 4 },
  paymentAmount: { fontSize: 15, fontWeight: '800', color: '#00897B' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
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

  actionButtons: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  rejectButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
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
