import { useState } from 'react'
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
import { createGroup } from '../services/group'
import { COLORS } from '../constants/colors'

const GROUP_ICONS = [
  { name: 'business-outline',   label: 'Edificio' },
  { name: 'home-outline',       label: 'Casa' },
  { name: 'storefront-outline', label: 'Local' },
  { name: 'library-outline',    label: 'Torre' },
  { name: 'hotel-outline',      label: 'Hotel' },
  { name: 'albums-outline',     label: 'Complejo' },
]

export default function CreateGroupScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('business-outline')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setError('')
    if (!name.trim()) {
      setError('El nombre del grupo es requerido')
      return
    }

    setLoading(true)
    try {
      const group = await createGroup({ name: name.trim(), description: description.trim() || undefined, icon })
      await AsyncStorage.multiSet([
        ['groupId', String(group.id)],
        ['groupName', group.name],
      ])
      router.replace('/home')
    } catch (err) {
      const msg = err.response?.data?.detail
      setError(msg ?? 'No se pudo crear el grupo. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

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
          <Text style={styles.headerTitle}>Crear grupo</Text>
          <Text style={styles.headerSubtitle}>Configurá tu consorcio</Text>
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

          <Text style={styles.label}>Nombre del grupo *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="people-outline" size={20} color={COLORS.textMuted} style={styles.leftIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ej: Edificio Palermo 1234"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={100}
            />
          </View>

          <Text style={styles.label}>Descripción (opcional)</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Agregá una descripción breve"
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={300}
              textAlignVertical="top"
            />
          </View>

          <Text style={styles.label}>Icono del grupo</Text>
          <View style={styles.iconGrid}>
            {GROUP_ICONS.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.iconOption, icon === item.name && styles.iconOptionSelected]}
                onPress={() => setIcon(item.name)}
              >
                <Ionicons
                  name={item.name}
                  size={28}
                  color={icon === item.name ? '#fff' : COLORS.primary}
                />
                <Text style={[styles.iconLabel, icon === item.name && styles.iconLabelSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Crear grupo</Text>
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
    marginTop: 4,
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
  textAreaWrapper: {
    height: 80,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  textArea: {
    height: 56,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
    marginTop: 4,
  },
  iconOption: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  iconLabel: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  iconLabelSelected: {
    color: '#fff',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
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
