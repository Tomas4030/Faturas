import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius } from '../theme';
import type { RootStackParamList } from '../navigation';

const ATCUD_REGEX = /[A-Z0-9]{8}-\d{8}/;

export function QrScanScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [atcud, setAtcud] = useState<string | null>(null);

  useEffect(() => {
    BarCodeScanner.requestPermissionsAsync().then(({ status }) =>
      setHasPermission(status === 'granted'),
    );
  }, []);

  const handleScan = ({ data }: BarCodeScannerResult) => {
    if (atcud) return;
    const match = data.match(ATCUD_REGEX);
    if (match) setAtcud(match[0]);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>A pedir permissão da câmara…</Text>
      </View>
    );
  }
  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>Sem acesso à câmara</Text>
      </View>
    );
  }

  if (atcud) {
    return (
      <View style={styles.center}>
        <Text style={styles.label}>ATCUD detectado</Text>
        <Text style={styles.code}>{atcud}</Text>
        <Pressable
          style={styles.btn}
          onPress={() => navigation.navigate('Tabs', { atcud } as any)}
        >
          <Text style={styles.btnText}>Usar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={handleScan}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.overlay}>
        <Text style={styles.hint}>Aponta ao QR code da fatura</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  msg: { color: colors.textMuted, fontSize: 16 },
  label: { color: colors.textMuted, fontSize: 13, letterSpacing: 1, marginBottom: 8 },
  code: { color: colors.accent, fontSize: 22, fontWeight: '700', marginBottom: 24 },
  btn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: 32, paddingVertical: 14 },
  btnText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
  overlay: { position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center' },
  hint: { color: '#fff', fontSize: 15, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.sm },
});
