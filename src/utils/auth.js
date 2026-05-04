import { getMyGroup } from '../services/group'

/**
 * Detects the current user's role in their group using the /groups/mine endpoint,
 * which already returns `your_role` and `invite_code` — no JWT decode needed.
 *
 * Returns: { isAdmin, inviteCode, group, activeMonth }
 */
export async function detectGroupRole() {
  try {
    const groupInfo = await getMyGroup()
    const group = Array.isArray(groupInfo) ? groupInfo[0] : groupInfo
    if (!group) return { isAdmin: false, inviteCode: null, group: null, activeMonth: null }

    const role = (group.your_role || '').toLowerCase()
    const isAdmin = role === 'administrador' || role === 'admin'

    return {
      isAdmin,
      inviteCode: isAdmin ? (group.invite_code || null) : null,
      group,
      activeMonth: group.active_month || null,
    }
  } catch (e) {
    console.error('[detectGroupRole] Error al obtener rol del grupo:', e?.message ?? e)
    return { isAdmin: false, inviteCode: null, group: null, activeMonth: null }
  }
}

/**
 * Parses an active_month integer (YYYYMM) into { year, month } (month is 1-based).
 */
export function parseActiveMonth(activeMonth) {
  if (!activeMonth) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }
  return {
    year: Math.floor(activeMonth / 100),
    month: activeMonth % 100,
  }
}
