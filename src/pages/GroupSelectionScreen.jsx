import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { joinGroup, getMyGroup } from '../services/group'
import { logout } from '../services/auth'
import { COLORS } from '../constants/colors'

export default function GroupSelectionScreen() {
  const router = useRouter()

  const [inviteCode, setInviteCode] = useState('')
  const [m2, setM2] = useState('')

  const [isModalVisible, setIsModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pendingLogout, setPendingLogout] = useState(false)
  const [error, setError] = useState('')

  async function handleLogout() {
    await logout()
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'groupId', 'groupName'])
    router.replace('/login')
  }

  function handleNext() {
    if (!inviteCode.trim()) {
      setError('Por favor, ingresá el código de invitación.')
      return
    }
    setError('')
    setIsModalVisible(true)
  }

  async function handleJoin() {
    const m2Int = parseInt(m2, 10)
    if (isNaN(m2Int) || m2Int <= 0) {
      setError('Los metros cuadrados (M2) deben ser un número mayor a 0.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await joinGroup({
        inviteCode: inviteCode.trim(),
        m2: m2Int
      })
      const myGroup = await getMyGroup()

      await AsyncStorage.multiSet([
        ['groupId', String(myGroup.id)],
        ['groupName', myGroup.name],
      ])

      setIsModalVisible(false)
      router.replace('/home')
    } catch (err) {
      const msg = err.response?.data?.detail
      setError(msg ?? 'No se pudo unir al consorcio. Verificá el código.')
      setIsModalVisible(false)
    } finally {
      setLoading(false)
    }
  }

  // Separamos el contenido visual para no repetir código en el IF
  const renderContent = () => (
    <View style={styles.inner}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => setPendingLogout(true)}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Consorcios</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/groups/create')}
        >
          <Ionicons name="add" size={22} color={COLORS.primary} />
          <Text style={styles.createButtonText}>Crear</Text>
        </TouchableOpacity>
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

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconWrapper}>
            <Ionicons name="key-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>Unirse a un Consorcio</Text>
          <Text style={styles.cardSubtitle}>
            Ingresá el código que te pasó el administrador.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Código de Invitación</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: K5YNOR"
              placeholderTextColor={COLORS.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleNext}
          >
            <Text style={styles.joinButtonText}>Siguiente</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.createAlternative}
          onPress={() => router.push('/groups/create')}
        >
          <Text style={styles.createAlternativeText}>
            ¿Sos administrador? <Text style={styles.createAlternativeBold}>Creá un consorcio nuevo</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* LA MAGIA SUCEDE ACÁ: Si es Web, no ponemos el Touchable */}
      {Platform.OS === 'web' ? (
        renderContent()
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {renderContent()}
        </TouchableWithoutFeedback>
      )}

      {/* Modal de M2 */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Último paso</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              Para poder calcular las expensas, indicá el tamaño de tu unidad.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tus Metros Cuadrados (M2)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 45"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={m2}
                onChangeText={setM2}
              />
            </View>

            <TouchableOpacity
              style={[styles.joinButton, loading && styles.joinButtonDisabled]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.joinButtonText}>Unirme al Consorcio</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1 },
  header: { backgroundColor: COLORS.surface, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  iconButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface2, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.accentLight },
  createButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  logoutConfirm: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logoutConfirmText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  logoutYes: { backgroundColor: COLORS.error, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  logoutYesText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  logoutNo: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  logoutNoText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  iconWrapper: { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.accentLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16, alignSelf: 'center' },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8 },
  cardSubtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: COLORS.textPrimary },
  joinButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  joinButtonDisabled: { opacity: 0.7 },
  joinButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: COLORS.error, backgroundColor: COLORS.errorLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center', fontSize: 13, marginBottom: 16, overflow: 'hidden' },
  createAlternative: { marginTop: 24, alignItems: 'center' },
  createAlternativeText: { fontSize: 14, color: COLORS.textSecondary },
  createAlternativeBold: { fontWeight: '700', color: COLORS.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  modalText: { fontSize: 14, color: COLORS.textMuted, marginBottom: 20, lineHeight: 20 },
})