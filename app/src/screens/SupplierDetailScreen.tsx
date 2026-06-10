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
        <ActivityIndicator size="large" color="#1a73e8" />
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
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  total: { fontSize: 30, fontWeight: '700' },
  headerSub: { color: '#888', marginTop: 4 },
  list: { padding: 16 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowDate: { fontSize: 15, fontWeight: '600' },
  rowCategory: { fontSize: 13, color: '#888', marginTop: 2 },
  rowTotal: { fontSize: 16, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#888', marginTop: 32 },
});
