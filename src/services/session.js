import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../api/api'

export async function getSessionStatus() {
  const token = await AsyncStorage.getItem('token')

  if (!token) {
    return { isAuthenticated: false, reason: 'missing-token', profile: null }
  }

  try {
    const response = await api.get('/users/me')
    return { isAuthenticated: true, reason: null, profile: response.data }
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 404) {
      await AsyncStorage.removeItem('token')
      return {
        isAuthenticated: false,
        reason: error.response.status === 404 ? 'missing-profile' : 'invalid-token',
        profile: null,
      }
    }
    throw error
  }
}
