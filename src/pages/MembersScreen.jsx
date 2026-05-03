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
import { getMembersWithBalance, transferAdmin, leaveGroup } from '../services/group'
import { COLORS } from '../constants/colors'

function BalanceBadge({ netBalance }) {
  const n = parseFloat(netBalance)
  if (isNaN(n)) return null

  if (n > 0.009) {
    return (
      <View style={balanceStyles.badge}>
        <View style={[balanceStyles.dot, { backgroundColor: '#1976D2' }]} />
        <Text style={[balanceStyles.text, { color: '#1565C0' }]}>
          A favor ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
    )
  }
  if (n < -0.009) {
    return (
      <View style={balanceStyles.badge}>
        <View style={[balanceStyles.dot, { backgroundColor: COLORS.error }]} />
        <Text style={[balanceStyles.text, { color: COLORS.error }]}>
          Debe ${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
    )
  }
  return (
    <View style={balanceStyles.badge}>
      <View style={[balanceStyles.dot, { backgroundColor: COLORS.success }]} />
      <Text style={[balanceStyles.text, { color: '#1B5E20' }]}>Al día</Text>
    </View>
  )
}

function InitialsAvatar({ name }) {
  const initials = (name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  )
}

export default function MembersScreen() {
  const router = useRouter()
  const [groupId, setGroupId] = useState(null)
  const [groupName, setGroupName] = useState('')
  const [members, setMembers] = useState([])
  const [myUserId, setMyUserId] = useState(null)
  const [myRole, setMyRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingTransferId, setPendingTransferId] = useState(null)
  const [transferringId, setTransferringId] = useState(null)
  const [pendingLeave, setPendingLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (gid) => {
    try {
      setError('')
      const data = await getMembersWithBalance(gid)
      setMembers(data)
    } catch {
      setError('No se pudo cargar la lista de miembros.')
    }
  }, [])

  useEffect(() => {
    async function init() {
      const [gid, gname, token] = await Promise.all([
        AsyncStorage.getItem('groupId'),
        AsyncStorage.getItem('groupName'),
        AsyncStorage.getItem('token'),
      ])
      if (!gid) { router.replace('/groups'); return }
      setGroupId(gid)
      setGroupName(gname ?? 'Mi grupo')

      if (token) {
        try {
          const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
          const payload = JSON.parse(atob(b64))
          setMyUserId(Number(payload.sub))
        } catch { /* ignore */ }
      }

      await load(gid)
      setLoading(false)
    }
    init()
  }, [load, router])

  useEffect(() => {
    if (myUserId && members.length > 0) {
      const me = members.find((m) => m.user_id === myUserId)
      setMyRole(me?.role ?? null)
    }
  }, [myUserId, members])

  async function doTransfer(newAdminUserId) {
    setTransferringId(newAdminUserId)
    setPendingTransferId(null)
    try {
      await transferAdmin(groupId, newAdminUserId)
      await load(groupId)
    } catch (err) {
      const msg = err.response?.data?.detail
      setError(msg ?? 'No se pudo transferir el rol.')
    } finally {
      setTransferringId(null)
    }
  }

  async function doLeave() {
    setLeaving(true)
    setPendingLeave(false)
    try {
      await leaveGroup(groupId)
      await AsyncStorage.multiRemove(['groupId', 'groupName'])
      router.replace('/groups')
    } catch (err) {
      const msg = err.response?.data?.detail
      setError(msg ?? 'No se pudo salir del grupo.')
    } finally {
      setLeaving(false)
    }
  }

  function renderMember({ item }) {
    const isMe = item.user_id === myUserId
    const isAdmin = item.role === 'Administrador'
    const canTransfer = myRole === 'Administrador' && !isAdmin && !isMe
    const isTransferring = transferringId === item.user_id
    const isPending = pendingTransferId === item.user_id

    return (
      <View style={styles.memberRow}>
        <InitialsAvatar name={item.full_name} />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.full_name ?? 'Usuario'}
            {isMe ? <Text style={styles.youBadge}> (vos)</Text> : null}
          </Text>
          <View style={[styles.roleBadge, isAdmin && styles.roleBadgeAdmin]}>
            <Text style={[styles.roleText, isAdmin && styles.roleTextAdmin]}>
              {item.role}
            </Text>
          </View>
          {item.net_balance !== undefined && (
            <BalanceBadge netBalance={item.net_balance} />
          )}
        </View>

        {canTransfer && !isPending && !isTransferring && (
          <TouchableOpacity
            style={styles.transferButton}
            onPress={() => setPendingTransferId(item.user_id)}
          >
            <Text style={styles.transferButtonText}>Hacer admin</Text>
          </TouchableOpacity>
        )}

        {canTransfer && isPending && (
          <View style={styles.confirmRow}>
            <TouchableOpacity
              style={styles.confirmYes}
              onPress={() => doTransfer(item.user_id)}
            >
              <Text style={styles.confirmYesText}>Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmNo}
              onPress={() => setPendingTransferId(null)}
            >
              <Text style={styles.confirmNoText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {isTransferring && (
          <ActivityIndicator size="small" color={COLORS.primary} />
        )}
      </View>
    )
  }

  function renderLeaveButton() {
    if (leaving) {
      return (
        <View style={styles.leaveButton}>
          <ActivityIndicator size="small" color={COLORS.error} />
        </View>
      )
    }

    if (pendingLeave) {
      return (
        <View style={styles.leaveConfirmWrapper}>
          <Text style={styles.leaveConfirmText}>¿Salir del grupo?</Text>
          <View style={styles.leaveConfirmActions}>
            <TouchableOpacity style={styles.confirmYes} onPress={doLeave}>
              <Text style={styles.confirmYesText}>Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmNo} onPress={() => setPendingLeave(false)}>
              <Text style={styles.confirmNoText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }

    return (
      <TouchableOpacity style={styles.leaveButton} onPress={() => setPendingLeave(true)}>
        <Ionicons name="exit-outline" size={18} color={COLORS.error} />
        <Text style={styles.leaveButtonText}>Salir del grupo</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Miembros</Text>
          <Text style={styles.headerSub}>{groupName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => String(item.user_id)}
          renderItem={renderMember}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No hay miembros</Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {renderLeaveButton()}
            </View>
          }
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  error: {
    color: COLORS.error,
    backgroundColor: COLORS.errorLight,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 13,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  memberRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  memberInfo: {
    flex: 1,
    gap: 5,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  youBadge: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeAdmin: {
    backgroundColor: COLORS.accentLight,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  roleTextAdmin: {
    color: COLORS.primary,
  },
  transferButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
  },
  transferButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 6,
  },
  confirmYes: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  confirmYesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  confirmNo: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  confirmNoText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  footer: {
    marginTop: 8,
    marginBottom: 32,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 0,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  leaveConfirmWrapper: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  leaveConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
    textAlign: 'center',
  },
  leaveConfirmActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
})

const balanceStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
})
