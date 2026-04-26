import api from '../api/api'

export async function getMyGroup() {
  const res = await api.get('/groups/mine')
  return res.data
}

export async function createGroup(data) {
  const res = await api.post('/groups', data)
  return res.data
}

export async function joinGroup(data) {
  const res = await api.post('/groups/join', data)
  return res.data
}

export async function getMembers(groupId) {
  const res = await api.get(`/groups/${groupId}/members`)
  return res.data
}

export async function transferAdmin(groupId, newAdminUserId) {
  const res = await api.patch(`/groups/${groupId}/transfer-admin`, { newAdminUserId })
  return res.data
}

export async function createExpense(groupId, data, receiptFile) {
  const form = new FormData()
  form.append('expense_data', JSON.stringify(data))

  if (receiptFile) {
    if (receiptFile._webFile) {
      form.append('receipt', receiptFile._webFile, receiptFile.name)
    } else {
      form.append('receipt', {
        uri: receiptFile.uri,
        name: receiptFile.name,
        type: receiptFile.mimeType || 'application/octet-stream',
      })
    }
  }

  const res = await api.post(`/groups/${groupId}/expenses`, form)
  return res.data
}

export async function getMonthlySummary(groupId, year, month) {
  const params = {}
  if (year) params.year = year
  if (month) params.month = month
  const res = await api.get(`/groups/${groupId}/summary`, { params })
  return res.data
}

export async function leaveGroup(groupId) {
  const res = await api.post(`/groups/${groupId}/leave`)
  return res.data
}

export async function getExpenses(groupId, year, month) {
  const params = {}
  if (year) params.year = year
  if (month) params.month = month
  const res = await api.get(`/groups/${groupId}/expenses`, { params })
  return res.data
}
