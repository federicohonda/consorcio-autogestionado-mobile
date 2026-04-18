import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS } from '../src/constants/colors'
import HomeScreen from '../src/pages/HomeScreen'

export default function Home() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('token').then((token) => {
      if (!token) {
        router.replace('/login')
      } else {
        setReady(true)
      }
    })
  }, [])

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return <HomeScreen />
}
