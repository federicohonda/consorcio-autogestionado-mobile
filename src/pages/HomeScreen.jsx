import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
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
import { logout } from '../services/auth'
import { getMonthlySummary, getExpenses, getMembers, getMyGroup } from '../services/group'
import { COLORS } from '../constants/colors'
import QuickAccessButtons from '../components/QuickAccessButtons'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Diccionario visual de categorías (Nuestro V2)
const CATEGORY_STYLES = {
  'Reparaciones': { icon: 'build-outline', bg: '#e8f5e9', color: '#4caf50' },
  'Servicios': { icon: 'bulb-outline', bg: '#e3f2fd', color: '#2196f3' },
  'Limpieza': { icon: 'leaf-outline', bg: '#f1f8e9', color: '#8bc34a' },
  'Seguridad': { icon: 'lock-closed-outline', bg: '#fff3e0', color: '#ff9800' },
  'Otros': { icon: 'cube-outline', bg: '#efebe9', color: '#795548' }
}

// Lógica de archivos de Thiago
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? ''
const { width: SCREEN_WIDTH } = Dimensions.get('window')

function formatAmount(value) {
  const n = parseFloat(value)
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isImageUrl(url) {
  if (!url) return false
  const lower = url.toLowerCase()
  return (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif')
  )
}

function ReceiptModal({ visible, receiptUrl, onClose }) {
  const fullUrl = receiptUrl ? `${API_URL}${receiptUrl}` : null
  const isPdf = receiptUrl && receiptUrl.toLowerCase().endsWith('.pdf')

  async function handleOpenExternal() {
    if (!fullUrl) return
    try {
      await Linking.openURL(fullUrl)
    } catch {
      /* noop */
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
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
          <TouchableOpacity
            style={modalStyles.imageClose}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: fullUrl }}
            style={modalStyles.imageFullscreen}
            resizeMode="contain"
          />
          <TouchableOpacity style={modalStyles.openButton} onPress={handleOpenExternal}>
            <Ionicons name="expand-outline" size={18} color="#fff" />
            <Text style={modalStyles.openButtonText}>Ver en pantalla completa</Text>
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const listRef = useRef(null)
  const now = new Date()
  const [groupId, setGroupId] = useState(null)
  const [groupName, setGroupName] = useState('')
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])

  const [inviteCode, setInviteCode] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingLogout, setPendingLogout] = useState(false)
  const [error, setError] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  const loadData = useCallback(async (gid) => {
    try {
      setError('')
      const [s, e] = await Promise.all([
        getMonthlySummary(gid),
        getExpenses(gid),
      ])
      setSummary(s)
      setExpenses(e)
    } catch {
      setError('No se pudieron cargar los datos del grupo.')
    }
  }, [])

  useEffect(() => {
    async function init() {
      const [gid, gname, token] = await Promise.all([
        AsyncStorage.getItem('groupId'),
        AsyncStorage.getItem('groupName'),
        AsyncStorage.getItem('token'),
      ])

      if (!gid) {
        router.replace('/groups')
        return
      }

      setGroupId(gid)
      setGroupName(gname ?? 'Mi grupo')

      if (token) {
        try {
          const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
          const payload = JSON.parse(atob(b64))
          const myUserId = Number(payload.sub)

          const [myGroupData, members] = await Promise.all([
            getMyGroup(),
            getMembers(gid)
          ])

          const groupInfo = Array.isArray(myGroupData) ? myGroupData[0] : myGroupData
          const myProfile = members.find(m => m.user_id === myUserId)

          if (myProfile) {
            const role = myProfile.role.toLowerCase()
            if (role === 'administrador' || role === 'admin' || role === 'creador') {
              setIsAdmin(true)
              if (groupInfo && groupInfo.invite_code) {
                setInviteCode(groupInfo.invite_code)
              }
            }
          }
        } catch (e) {
          console.log('Error destrabando candado de seguridad:', e)
        }
      }

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

  function handleBalancePress() {
    if (listRef.current) {
      listRef.current.scrollToOffset({ offset: 0, animated: true })
    }
  }

  async function handleLogout() {
    await logout()
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'groupId', 'groupName'])
    router.replace('/login')
  }

  function renderBalance() {
    if (!summary) return null
    const balance = parseFloat(summary.your_balance)

    if (balance > 0.009) {
      return (
        <Text style={[styles.balanceAmount, { color: '#a5d6a7' }]}>
          A favor ${formatAmount(balance)}
        </Text>
      )
    }
    if (balance < -0.009) {
      return (
        <Text style={[styles.balanceAmount, { color: '#ff8a80' }]}>
          Debés ${formatAmount(Math.abs(balance))}
        </Text>
      )
    }
    return <Text style={[styles.balanceAmount, { color: 'rgba(255,255,255,0.8)' }]}>Estás al día</Text>
  }

  function renderExpense({ item }) {
    // Si la categoría viene del backend, la usa. Si no viene (undefined) usa 'Otros'
    const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES['Otros']

    // Lógica del recibo unificada de Thiago
    const hasReceipt = Boolean(item.receipt_url)
    const isPdf = hasReceipt && item.receipt_url.toLowerCase().endsWith('.pdf')

    return (
      <View style={styles.expenseRow}>
        <View style={[styles.expenseIcon, { backgroundColor: style.bg }]}>
          <Ionicons name={style.icon} size={18} color={style.color} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDesc}>{item.description}</Text>
          <Text style={styles.expensePayer}>Pagó {item.paid_by_name}</Text>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>${formatAmount(item.amount)}</Text>
          {hasReceipt && (
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
          )}
        </View>
      </View>
    )
  }

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
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{groupName}</Text>
          <Text style={styles.headerSub}>
            {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
          </Text>

          {inviteCode && isAdmin ? (
            <View style={styles.codeBadge}>
              <Text style={styles.codeBadgeText}>CÓDIGO: {inviteCode}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/members')}
          >
            <Ionicons name="people-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setPendingLogout(true)}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {pendingLogout && (
        <View style={styles.logoutConfirm}>
          <Text style={styles.logoutConfirmText}>¿Cerrar sesión?</Text>
          <TouchableOpacity style={styles.logoutYes} onPress={handleLogout}>
            <Text style={styles.logoutYesText}>Sí, salir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutNo} onPress={() => setPendingLogout(false)}>
            <Text style={styles.logoutNoText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderExpense}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* 1. PRIMERO LA TARJETA VERDE GIGANTE */}
            {summary && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total del mes</Text>
                <Text style={styles.summaryTotal}>${formatAmount(summary.total_expenses)}</Text>
                <View style={styles.divider} />
                <Text style={styles.summaryLabel}>Tu balance</Text>
                {renderBalance()}
              </View>
            )}

            {/* 2. DESPUÉS LOS BOTONES DE ACCESO RÁPIDO */}
            <QuickAccessButtons onBalancePress={handleBalancePress} />

            {/* 3. Y LUEGO EL TÍTULO DE LA LISTA DE GASTOS */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gastos del mes</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/expenses/add')}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyExpenses}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>No hay gastos este mes</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/expenses/add')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

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
  header: { backgroundColor: COLORS.surface, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerLeft: { gap: 2, flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textMuted },
  codeBadge: {
    marginTop: 8,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.primaryLight || '#c8e6c9',
  },
  codeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: -2 },
  iconButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface2, justifyContent: 'center', alignItems: 'center' },
  error: { color: COLORS.error, backgroundColor: COLORS.errorLight, marginHorizontal: 16, marginTop: 12, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, textAlign: 'center', fontSize: 13 },
  logoutConfirm: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logoutConfirmText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  logoutYes: { backgroundColor: COLORS.error, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  logoutYesText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  logoutNo: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  logoutNoText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  summaryCard: { margin: 16, backgroundColor: COLORS.primary, borderRadius: 20, padding: 24, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryTotal: { fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 4, marginBottom: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 16 },
  balanceAmount: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  listContent: { paddingBottom: 100 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  expenseIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.accentLight, justifyContent: 'center', alignItems: 'center' },
  expenseInfo: { flex: 1, gap: 2 },
  expenseDesc: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  expensePayer: { fontSize: 12, color: COLORS.textMuted },
  expenseRight: { alignItems: 'flex-end', gap: 6 },
  expenseAmount: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.accentLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.primaryLight },
  receiptBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.primaryLight },
  emptyExpenses: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
  fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
})

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { width: '100%', maxWidth: 440, backgroundColor: COLORS.surface, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surface2, justifyContent: 'center', alignItems: 'center' },
  imageOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingBottom: 20 },
  imageFullscreen: { width: SCREEN_WIDTH, flex: 1 },
  imageClose: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 30, right: 16, zIndex: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  pdfContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, gap: 12 },
  pdfText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  openButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  openButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})