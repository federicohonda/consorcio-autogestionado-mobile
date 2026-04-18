import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getMyGroup } from '../src/services/group'
import { COLORS } from '../src/constants/colors'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        router.replace('/login')
        return
      }

      try {
        const group = await getMyGroup()
        await AsyncStorage.multiSet([
          ['groupId', String(group.id)],
          ['groupName', group.name],
        ])
        router.replace('/home')
      } catch (err) {
        if (err.response?.status === 404) {
          router.replace('/groups')
        } else {
          router.replace('/login')
        }
      }
    }
    init()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  )
}
