import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  categoryLabel,
  formatCents,
  getReport,
  MACRO_CATEGORIES,
  ReportDto,
  reportCsvUrl,
} from '../api';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function ReportScreen() {
  const [month, setMonth] = useState(currentMonth());
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [report, setReport] = useState<ReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getReport({ month, category })
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [month, category]);

  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const target = `${FileSystem.cacheDirectory}despesas-${month}.csv`;
      const { uri } = await FileSystem.downloadAsync(
        reportCsvUrl({ month, category }),
        target,
      );
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv' });
      } else {
        Alert.alert('Exportado', `Ficheiro guardado em: ${uri}`);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar o CSV.');
    } finally {
      setExporting(false);
    }
  }, [month, category]);

  return (
    <View style={styles.container}>
      <View style={styles.monthSelector}>
        <Pressable hitSlop={12} onPress={() => setMonth(shiftMonth(month, -1))}>
          <Text style={styles.monthArrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{month}</Text>
        <Pressable hitSlop={12} onPress={() => setMonth(shiftMonth(month, 1))}>
          <Text style={styles.monthArrow}>›</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={styles.chipsContent}
      >
        <Pressable
          style={[styles.chip, category == null ? styles.chipActive : null]}
          onPress={() => setCategory(undefined)}
        >
          <Text
            style={[
              styles.chipLabel,
              category == null ? styles.chipLabelActive : null,
            ]}
          >
            Todas
          </Text>
        </Pressable>
        {MACRO_CATEGORIES.map((c) => (
          <Pressable
            key={c}
            style={[styles.chip, category === c ? styles.chipActive : null]}
            onPress={() => setCategory(category === c ? undefined : c)}
          >
            <Text
              style={[
                styles.chipLabel,
                category === c ? styles.chipLabelActive : null,
              ]}
            >
              {categoryLabel(c)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {report == null || loading ? (
        <ActivityIndicator size="large" color="#1a73e8" style={styles.loading} />
      ) : (
        <View style={styles.body}>
          <View style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total s/ IVA</Text>
              <Text style={styles.totalsValue}>
                {formatCents(report.totals.net_cents)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IVA</Text>
              <Text style={styles.totalsValue}>
                {formatCents(report.totals.tax_cents)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabelStrong}>Total c/ IVA</Text>
              <Text style={styles.totalsValueStrong}>
                {formatCents(report.totals.total_cents)}
              </Text>
            </View>
          </View>

          <FlatList
            data={report.rows}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowSupplier} numberOfLines={1}>
                    {item.supplier ?? 'Sem nome'}
                  </Text>
                  <Text style={styles.rowSub}>
                    {item.date}  ·  {categoryLabel(item.category)}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowTotal}>
                    {formatCents(item.total_cents)}
                  </Text>
                  <Text style={styles.rowSub}>
                    IVA {item.tax_cents != null ? formatCents(item.tax_cents) : '—'}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>Sem despesas com estes filtros.</Text>
            }
          />

          <Pressable
            style={[styles.exportButton, exporting ? styles.exportDisabled : null]}
            onPress={exportCsv}
            disabled={exporting || report.rows.length === 0}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.exportLabel}>⬇️  Exportar CSV</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  loading: { marginTop: 48 },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  monthArrow: { fontSize: 26, color: '#1a73e8', paddingHorizontal: 20 },
  monthLabel: { fontSize: 16, fontWeight: '600', minWidth: 90, textAlign: 'center' },
  chips: { flexGrow: 0 },
  chipsContent: { paddingHorizontal: 12, gap: 6 },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e8eaed',
    marginRight: 6,
  },
  chipActive: { backgroundColor: '#1a73e8' },
  chipLabel: { fontSize: 13, color: '#444' },
  chipLabelActive: { color: '#fff', fontWeight: '600' },
  body: { flex: 1 },
  totalsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    margin: 16,
    marginBottom: 8,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  totalsLabel: { color: '#666', fontSize: 14 },
  totalsValue: { fontSize: 14, fontWeight: '600' },
  totalsLabelStrong: { fontSize: 15, fontWeight: '700' },
  totalsValueStrong: { fontSize: 15, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLeft: { flex: 1, marginRight: 8 },
  rowRight: { alignItems: 'flex-end' },
  rowSupplier: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, color: '#888', marginTop: 2 },
  rowTotal: { fontSize: 15, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#888', marginTop: 32 },
  exportButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#188038',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  exportDisabled: { opacity: 0.6 },
  exportLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
