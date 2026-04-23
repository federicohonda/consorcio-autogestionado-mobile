import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../constants/colors'

const { width } = Dimensions.get('window')

export default function QuickAccessButtons({ onBalancePress }) {
  const router = useRouter()

  const buttons = [
    {
      id: 'expense',
      label: 'Cargar Gasto',
      icon: 'add-circle',
      color: COLORS.primary,
      onPress: () => router.push('/expenses/add'),
    },
    {
      id: 'payment',
      label: 'Pagar',
      icon: 'cash',
      color: '#2E7D32',
      onPress: () => router.push('/members'),
    },
    {
      id: 'balance',
      label: 'Balance',
      icon: 'bar-chart',
      color: '#1976D2',
      onPress: onBalancePress || (() => {}),
    },
    {
      id: 'report',
      label: 'Reporte',
      icon: 'document-text',
      color: '#F57C00',
      onPress: () => alert('Reporte - Funcionalidad próximamente'),
    },
  ]

  const buttonWidth = (width - 48) / 2 // 48 = 24 padding left + 24 padding right

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {buttons.map((button) => (
          <TouchableOpacity
            key={button.id}
            style={[styles.button, { width: buttonWidth, borderTopColor: button.color }]}
            onPress={button.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: button.color }]}>
              <Ionicons name={button.icon} size={32} color={COLORS.white} />
            </View>
            <Text style={styles.buttonLabel}>{button.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: COLORS.background,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 4,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
})
