import api from '../api/api'

export async function getPozoInfo(groupId) {
  const res = await api.get(`/groups/${groupId}/pozo`)
  return res.data
}

export async function updatePozoConfig(groupId, monthly_contribution) {
  const res = await api.patch(`/groups/${groupId}/pozo/config`, { monthly_contribution })
  return res.data
}

export async function advanceMonth(groupId) {
  const res = await api.post(`/groups/${groupId}/pozo/advance-month`)
  return res.data
}
