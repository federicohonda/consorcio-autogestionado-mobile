import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import Ionicons from '@expo/vector-icons/Ionicons'

export default function RootLayout() {
  const [fontsLoaded] = useFonts(Ionicons.font)

  if (!fontsLoaded) return null

  return <Stack screenOptions={{ headerShown: false }} />
}
