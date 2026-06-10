import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getReceipt } from '../api';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Processing'>;

const POLL_INTERVAL_MS = 2000;

export function ProcessingScreen({ navigation, route }: Props) {
  const { receiptId } = route.params;
  const [failureReason, setFailureReason] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setInterval(async () => {
      try {
        const receipt = await getReceipt(receiptId);
        if (!active) return;
        if (receipt.status === 'needs_review' || receipt.status === 'ready') {
          clearInterval(timer);
          navigation.replace('Review', { receiptId });
        } else if (receipt.status === 'failed') {
          clearInterval(timer);
          setFailureReason(
            receipt.failure_reason ??
              'Foto pouco nítida. Aproxima mais a câmara e tenta novamente.',
          );
        }
      } catch {
        // erro de rede transitório: continua o polling
      }
    }, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [navigation, receiptId]);

  if (failureReason != null) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{failureReason}</Text>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonLabel}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1a73e8" />
      <Text style={styles.text}>A ler a fatura…</Text>
      <Text style={styles.subtext}>
        A extrair itens, preços e totais. Isto demora alguns segundos.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#f5f5f7',
  },
  text: { fontSize: 18, fontWeight: '600', marginTop: 20 },
  subtext: { color: '#888', textAlign: 'center', marginTop: 8, fontSize: 14 },
  errorIcon: { fontSize: 40 },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    color: '#d93025',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
