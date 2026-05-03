import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Image,
  Linking,
  Dimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { getOwnerBalance, createOwnerPayment, getOwnerPayments, updateBankData } from '../services/payments'
import { COLORS } from '../constants/colors'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? ''
const MAX_FILE_BYTES = 10 * 1024 * 1024
const { width: SCREEN_WIDTH } = Dimensions.get('window')

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

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

export default function PaymentScreen() {
  const router = useRouter()
  const now = new Date()
  const fileInputRef = useRef(null)

  const [groupId, setGroupId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Balance y pagos
  const [balance, setBalance] = useState(null)
  const [payments, setPayments] = useState([])

  // Formulario de pago
  const [amount, setAmount] = useState('')
  const [paymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [receipt, setReceipt] = useState(null)

  // Editor de datos bancarios (solo admin)
  const [showBankEditor, setShowBankEditor] = useState(false)
  const [bankAlias, setBankAlias] = useState('')
  const [bankCbu, setBankCbu] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [savingBank, setSavingBank] = useState(false)

  // UX states
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  useEffect(() => {
    async function init() {
      const [gid, token] = await Promise.all([
        AsyncStorage.getItem('groupId'),
        AsyncStorage.getItem('token'),
      ])
      if (!gid) { router.replace('/groups'); return }
      setGroupId(gid)

      if (token) {
        try {
          const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
          const payload = JSON.parse(atob(b64))
          const myUserId = Number(payload.sub)
          // Verificar si es admin importando getMembers
          const { getMembers } = await import('../services/group')
          const members = await getMembers(gid)
          const me = members.find(m => m.user_id === myUserId)
          if (me) {
            const role = me.role.toLowerCase()
            setIsAdmin(role === 'administrador' || role === 'admin')
          }
        } catch { /* ignore */ }
      }

      await loadData(gid)
      setLoading(false)
    }
    init()
  }, [router])

  async function loadData(gid) {
    try {
      const [bal, pays] = await Promise.all([
        getOwnerBalance(gid),
        getOwnerPayments(gid),
      ])
      setBalance(bal)
      setPayments(pays)
      // Pre-llenar con el monto sugerido
      const due = parseFloat(bal.amount_due)
      if (due > 0) setAmount(due.toFixed(2))

      // Pre-llenar editor bancario si hay datos
      if (bal.bank_alias) setBankAlias(bal.bank_alias)
      if (bal.bank_cbu) setBankCbu(bal.bank_cbu)
      if (bal.bank_account_name) setBankAccountName(bal.bank_account_name)
    } catch {
      setError('No se pudieron cargar los datos de pago.')
    }
  }

  // ----- Archivo comprobante -----
  function validateFile(file) {
    if (file.size && file.size > MAX_FILE_BYTES) {
      setError('El archivo supera el tamaño máximo de 10 MB.')
      return false
    }
    return true
  }

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para adjuntar imágenes.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    })
    if (result.canceled) return
    const asset = result.assets[0]
    const file = { uri: asset.uri, name: asset.fileName || `comprobante_${Date.now()}.jpg`, mimeType: asset.mimeType || 'image/jpeg', size: asset.fileSize }
    if (!validateFile(file)) return
    setReceipt(file)
    setError('')
  }

  async function handlePickPDF() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true })
    if (result.canceled) return
    const asset = result.assets[0]
    const file = { uri: asset.uri, name: asset.name || `comprobante_${Date.now()}.pdf`, mimeType: 'application/pdf', size: asset.size }
    if (!validateFile(file)) return
    setReceipt(file)
    setError('')
  }

  function handlePickWeb(e) {
    const file = e.target.files[0]
    if (!file) return
    const fileObj = { uri: URL.createObjectURL(file), name: file.name, mimeType: file.type, size: file.size, _webFile: file }
    e.target.value = ''
    if (!validateFile(fileObj)) return
    setReceipt(fileObj)
    setError('')
  }

  function showAttachOptions() {
    if (Platform.OS === 'web') { fileInputRef.current?.click(); return }
    Alert.alert(
      'Adjuntar comprobante',
      'Seleccioná el tipo de archivo',
      [
        { text: 'Foto / Galería', onPress: handlePickImage },
        { text: 'Documento PDF', onPress: handlePickPDF },
        { text: 'Cancelar', style: 'cancel' },
      ],
    )
  }
  // --------------------------------

  async function handleSubmit() {
    setError('')
    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresá un monto válido mayor a 0')
      return
    }
    if (!receipt) {
      setError('El comprobante de transferencia es obligatorio para confirmar el pago.')
      return
    }
    setSubmitting(true)
    try {
      await createOwnerPayment(groupId, {
        amount: parsedAmount,
        payment_date: paymentDate,
        notes: notes.trim() || null,
      }, receipt)

      setReceipt(null)
      setNotes('')
      setSuccess(true)
      await loadData(groupId)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'No se pudo registrar el pago.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveBankData() {
    setSavingBank(true)
    try {
      await updateBankData(groupId, bankAlias.trim() || null, bankCbu.trim() || null, bankAccountName.trim() || null)
      setShowBankEditor(false)
      await loadData(groupId)
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los datos bancarios.')
    } finally {
      setSavingBank(false)
    }
  }

  // ---- Render helpers ----
  function renderBalanceBadge() {
    if (!balance) return null
    const net = parseFloat(balance.net_balance)

    if (net > 0.009) {
      return (
        <View style={[styles.badge, styles.badgeFavor]}>
          <Ionicons name="trending-up-outline" size={14} color="#1B5E20" />
          <Text style={[styles.badgeText, { color: '#1B5E20' }]}>SALDO A FAVOR</Text>
        </View>
      )
    }
    if (net < -0.009) {
      return (
        <View style={[styles.badge, styles.badgeDeuda]}>
          <Ionicons name="alert-circle-outline" size={14} color="#B71C1C" />
          <Text style={[styles.badgeText, { color: '#B71C1C' }]}>DEUDA PENDIENTE</Text>
        </View>
      )
    }
    return (
      <View style={[styles.badge, styles.badgeAlDia]}>
        <Ionicons name="checkmark-circle-outline" size={14} color="#1B5E20" />
        <Text style={[styles.badgeText, { color: '#1B5E20' }]}>AL DÍA</Text>
      </View>
    )
  }

  function renderPaymentRow(item) {
    const isPdf = item.receipt_url?.toLowerCase().endsWith('.pdf')
    const dateStr = new Date(item.payment_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })

    return (
      <View key={item.id} style={styles.paymentRow}>
        <View style={styles.paymentIcon}>
          <Ionicons name="cash-outline" size={18} color="#00897B" />
        </View>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentDate}>{dateStr}</Text>
          {item.notes ? <Text style={styles.paymentNotes} numberOfLines={1}>{item.notes}</Text> : null}
        </View>
        <View style={styles.paymentRight}>
          <Text style={styles.paymentAmount}>${formatAmount(item.amount)}</Text>
          <TouchableOpacity
            style={styles.receiptBtn}
            onPress={() => setSelectedReceipt(item.receipt_url)}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Ionicons name={isPdf ? 'document-text-outline' : 'image-outline'} size={13} color={COLORS.primaryLight} />
            <Text style={styles.receiptBtnText}>Comprobante</Text>
          </TouchableOpacity>
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

  const net = balance ? parseFloat(balance.net_balance) : 0
  const receiptLabel = receipt ? (receipt.name.length > 30 ? receipt.name.slice(0, 27) + '...' : receipt.name) : null
  const canSubmit = Boolean(receipt) && !submitting

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Pagos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── TARJETA DE BALANCE ─── */}
        {balance && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceCardTop}>
              <Text style={styles.balanceCardLabel}>
                {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
              </Text>
              {renderBalanceBadge()}
            </View>

            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Tu parte este mes</Text>
                <Text style={styles.balanceStatValue}>${formatAmount(balance.current_month_share)}</Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>
                  {net >= 0 ? 'Saldo a favor' : 'Deuda acumulada'}
                </Text>
                <Text style={[
                  styles.balanceStatValue,
                  { color: net >= 0 ? '#2E7D32' : '#C62828' }
                ]}>
                  {net >= 0 ? '+' : '-'}${formatAmount(Math.abs(net))}
                </Text>
              </View>
            </View>

            {parseFloat(balance.amount_due) > 0 && (
              <View style={styles.amountDueBanner}>
                <Text style={styles.amountDueLabel}>Monto sugerido a pagar</Text>
                <Text style={styles.amountDueValue}>${formatAmount(balance.amount_due)}</Text>
              </View>
            )}
          </View>
        )}

        {/* ─── DATOS BANCARIOS ─── */}
        {balance && (balance.bank_alias || balance.bank_cbu || balance.bank_account_name) ? (
          <View style={styles.card}>
            <View style={styles.bankHeader}>
              <Ionicons name="business-outline" size={18} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Datos para transferir</Text>
            </View>
            {balance.bank_account_name ? (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Titular</Text>
                <Text style={styles.bankValue}>{balance.bank_account_name}</Text>
              </View>
            ) : null}
            {balance.bank_alias ? (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Alias</Text>
                <Text style={styles.bankValue}>{balance.bank_alias}</Text>
              </View>
            ) : null}
            {balance.bank_cbu ? (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>CBU</Text>
                <Text style={[styles.bankValue, styles.bankMono]}>{balance.bank_cbu}</Text>
              </View>
            ) : null}
            {isAdmin && (
              <TouchableOpacity style={styles.editBankBtn} onPress={() => setShowBankEditor(!showBankEditor)}>
                <Ionicons name="pencil-outline" size={14} color={COLORS.primaryLight} />
                <Text style={styles.editBankBtnText}>Editar datos bancarios</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : isAdmin ? (
          <View style={styles.card}>
            <TouchableOpacity style={styles.noBankBanner} onPress={() => setShowBankEditor(true)}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primaryLight} />
              <Text style={styles.noBankText}>Configurar datos bancarios del consorcio</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ─── EDITOR DATOS BANCARIOS (solo admin) ─── */}
        {showBankEditor && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Datos bancarios del consorcio</Text>
            <Text style={styles.inputLabel}>Alias</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Ej: consorcio.edificio"
                placeholderTextColor="#999"
                value={bankAlias}
                onChangeText={setBankAlias}
                autoCapitalize="none"
              />
            </View>
            <Text style={styles.inputLabel}>CBU</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="22 dígitos"
                placeholderTextColor="#999"
                value={bankCbu}
                onChangeText={setBankCbu}
                keyboardType="numeric"
                maxLength={22}
              />
            </View>
            <Text style={styles.inputLabel}>Nombre del titular</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Ej: Consorcio Edificio Central"
                placeholderTextColor="#999"
                value={bankAccountName}
                onChangeText={setBankAccountName}
              />
            </View>
            <View style={styles.bankEditorActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBankEditor(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, savingBank && styles.btnDisabled]}
                onPress={handleSaveBankData}
                disabled={savingBank}
              >
                {savingBank ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── FORMULARIO DE PAGO ─── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registrar pago</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {success && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
              <Text style={styles.successText}>Pago registrado correctamente</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Monto pagado ($) *</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#999"
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))}
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={styles.inputLabel}>Comprobante de transferencia *</Text>
          {receipt ? (
            <View style={styles.receiptAttached}>
              <View style={styles.receiptAttachedLeft}>
                <Ionicons
                  name={receipt.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'}
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.receiptAttachedName} numberOfLines={1}>{receiptLabel}</Text>
              </View>
              <TouchableOpacity onPress={() => setReceipt(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={showAttachOptions}>
              <View style={styles.uploadIconWrapper}>
                <Ionicons name="document-attach-outline" size={24} color="#777" />
              </View>
              <View style={styles.uploadTextWrapper}>
                <Text style={styles.uploadButtonText}>Adjuntar comprobante</Text>
                <Text style={styles.uploadButtonSub}>Formatos: JPG, PNG, PDF · Máx 10 MB</Text>
              </View>
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          <Text style={styles.inputLabel}>Observaciones (opcional)</Text>
          <View style={[styles.inputWrapper, { height: 64, alignItems: 'flex-start', paddingVertical: 10 }]}>
            <TextInput
              style={[styles.input, { textAlignVertical: 'top' }]}
              placeholder="Ej: Pago mes de mayo"
              placeholderTextColor="#999"
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={200}
            />
          </View>

          {!receipt && (
            <View style={styles.requiredHint}>
              <Ionicons name="information-circle-outline" size={15} color={COLORS.textMuted} />
              <Text style={styles.requiredHintText}>Adjuntá el comprobante para habilitar el botón de confirmación</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={canSubmit ? '#fff' : '#aaa'} />
                <Text style={[styles.submitButtonText, !canSubmit && styles.submitButtonTextDisabled]}>
                  Confirmar Pago
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── HISTORIAL DE PAGOS ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historial de pagos</Text>
        </View>

        {payments.length === 0 ? (
          <View style={styles.emptyPayments}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>No hay pagos registrados</Text>
          </View>
        ) : (
          payments.map(renderPaymentRow)
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={handlePickWeb}
        />
      )}

      <ReceiptModal
        visible={Boolean(selectedReceipt)}
        receiptUrl={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </KeyboardAvoidingView>
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

  // Tarjeta de balance
  balanceCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  balanceCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeFavor: { backgroundColor: '#C8E6C9' },
  badgeDeuda: { backgroundColor: '#FFCDD2' },
  badgeAlDia: { backgroundColor: '#C8E6C9' },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  balanceRow: { flexDirection: 'row', alignItems: 'stretch' },
  balanceStat: { flex: 1, gap: 4 },
  balanceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 16 },
  balanceStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  balanceStatValue: { fontSize: 22, fontWeight: '800', color: '#fff' },

  amountDueBanner: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountDueLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  amountDueValue: { fontSize: 20, fontWeight: '800', color: '#fff' },

  // Tarjeta genérica
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
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 },

  // Datos bancarios
  bankHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  bankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  bankLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  bankValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600', maxWidth: '65%', textAlign: 'right' },
  bankMono: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13, letterSpacing: 0.5 },
  editBankBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-end' },
  editBankBtnText: { fontSize: 12, color: COLORS.primaryLight, fontWeight: '600' },
  noBankBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  noBankText: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '600' },

  // Editor bancario
  bankEditorActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { flex: 1, height: 44, borderRadius: 8, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },

  // Formulario
  inputLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  currencyPrefix: { fontSize: 16, fontWeight: '500', color: COLORS.textMuted, marginRight: 6 },
  ...Platform.select({
    web: {
      input: { flex: 1, color: COLORS.textPrimary, fontSize: 15, paddingVertical: 0, outlineStyle: 'none' },
    },
    default: {
      input: { flex: 1, color: COLORS.textPrimary, fontSize: 15, paddingVertical: 0 },
    },
  }),

  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  uploadIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  uploadTextWrapper: { flex: 1 },
  uploadButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  uploadButtonSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  receiptAttached: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.accentLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    gap: 8,
  },
  receiptAttachedLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  receiptAttachedName: { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },

  requiredHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  requiredHintText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 52,
  },
  submitButtonDisabled: { backgroundColor: COLORS.border },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  submitButtonTextDisabled: { color: COLORS.textMuted },

  error: {
    color: COLORS.error,
    backgroundColor: COLORS.errorLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
    marginBottom: 14,
    fontSize: 13,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  successText: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },

  // Sección historial
  sectionHeader: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },

  paymentRow: {
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
  paymentIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: { flex: 1, gap: 2 },
  paymentDate: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  paymentNotes: { fontSize: 12, color: COLORS.textMuted },
  paymentRight: { alignItems: 'flex-end', gap: 6 },
  paymentAmount: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
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

  emptyPayments: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8, width: '100%', maxWidth: 500 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
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
