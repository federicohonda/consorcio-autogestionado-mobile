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
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { getMembers, createExpense } from '../services/group'
import { COLORS } from '../constants/colors'

const CATEGORIES = [
  { id: 'Reparaciones', icon: 'build-outline', color: '#81c784' },
  { id: 'Servicios', icon: 'bulb-outline', color: '#64b5f6' },
  { id: 'Limpieza', icon: 'leaf-outline', color: '#aed581' },
  { id: 'Seguridad', icon: 'lock-closed-outline', color: '#ffb74d' },
  { id: 'Otros', icon: 'cube-outline', color: '#a1887f' }
]

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

export default function AddExpenseScreen() {
  const router = useRouter()
  const [groupId, setGroupId] = useState(null)
  const [members, setMembers] = useState([])
  const [myUserId, setMyUserId] = useState(null)

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Otros')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [divisionType, setDivisionType] = useState('PROPORTIONAL')
  const [payerAmounts, setPayerAmounts] = useState({})

  // Estados del comprobante (Thiago)
  const [receipt, setReceipt] = useState(null)
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      const [gid, token] = await Promise.all([
        AsyncStorage.getItem('groupId'),
        AsyncStorage.getItem('token'),
      ])
      if (!gid) { router.replace('/groups'); return }
      setGroupId(gid)

      let uid = null
      if (token) {
        try {
          const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
          const payload = JSON.parse(atob(b64))
          uid = Number(payload.sub)
          setMyUserId(uid)
        } catch { /* ignore */ }
      }

      try {
        const data = await getMembers(gid)
        setMembers(data)
      } catch {
        setError('No se pudieron cargar los miembros.')
      } finally {
        setInitLoading(false)
      }
    }
    init()
  }, [router])

  const handlePayerChange = (userId, value) => {
    const cleanValue = value.replace(/[^0-9.,]/g, '')
    setPayerAmounts(prev => ({ ...prev, [userId]: cleanValue }))
  }

  // --- LÓGICA DE ARCHIVOS (THIAGO) ---
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
    const file = {
      uri: asset.uri,
      name: asset.fileName || `imagen_${Date.now()}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg',
      size: asset.fileSize,
    }
    if (!validateFile(file)) return
    setReceipt(file)
    setError('')
  }

  async function handlePickPDF() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    })
    if (result.canceled) return

    const asset = result.assets[0]
    const file = {
      uri: asset.uri,
      name: asset.name || `documento_${Date.now()}.pdf`,
      mimeType: asset.mimeType || 'application/pdf',
      size: asset.size,
    }
    if (!validateFile(file)) return
    setReceipt(file)
    setError('')
  }

  function handleRemoveReceipt() {
    setReceipt(null)
  }

  function handlePickWeb(e) {
    const file = e.target.files[0]
    if (!file) return
    const fileObj = {
      uri: URL.createObjectURL(file),
      name: file.name,
      mimeType: file.type,
      size: file.size,
      _webFile: file,
    }
    e.target.value = ''
    if (!validateFile(fileObj)) return
    setReceipt(fileObj)
    setError('')
  }

  function showAttachOptions() {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click()
      return
    }
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
  // -----------------------------------

  async function handleSubmit() {
    setError('')
    if (!description.trim()) {
      setError('La descripción es requerida')
      return
    }

    if (!receipt) {
      setError('Es obligatorio adjuntar un comprobante (foto o PDF) para registrar el gasto.')
      return
    }

    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresá un monto total válido mayor a 0')
      return
    }

    const payments = Object.entries(payerAmounts)
      .map(([id, val]) => ({
        userId: parseInt(id),
        amount: parseFloat(val.replace(',', '.'))
      }))
      .filter(p => !isNaN(p.amount) && p.amount > 0)

    if (payments.length === 0) {
      setError('Debés indicar quién o quiénes pagaron el gasto')
      return
    }

    const sumPayments = payments.reduce((acc, curr) => acc + curr.amount, 0)
    if (Math.abs(sumPayments - parsedAmount) > 0.01) {
      setError(`La suma de los pagos ($${sumPayments.toFixed(2)}) no coincide con el total ($${parsedAmount.toFixed(2)})`)
      return
    }

    setLoading(true)
    try {
      await createExpense(groupId, {
        description: description.trim(),
        amount: parsedAmount,
        category: category,
        expenseDate: expenseDate,
        divisionType: divisionType,
        payments: payments
      }, receipt)

      router.replace('/home')
    } catch (err) {
      const detail = err.response?.data?.detail
      let errorMsg = 'No se pudo registrar el gasto.'

      if (Array.isArray(detail)) {
        errorMsg = detail.map(e => e.msg).join(', ')
      } else if (typeof detail === 'string') {
        errorMsg = detail
      }

      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  if (initLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d5a27" />
      </View>
    )
  }

  const parsedAmount = parseFloat(amount.replace(',', '.'))
  const memberCount = members.length
  const shareAmount = !isNaN(parsedAmount) && parsedAmount > 0 && memberCount > 0
    ? (parsedAmount / memberCount).toFixed(2)
    : null

  const myProfile = members.find(m => m.user_id === myUserId)
  const myName = myProfile ? myProfile.full_name : 'Usuario'

  const receiptLabel = receipt
    ? receipt.name.length > 30
      ? receipt.name.slice(0, 27) + '...'
      : receipt.name
    : null

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Cargar gasto</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#1976d2" />
          <Text style={styles.infoBannerText}>
            Estás cargando como <Text style={{ fontWeight: 'bold' }}>{myName}</Text>. Este gasto quedará registrado a tu nombre y visible para todos los socios.
          </Text>
        </View>

        <View style={styles.card}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>CATEGORÍA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, category === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '1A' }]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons name={cat.icon} size={16} color={cat.color} />
                <Text style={[styles.categoryText, category === cat.id && { color: cat.color, fontWeight: 'bold' }]}>
                  {cat.id}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>DATOS DEL GASTO</Text>

          <Text style={styles.label}>Descripción</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ej: Bomba de agua, Pintura hall..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              maxLength={200}
            />
          </View>

          <Text style={styles.label}>Monto total ($) *</Text>
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

          <Text style={styles.label}>Fecha *</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              value={expenseDate}
              onChangeText={setExpenseDate}
            />
            <Ionicons name="calendar-outline" size={20} color="#333" />
          </View>

          {/* COMPROBANTE UNIFICADO */}
          <Text style={[styles.label, { marginTop: 8 }]}>Comprobante *</Text>
          {receipt ? (
            <View style={styles.receiptAttached}>
              <View style={styles.receiptAttachedLeft}>
                <Ionicons
                  name={receipt.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'}
                  size={20}
                  color="#2d5a27"
                />
                <Text style={styles.receiptAttachedName} numberOfLines={1}>
                  {receiptLabel}
                </Text>
              </View>
              <TouchableOpacity onPress={handleRemoveReceipt} style={styles.receiptRemoveBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color="#777" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={showAttachOptions}>
              <View style={styles.uploadIconWrapper}>
                <Ionicons name="document-attach-outline" size={24} color="#777" />
              </View>
              <View style={styles.uploadTextWrapper}>
                <Text style={styles.uploadButtonText}>Adjuntar ticket o factura</Text>
                <Text style={styles.uploadButtonSub}>Formatos: JPG, PNG, PDF</Text>
              </View>
              <Ionicons name="add-circle" size={24} color="#2d5a27" />
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>¿CÓMO SE DIVIDE?</Text>
          <View style={styles.divisionContainer}>
            <TouchableOpacity
              style={[styles.divisionOption, divisionType === 'EQUALLY' && styles.activeOption]}
              onPress={() => setDivisionType('EQUALLY')}
            >
              <Ionicons name="people-outline" size={20} color={divisionType === 'EQUALLY' ? '#fff' : '#666'} />
              <Text style={[styles.optionText, divisionType === 'EQUALLY' && styles.activeOptionText]}>Partes Iguales</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.divisionOption, divisionType === 'PROPORTIONAL' && styles.activeOption]}
              onPress={() => setDivisionType('PROPORTIONAL')}
            >
              <Ionicons name="business-outline" size={20} color={divisionType === 'PROPORTIONAL' ? '#fff' : '#666'} />
              <Text style={[styles.optionText, divisionType === 'PROPORTIONAL' && styles.activeOptionText]}>% Proporcional</Text>
            </TouchableOpacity>
          </View>

          {shareAmount && (
            <View style={styles.splitInfo}>
              <Text style={styles.splitInfoText}>
                {divisionType === 'EQUALLY'
                  ? `Se dividirá en ${memberCount} partes iguales. Cada socio aportará $${shareAmount}.`
                  : `Se calculará la deuda exacta según los M2 de cada unidad.`}
              </Text>
            </View>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>¿Quién puso la plata? *</Text>
          <View style={styles.payerList}>
            {members.map((m) => {
              const amountValue = payerAmounts[m.user_id]
              const hasPaid = amountValue && parseFloat(amountValue.replace(',', '.')) > 0

              return (
                <View key={m.user_id} style={[styles.payerRow, hasPaid && styles.payerRowActive]}>
                  <View style={styles.payerInfo}>
                    <Text style={[styles.payerName, hasPaid && styles.payerNameActive]}>
                      {m.full_name ?? 'Usuario'}
                      {m.user_id === myUserId ? ' (vos)' : ''}
                    </Text>
                    <Text style={styles.payerMeta}>{m.role} • {m.m2} M2</Text>
                  </View>

                  <View style={styles.payerInputWrapper}>
                    <Text style={styles.payerCurrency}>$</Text>
                    <TextInput
                      style={styles.payerInput}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#999"
                      value={amountValue || ''}
                      onChangeText={(v) => handlePayerChange(m.user_id, v)}
                    />
                  </View>
                </View>
              )
            })}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>✓ Guardar gasto</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
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
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f3ef', overflow: 'hidden' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee' },
  headerInner: { width: '100%', maxWidth: 500, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f3ef', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#000' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, alignItems: 'center' },
  infoBanner: { width: '100%', maxWidth: 500, flexDirection: 'row', backgroundColor: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'flex-start', gap: 8 },
  infoBannerText: { flex: 1, color: '#1565c0', fontSize: 13, lineHeight: 18 },
  card: { width: '100%', maxWidth: 500, backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
  categoryScroll: { gap: 8, paddingBottom: 8, marginTop: 4 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fff' },
  categoryText: { fontSize: 13, color: '#555' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#999', letterSpacing: 1, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500', color: '#555', marginBottom: 8 },
  inputWrapper: { height: 48, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, backgroundColor: '#faf9f7', flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 12 },
  currencyPrefix: { fontSize: 16, fontWeight: '500', color: '#777', marginRight: 6 },

  ...Platform.select({
    web: {
      input: { flex: 1, color: '#333', fontSize: 15, paddingVertical: 0, outlineStyle: 'none' },
      payerInput: { flex: 1, fontSize: 14, color: '#333', textAlign: 'right', padding: 0, outlineStyle: 'none' }
    },
    default: {
      input: { flex: 1, color: '#333', fontSize: 15, paddingVertical: 0 },
      payerInput: { flex: 1, fontSize: 14, color: '#333', textAlign: 'right', padding: 0 }
    }
  }),

  divisionContainer: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  divisionOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  activeOption: { backgroundColor: '#2d5a27', borderColor: '#2d5a27' },
  optionText: { fontSize: 14, fontWeight: '600', color: '#666' },
  activeOptionText: { color: '#fff' },
  splitInfo: { backgroundColor: '#dcedc8', borderRadius: 8, padding: 12, marginBottom: 16 },
  splitInfoText: { fontSize: 13, color: '#33691e', lineHeight: 18 },

  payerList: { gap: 8, marginBottom: 24 },
  payerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#faf9f7' },
  payerRowActive: { borderColor: '#2d5a27', backgroundColor: '#fff' },
  payerInfo: { flex: 1 },
  payerName: { fontSize: 14, color: '#333', fontWeight: '500' },
  payerNameActive: { color: '#2d5a27', fontWeight: '700' },
  payerMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  payerInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, paddingHorizontal: 8, width: 100, height: 36 },
  payerCurrency: { fontSize: 13, color: '#777', marginRight: 4 },

  button: { backgroundColor: '#2d5a27', borderRadius: 8, height: 50, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#d32f2f', backgroundColor: '#ffebee', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, textAlign: 'center', marginBottom: 16, fontSize: 13 },

  uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#faf9f7', borderWidth: 1.5, borderColor: '#e0e0e0', borderStyle: 'dashed', borderRadius: 10, padding: 12, marginBottom: 16 },
  uploadIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  uploadTextWrapper: { flex: 1 },
  uploadButtonText: { fontSize: 14, fontWeight: '600', color: '#444' },
  uploadButtonSub: { fontSize: 12, color: '#888', marginTop: 2 },

  receiptAttached: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#faf9f7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, borderWidth: 1.5, borderColor: '#e0e0e0', gap: 8 },
  receiptAttachedLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  receiptAttachedName: { flex: 1, fontSize: 14, color: '#333', fontWeight: '600' },
  receiptRemoveBtn: { padding: 2 },
})