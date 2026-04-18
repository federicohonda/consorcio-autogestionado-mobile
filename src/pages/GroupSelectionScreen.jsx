import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { listGroups, joinGroup } from '../services/group'
import { logout } from '../services/auth'
import { COLORS } from '../constants/colors'

export default function GroupSelectionScreen() {
  const router = useRouter()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState(null)
  const [pendingLogout, setPendingLogout] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')
      const data = await listGroups()
      setGroups(data)
    } catch {
      setError('No se pudieron cargar los grupos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleLogout() {
    await logout()
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'groupId', 'groupName'])
    router.replace('/login')
  }

  async function handleJoin(groupId) {
    setJoiningId(groupId)
    try {
      const group = groups.find((g) => g.id === groupId)
      await joinGroup(groupId)
      await AsyncStorage.multiSet([
        ['groupId', String(groupId)],
        ['groupName', group?.name ?? 'Mi grupo'],
      ])
      router.replace('/home')
    } catch (err) {
      const msg = err.response?.data?.detail
      setError(msg ?? 'No se pudo unir al grupo.')
      setJoiningId(null)
    }
  }

  function renderGroup({ item }) {
    const isJoining = joiningId === item.id
    const isMember = !!item.your_role

    return (
      <View style={styles.groupCard}>
        <View style={styles.groupIconWrapper}>
          <Ionicons name={item.icon} size={26} color={COLORS.primary} />
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          {item.admin_name ? (
            <Text style={styles.groupMeta}>Admin: {item.admin_name}</Text>
          ) : null}
          <Text style={styles.groupMeta}>{item.member_count} miembro{item.member_count !== 1 ? 's' : ''}</Text>
        </View>
        {isMember ? (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>{item.your_role}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.joinButton, isJoining && styles.joinButtonDisabled]}
            onPress={() => handleJoin(item.id)}
            disabled={isJoining}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.joinButtonText}>Unirme</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => setPendingLogout(true)}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grupos</Text>
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="business-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Todavía no hay grupos</Text>
          <Text style={styles.emptySubtitle}>¡Sé el primero en crear uno!</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/groups/create')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Crear el primer grupo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGroup}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  logoutConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logoutConfirmText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  logoutYes: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutYesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  logoutNo: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutNoText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.accentLight,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  error: {
    color: COLORS.error,
    backgroundColor: COLORS.errorLight,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 13,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  groupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  groupIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfo: {
    flex: 1,
    gap: 2,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  groupMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.7,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  memberBadge: {
    backgroundColor: COLORS.accentLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  memberBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
})
