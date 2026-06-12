import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { colors, radius } from '../theme';

export function QrScanScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [atcud, setAtcud] = useState<string | null>(null);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Precisamos de acesso à câmara</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Permitir câmara</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(result) => {
            if (scanned) return;
            setScanned(true);
            const match = result.data.match(/[A-Z0-9]{4,}-\d{5,}/);
            setAtcud(match ? match[0] : result.data);
          }}
        />
      ) : (
        <View style={styles.result}>
          <Text style={styles.resultLabel}>ATCUD detectado</Text>
          <Text style={styles.resultCode}>{atcud}</Text>
          <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Usar</Text>
          </Pressable>
          <Pressable style={styles.retry} onPress={() => setScanned(false)}>
            <Text style={styles.retryText}>Scanear novamente</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.bg },
  text: { color: colors.text, fontSize: 16, marginBottom: 16, textAlign: 'center' },
  btn: { backgroundColor: colors.accent, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center' },
  btnText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
  result: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  resultLabel: { color: colors.textMuted, fontSize: 14, marginBottom: 8 },
  resultCode: { color: colors.accent, fontSize: 20, fontWeight: '800', marginBottom: 24 },
  retry: { marginTop: 12 },
  retryText: { color: colors.textMuted, fontSize: 15 },
});
