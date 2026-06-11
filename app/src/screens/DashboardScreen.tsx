import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  categoryLabel,
  formatCents,
  getStatsSummary,
  StatsSummaryDto,
} from '../api';
import { useScanReceipt } from '../hooks/useScanReceipt';
import { colors, radius } from '../theme';
import type { RootStackParamList } from '../navigation';

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function DashboardScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(currentMonth());
  const [stats, setStats] = useState<StatsSummaryDto | null>(null);
  const [loading, setLoading] = useState(false);
  const { scan, uploading } = useScanReceipt();

  const load = useCallback((m: string) => {
    setLoading(true);
    getStatsSummary(m)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(month);
    }, [load, month]),
  );

  const variation =
    stats && stats.previous_month_total_cents > 0
      ? Math.round(
          ((stats.total_cents - stats.previous_month_total_cents) /
            stats.previous_month_total_cents) *
            100,
        )
      : null;

  const maxDay = stats
    ? Math.max(1, ...stats.by_day.map((d) => d.total_cents))
    : 1;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 96 + insets.bottom },
        ]}
      >
        <View style={styles.monthSelector}>
          <Pressable hitSlop={12} onPress={() => setMonth(shiftMonth(month, -1))}>
            <Text style={styles.monthArrow}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
          <Pressable hitSlop={12} onPress={() => setMonth(shiftMonth(month, 1))}>
            <Text style={styles.monthArrow}>›</Text>
          </Pressable>
        </View>

        {stats == null || loading ? (
          <ActivityIndicator
            size="large"
            color={colors.accent}
            style={styles.loading}
          />
        ) : (
          <View>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>ESTE MÊS</Text>
              <Text style={styles.totalValue}>
                {formatCents(stats.total_cents)}
              </Text>
              <Text style={styles.totalSub}>
                {stats.receipt_count}{' '}
                {stats.receipt_count === 1 ? 'fatura' : 'faturas'}
                {variation != null
                  ? `  ·  ${variation >= 0 ? '+' : ''}${variation}% vs mês anterior`
                  : ''}
              </Text>
            </View>

            {stats.insights.map((insight, i) => (
              <View key={i} style={styles.insightCard}>
                <Text style={styles.insightText}>💡 {insight}</Text>
              </View>
            ))}

            {stats.receipt_count === 0 ? (
              <Text style={styles.empty}>
                Sem despesas neste mês. Digitaliza a primeira fatura!
              </Text>
            ) : null}

            {stats.by_category.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>POR CATEGORIA</Text>
                <View style={styles.categoryGrid}>
                  {stats.by_category.map((c) => (
                    <View key={c.category} style={styles.categoryCard}>
                      <Text style={styles.categoryName}>
                        {categoryLabel(c.category)}
                      </Text>
                      <Text style={styles.categoryValue}>
                        {formatCents(c.total_cents)}
                      </Text>
                      <Text style={styles.categoryCount}>
                        {c.count} {c.count === 1 ? 'fatura' : 'faturas'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {stats.by_day.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>POR DIA</Text>
                <View style={styles.chartCard}>
                  <View style={styles.chart}>
                    {stats.by_day.map((d) => (
                      <View key={d.day} style={styles.barColumn}>
                        <View
                          style={[
                            styles.bar,
                            { height: Math.max(4, (d.total_cents / maxDay) * 120) },
                          ]}
                        />
                        <Text style={styles.barLabel}>
                          {Number(d.day.slice(8, 10))}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {stats.top_suppliers.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>TOP FORNECEDORES</Text>
                <View style={styles.suppliersCard}>
                  {stats.top_suppliers.map((s) => (
                    <Pressable
                      key={s.supplier_id}
                      style={styles.supplierRow}
                      onPress={() =>
                        navigation.navigate('SupplierDetail', {
                          supplierId: s.supplier_id,
                        })
                      }
                    >
                      <Text style={styles.supplierName} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <Text style={styles.supplierTotal}>
                        {formatCents(s.total_cents)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <Pressable
              style={styles.reportButton}
              onPress={() => navigation.navigate('Report')}
            >
              <Text style={styles.reportLabel}>📊  Ver relatório</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Pressable
        style={[
          styles.scanButton,
          { bottom: 16 + insets.bottom },
          uploading ? styles.scanDisabled : null,
        ]}
        onPress={scan}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.scanLabel}>📷  Digitalizar fatura</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  loading: { marginTop: 48 },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  monthArrow: { fontSize: 28, color: colors.accent, paddingHorizontal: 20 },
  monthLabel: {
    fontSize: 17,
    fontWeight: '600',
    minWidth: 150,
    textAlign: 'center',
    color: colors.text,
  },
  totalCard: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 12,
  },
  totalLabel: { color: colors.onAccent, fontSize: 12, letterSpacing: 1 },
  totalValue: {
    color: colors.onAccent,
    fontSize: 36,
    fontWeight: '800',
    marginTop: 4,
  },
  totalSub: { color: colors.onAccent, fontSize: 13, marginTop: 6, opacity: 0.8 },
  insightCard: {
    backgroundColor: colors.insightBg,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  insightText: { color: colors.insightText, fontSize: 14 },
  empty: { textAlign: 'center', color: colors.textMuted, marginVertical: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
    color: colors.textMuted,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    width: '48%',
    flexGrow: 1,
  },
  categoryName: { fontSize: 13, color: colors.textMuted },
  categoryValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
    color: colors.text,
  },
  categoryCount: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    minHeight: 140,
  },
  barColumn: { flex: 1, alignItems: 'center' },
  bar: {
    width: '70%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  barLabel: { fontSize: 9, color: colors.textMuted, marginTop: 4 },
  suppliersCard: { backgroundColor: colors.card, borderRadius: radius.md },
  supplierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  supplierName: { fontSize: 15, flex: 1, marginRight: 8, color: colors.text },
  supplierTotal: { fontSize: 15, fontWeight: '600', color: colors.text },
  reportButton: { alignItems: 'center', paddingVertical: 16 },
  reportLabel: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  scanButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  scanDisabled: { opacity: 0.6 },
  scanLabel: { color: colors.onAccent, fontSize: 17, fontWeight: '700' },
});
