import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radius } from '../theme';

const PLANS = [
  { name: 'Free', price: '0 €', receipts: '5/mês', splits: '2/mês', highlight: false },
  { name: 'Basic', price: '3,99 €', receipts: '30/mês', splits: '15/mês', highlight: false },
  { name: 'Pro', price: '7,99 €', receipts: '150/mês', splits: '50/mês', highlight: true },
  { name: 'Business', price: '19,99 €', receipts: 'Ilimitado', splits: 'Ilimitado', highlight: false },
];

export function UpgradeScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Escolhe o teu plano</Text>
      <Text style={styles.sub}>Faz upgrade para digitalizar mais faturas</Text>

      {PLANS.map((p) => (
        <View
          key={p.name}
          style={[styles.card, p.highlight ? styles.cardHighlight : null]}
        >
          {p.highlight ? <Text style={styles.badge}>Popular</Text> : null}
          <Text style={styles.planName}>{p.name}</Text>
          <Text style={styles.planPrice}>{p.price}/mês</Text>
          <View style={styles.features}>
            <Text style={styles.feature}>📷 {p.receipts} faturas</Text>
            <Text style={styles.feature}>👥 {p.splits} divisões</Text>
          </View>
          <Pressable
            style={[styles.btn, p.highlight ? styles.btnHighlight : null]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.btnText, p.highlight ? styles.btnTextHighlight : null]}>
              {p.name === 'Free' ? 'Plano atual' : 'Em breve'}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHighlight: { borderColor: colors.accent, borderWidth: 2 },
  badge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: colors.accent,
    color: colors.onAccent,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  planName: { fontSize: 18, fontWeight: '700', color: colors.text },
  planPrice: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  features: { marginTop: 10 },
  feature: { fontSize: 14, color: colors.text, marginVertical: 2 },
  btn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  btnHighlight: { backgroundColor: colors.accent, borderColor: colors.accent },
  btnText: { color: colors.textMuted, fontWeight: '600' },
  btnTextHighlight: { color: colors.onAccent },
});
