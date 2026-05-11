import { View, Text, StyleSheet } from 'react-native'
import { COLORS } from '../constants/colors'

/**
 * Evalúa la fortaleza de una contraseña
 * @param {string} password - Contraseña a evaluar
 * @returns {Object} - { score: number (0-4), label: string, color: string }
 */
export function evaluatePasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: 'Ingresá una contraseña',
      color: COLORS.textMuted,
      isValid: false
    }
  }

  const hasMinLength = password.length >= 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  // Contador de criterios cumplidos
  const criteria = [hasMinLength, hasUpperCase, hasNumber, hasSpecialChar].filter(Boolean).length

  let score = 0
  let label = ''
  let color = ''

  if (criteria === 1) {
    score = 1
    label = 'Muy débil'
    color = COLORS.error
  } else if (criteria === 2) {
    score = 2
    label = 'Débil'
    color = COLORS.warn
  } else if (criteria === 3) {
    score = 3
    label = 'Moderada'
    color = '#F59E0B'
  } else if (criteria >= 4) {
    score = 4
    label = 'Fuerte'
    color = COLORS.success
  }

  // Es válida si tiene mínimo 8 caracteres, mayúscula y número
  const isValid = hasMinLength && hasUpperCase && hasNumber

  return { score, label, color, isValid, details: { hasMinLength, hasUpperCase, hasNumber } }
}

export default function PasswordStrengthIndicator({ password, compact = false }) {
  const { score, label, color, details } = evaluatePasswordStrength(password)

  const barsCount = 4
  const filledBars = score

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.barsRow}>
          {Array.from({ length: barsCount }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                styles.compactBar,
                i < filledBars ? { backgroundColor: color } : { backgroundColor: COLORS.border }
              ]}
            />
          ))}
        </View>
        <Text style={[styles.label, styles.compactLabel, { color }]}>
          {label}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fortaleza de contraseña</Text>
        <Text style={[styles.label, { color }]}>
          {label}
        </Text>
      </View>

      <View style={styles.barsRow}>
        {Array.from({ length: barsCount }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              i < filledBars ? { backgroundColor: color } : { backgroundColor: COLORS.border }
            ]}
          />
        ))}
      </View>

      <View style={styles.requirements}>
        <RequirementItem
          label="Mínimo 8 caracteres"
          met={details.hasMinLength}
        />
        <RequirementItem
          label="Al menos una mayúscula"
          met={details.hasUpperCase}
        />
        <RequirementItem
          label="Al menos un número"
          met={details.hasNumber}
        />
      </View>
    </View>
  )
}

function RequirementItem({ label, met }) {
  return (
    <View style={styles.requirement}>
      <Text style={[styles.requirementCheck, { color: met ? COLORS.success : COLORS.textMuted }]}>
        {met ? '✓' : '○'}
      </Text>
      <Text style={[styles.requirementLabel, { color: met ? COLORS.textSecondary : COLORS.textMuted }]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  compactContainer: {
    marginVertical: 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  label: {
    fontSize: 13,
    fontWeight: '600'
  },
  compactLabel: {
    fontSize: 12,
    marginTop: 6
  },
  barsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12
  },
  bar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden'
  },
  compactBar: {
    height: 4
  },
  requirements: {
    gap: 8
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  requirementCheck: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 16
  },
  requirementLabel: {
    fontSize: 12,
    lineHeight: 16
  }
})
