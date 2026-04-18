import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS } from '../src/constants/colors'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    AsyncStorage.getItem('token').then((token) => {
      router.replace(token ? '/home' : '/login')
    })
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  )
}
