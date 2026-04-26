import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../constants/colors'

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
      id: 'partners',
      label: 'Socios',
      icon: 'people',
      color: '#2E7D32',
      onPress: () => router.push('/members'),
    },
    {
      id: 'balance',
      label: 'Balance',
      icon: 'bar-chart',
      color: '#1976D2',
      onPress: onBalancePress || (() => { }),
    },
    {
      id: 'report',
      label: 'Reporte',
      icon: 'document-text',
      color: '#F57C00',
      onPress: () => alert('Reporte - Funcionalidad próximamente'),
    },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {buttons.map((button) => (
          <TouchableOpacity
            key={button.id}
            style={[styles.button, { borderTopColor: button.color }]}
            onPress={button.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: button.color }]}>
              <Ionicons name={button.icon} size={22} color="#fff" />
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
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center', // Centra la grilla en pantallas gigantes
  },
  grid: {
    width: '100%',
    maxWidth: 500, // Evita que en PC los botones midan un metro
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    width: '48%', // El porcentaje mágico para mantener siempre el 2x2
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
})