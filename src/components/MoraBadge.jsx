import { View, Text, StyleSheet } from 'react-native'

/**
 * Badge que muestra "EN MORA" si el socio cumple las condiciones
 * Un socio está EN MORA si:
 * - Tiene deuda (net_balance < 0)
 * - Y la deuda tiene más de 30 días sin pagar
 */
export default function MoraBadge({ monto_adeudado, payment_date, estado_economico }) {
  // No mostrar badge si no hay deuda
  const netBalance = parseFloat(monto_adeudado)
  if (isNaN(netBalance) || netBalance >= -0.009) {
    return null
  }

  // Validar que payment_date sea válido
  if (!payment_date) {
    return null
  }

  // Calcular días desde el payment_date
  let daysSincePayment = 0
  try {
    const paymentDate = new Date(payment_date)
    const today = new Date()

    // Limpiar las horas para comparación más precisa
    today.setHours(0, 0, 0, 0)
    paymentDate.setHours(0, 0, 0, 0)

    daysSincePayment = Math.floor((today - paymentDate) / (1000 * 60 * 60 * 24))
  } catch (err) {
    console.warn('Error al calcular días desde payment_date:', err)
    return null
  }

  // Si no pasaron más de 30 días, no mostrar badge
  if (daysSincePayment <= 30) {
    return null
  }

  // Si llegamos aquí, el socio está EN MORA
  return (
    <View style={styles.moraContainer}>
      <Text style={styles.moraIcon}>⚠️</Text>
      <Text style={styles.moraText}>EN MORA</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  moraContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d32f2f',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  moraIcon: {
    fontSize: 14,
  },
  moraText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
})
