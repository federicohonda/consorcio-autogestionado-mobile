import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../api/api'

export async function logout() {
  try {
    await api.post('/auth/logout')
  } catch {
    // Si falla en el servidor igual limpiamos local
  } finally {
    await AsyncStorage.multiRemove(['token', 'refreshToken'])
  }
}
