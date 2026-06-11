import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  categoryLabel,
  formatCents,
  getSupplier,
  SupplierDetailDto,
} from '../api';
import { colors, radius } from '../theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'SupplierDetail'>;

export function SupplierDetailScreen({ navigation, route }: Props) {
  const { supplierId } = route.params;
  const [supplier, setSupplier] = useState<SupplierDetailDto | null>(null);

  useFocusEffect(
    useCallback(() => {
      getSupplier(supplierId)
        .then((s) => {
          setSupplier(s);
          navigation.setOptions({ title: s.name });
        })
        .catch(() => {});
    }, [navigation, supplierId]),
  );

  if (supplier == null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.total}>{formatCents(supplier.total_cents)}</Text>
        <Text style={styles.headerSub}>
          {categoryLabel(supplier.category)}
          {supplier.nif ? `  ·  NIF ${supplier.nif}` : ''}
        </Text>
      </View>
      <FlatList
        data={supplier.receipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('Review', { receiptId: item.id })}
          >
            <View>
              <Text style={styles.rowDate}>{item.date}</Text>
              <Text style={styles.rowCategory}>
                {categoryLabel(item.category)}
              </Text>
            </View>
            <Text style={styles.rowTotal}>{formatCents(item.total_cents)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Sem faturas deste fornecedor.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.card,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  total: { fontSize: 30, fontWeight: '800', color: colors.text },
  headerSub: { color: colors.textMuted, marginTop: 4 },
  list: { padding: 16 },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowDate: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowCategory: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  rowTotal: { fontSize: 16, fontWeight: '700', color: colors.text },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 32 },
});
