import { useState, useEffect } from 'react'
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
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getMembers, createExpense } from '../services/group'
import { COLORS } from '../constants/colors'

export default function AddExpenseScreen() {
  const router = useRouter()
  const [groupId, setGroupId] = useState(null)
  const [members, setMembers] = useState([])
  const [myUserId, setMyUserId] = useState(null)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [payerUserId, setPayerUserId] = useState(null)
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
          setPayerUserId(uid)
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

  async function handleSubmit() {
    setError('')
    if (!description.trim()) {
      setError('La descripción es requerida')
      return
    }
    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresá un monto válido mayor a 0')
      return
    }
    if (!payerUserId) {
      setError('Seleccioná quién pagó')
      return
    }

    setLoading(true)
    try {
      await createExpense(groupId, {
        description: description.trim(),
        amount: parsedAmount,
        paidByUserId: payerUserId,
      })
      router.replace('/home')
    } catch (err) {
      const msg = err.response?.data?.detail
      setError(msg ?? 'No se pudo registrar el gasto.')
    } finally {
      setLoading(false)
    }
  }

  if (initLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const memberCount = members.length
  const parsedAmount = parseFloat(amount.replace(',', '.'))
  const shareAmount =
    !isNaN(parsedAmount) && parsedAmount > 0 && memberCount > 0
      ? (parsedAmount / memberCount).toFixed(2)
      : null

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Nuevo gasto</Text>
          <Text style={styles.headerSubtitle}>Se dividirá entre {memberCount} miembro{memberCount !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Descripción *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="create-outline" size={20} color={COLORS.textMuted} style={styles.leftIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ej: Gas, limpieza, reparación..."
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              maxLength={200}
            />
          </View>

          <Text style={styles.label}>Monto *</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          {shareAmount && (
            <View style={styles.splitInfo}>
              <Ionicons name="people-outline" size={16} color={COLORS.primary} />
              <Text style={styles.splitInfoText}>
                Cada miembro paga ${shareAmount}
              </Text>
            </View>
          )}

          <Text style={[styles.label, { marginTop: 8 }]}>¿Quién pagó? *</Text>
          <View style={styles.payerList}>
            {members.map((m) => {
              const selected = payerUserId === m.user_id
              return (
                <TouchableOpacity
                  key={m.user_id}
                  style={[styles.payerOption, selected && styles.payerOptionSelected]}
                  onPress={() => setPayerUserId(m.user_id)}
                >
                  <View style={[styles.payerRadio, selected && styles.payerRadioSelected]}>
                    {selected && <View style={styles.payerRadioDot} />}
                  </View>
                  <Text style={[styles.payerName, selected && styles.payerNameSelected]}>
                    {m.full_name ?? 'Usuario'}
                    {m.user_id === myUserId ? ' (vos)' : ''}
                  </Text>
                </TouchableOpacity>
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
                <Text style={styles.buttonText}>Registrar gasto</Text>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginTop: -20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  leftIcon: {
    marginRight: 8,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  splitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accentLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
    marginTop: -10,
  },
  splitInfoText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  payerList: {
    gap: 8,
    marginBottom: 24,
  },
  payerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  payerOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.accentLight,
  },
  payerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payerRadioSelected: {
    borderColor: COLORS.primary,
  },
  payerRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  payerName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  payerNameSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: COLORS.error,
    backgroundColor: COLORS.errorLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 13,
  },
})
