import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../constants/colors'

const SECTIONS = [
  {
    icon: 'home-outline',
    title: '¿Qué es esta app?',
    content: `Es una app para gestionar los gastos comunes de un grupo (consorcio, casa compartida, etc.). El administrador carga los gastos del edificio, la app divide automáticamente la deuda entre todos los socios, y cada miembro puede registrar sus pagos para saldar esa deuda.`,
  },
  {
    icon: 'calculator-outline',
    title: 'Cómo se dividen los gastos',
    content: `Cuando el administrador carga un gasto, elige cómo dividirlo:\n\n• Partes iguales: cada socio debe la misma porción.\n• Proporcional por M2: la deuda se divide según los metros cuadrados de cada unidad. Por ejemplo, si una unidad tiene el doble de M2, paga el doble.`,
  },
  {
    icon: 'trending-up-outline',
    title: 'Saldo a favor y deuda',
    content: `Tu balance refleja tu situación acumulada:\n\n• Saldo a favor: pagaste más de lo que te correspondía. Alguien te debe plata.\n• Deuda pendiente: te corresponde pagar más de lo que ya aportaste.\n• Al día: estás en cero, todo equilibrado.\n\nEl balance contempla gastos que adelantaste de tu bolsillo, pagos directos al consorcio y distribuciones del Pozo.`,
  },
  {
    icon: 'cash-outline',
    title: 'Cómo hacer un pago',
    content: `En la pantalla "Pagar" podés registrar una transferencia al consorcio. Se requiere adjuntar un comprobante (foto o PDF) obligatoriamente.\n\nTodo pago registrado ingresa automáticamente al Pozo común del grupo, y se acredita en tu balance personal.`,
  },
  {
    icon: 'receipt-outline',
    title: 'Cargar un gasto',
    content: `Al cargar un gasto debés completar:\n\n• Categoría (Reparaciones, Servicios, Limpieza, Seguridad, Otros)\n• Descripción del gasto\n• Monto total\n• Fecha\n• Comprobante (foto o PDF, obligatorio)\n• Tipo de división (iguales o proporcional por M2)\n• Quién o quiénes pusieron el dinero y cuánto cada uno\n\nSi sos administrador, además podés marcar el gasto como "Pagado con el Pozo": en ese caso el Pozo cubre el gasto y nadie queda en deuda por ese concepto.`,
  },
  {
    icon: 'archive-outline',
    title: 'El Pozo: qué es y cómo funciona',
    content: `El Pozo es un fondo común del grupo. Funciona así:\n\n• Cuando un miembro registra un pago (transfiere dinero al consorcio), ese dinero entra al Pozo.\n• El administrador puede usar el Pozo para pagar gastos directamente, sin generar deuda para nadie.\n• Al final de cada mes, el administrador puede distribuir el Pozo entre los socios que tienen saldo a favor.\n• Si hay un aporte mensual configurado, al avanzar el mes todos los socios comienzan el nuevo período debiendo ese monto.`,
  },
  {
    icon: 'arrow-forward-circle-outline',
    title: 'Avanzar el mes',
    content: `Solo el administrador puede avanzar al mes siguiente. Al hacerlo:\n\n1. El saldo acumulado en el Pozo se distribuye entre los socios que tienen saldo a favor (se les debe dinero). Si el Pozo no alcanza para pagarles a todos, se distribuye de forma proporcional.\n\n2. Los socios con deuda NO se "perdonan": si alguien no pagó, sigue debiendo en el próximo mes.\n\n3. Si hay un aporte mensual configurado, se crea automáticamente un gasto para el nuevo mes por ese importe, dividiéndolo en partes iguales entre todos los socios.\n\n4. El mes activo del grupo avanza y se refleja en la pantalla principal.`,
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Administrador vs Miembro',
    content: `El administrador puede:\n• Cargar gastos (incluyendo gastos pagados con el Pozo)\n• Configurar los datos bancarios del consorcio\n• Configurar el aporte mensual del Pozo\n• Ver los pagos de todos los socios\n• Transferir su rol a otro miembro\n• Avanzar el mes\n\nLos miembros pueden:\n• Ver los gastos y su balance personal\n• Registrar sus pagos al consorcio\n• Ver el saldo del Pozo y los movimientos`,
  },
  {
    icon: 'person-add-outline',
    title: 'Cómo unirse a un grupo',
    content: `Para unirse a un grupo existente necesitás el código de invitación que el administrador del grupo te comparte.\n\nEl código solo lo ve el administrador en la pantalla principal (aparece debajo del nombre del grupo).\n\nPara usarlo: en la pantalla de selección de grupos, elegí "Unirse con código", ingresá el código y tus metros cuadrados (M2) de la unidad.`,
  },
  {
    icon: 'information-circle-outline',
    title: 'Otros datos importantes',
    content: `• El balance es histórico y acumulativo: no se resetea al cambiar de mes. Las deudas persisten hasta ser saldadas.\n\n• El mes activo del grupo puede ser diferente al mes calendario: está controlado por el administrador al avanzar el período.\n\n• Los gastos y el resumen de la pantalla principal siempre corresponden al mes activo del grupo.\n\n• Para ver el historial completo de pagos propios, accedé a la pantalla "Pagar" → "Ver historial completo".`,
  },
]

export default function HelpScreen() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cómo usar la app</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Ionicons name="help-circle" size={36} color={COLORS.primary} />
          <Text style={styles.introText}>
            Todo lo que necesitás saber para gestionar tu consorcio.
          </Text>
        </View>

        {SECTIONS.map((section, i) => (
          <View key={i} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrapper}>
                <Ionicons name={section.icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionBody}>{section.content}</Text>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface2, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, alignItems: 'center' },

  intro: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.accentLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  introText: { flex: 1, fontSize: 14, color: COLORS.primary, fontWeight: '600', lineHeight: 20 },

  section: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  sectionBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
})
