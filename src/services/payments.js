import api from '../api/api'

export async function getOwnerBalance(groupId, year, month) {
  const params = {}
  if (year) params.year = year
  if (month) params.month = month
  const res = await api.get(`/groups/${groupId}/payments/balance`, { params })
  return res.data
}

export async function createOwnerPayment(groupId, data, receiptFile) {
  const form = new FormData()
  form.append('payment_data', JSON.stringify(data))

  if (receiptFile._webFile) {
    form.append('receipt', receiptFile._webFile, receiptFile.name)
  } else {
    form.append('receipt', {
      uri: receiptFile.uri,
      name: receiptFile.name,
      type: receiptFile.mimeType || 'application/octet-stream',
    })
  }

  const res = await api.post(`/groups/${groupId}/payments`, form)
  return res.data
}

export async function getOwnerPayments(groupId) {
  const res = await api.get(`/groups/${groupId}/payments`)
  return res.data
}

export async function getAllGroupPayments(groupId) {
  const res = await api.get(`/groups/${groupId}/payments/all`)
  return res.data
}

export async function updateBankData(groupId, bankAlias, bankCbu, bankAccountName) {
  const res = await api.patch(`/groups/${groupId}/bank-data`, {
    bankAlias,
    bankCbu,
    bankAccountName,
  })
  return res.data
}
