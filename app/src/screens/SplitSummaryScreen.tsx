import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  closeSplitSession,
  formatCents,
  getSplitSummary,
  SplitSummaryDto,
} from '../api';
import { colors, radius } from '../theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'SplitSummary'>;

const POLL_INTERVAL_MS = 3000;

export function SplitSummaryScreen({ route }: Props) {
  const { token, shareUrl } = route.params;
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<SplitSummaryDto | null>(null);

  const refresh = useCallback(() => {
    getSplitSummary(token)
      .then(setSummary)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const share = useCallback(() => {
    void Share.share({
      message: `Divide a conta comigo: ${shareUrl}`,
    });
  }, [shareUrl]);

  const close = useCallback(() => {
    Alert.alert(
      'Fechar sessão',
      'Depois de fechada, ninguém pode alterar as escolhas. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Fechar',
          style: 'destructive',
          onPress: () => {
            closeSplitSession(token)
              .then(refresh)
              .catch(() =>
                Alert.alert('Erro', 'Não foi possível fechar a sessão.'),
              );
          },
        },
      ],
    );
  }, [refresh, token]);

  if (summary == null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const closed = summary.status === 'closed';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 140 + insets.bottom },
        ]}
      >
        <Text style={styles.merchant}>
          {summary.merchant_name ?? 'Divisão de conta'}
        </Text>
        <Text style={styles.subtitle}>
          Total da fatura: {formatCents(summary.total_cents)}
          {closed ? '  ·  Sessão fechada' : ''}
        </Text>

        {summary.participants.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>Ainda ninguém entrou</Text>
            <Text style={styles.emptyText}>
              Partilha o link — os teus amigos abrem no browser, escolhem o que
              consumiram e os totais aparecem aqui automaticamente.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {summary.participants.map((p) => (
              <View key={p.id} style={styles.participantRow}>
                <View style={styles.participantLeft}>
                  <Text style={styles.participantName}>{p.display_name}</Text>
                  {p.fees_cents !== 0 ? (
                    <Text style={styles.participantSub}>
                      {formatCents(p.subtotal_cents)} + taxas{' '}
                      {formatCents(p.fees_cents)}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.participantTotal}>
                  {formatCents(p.total_cents)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {summary.unclaimed.length > 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Por reclamar</Text>
            {summary.unclaimed.map((u, i) => (
              <Text key={i} style={styles.warningText}>
                {u.description} — {formatCents(u.amount_cents)}
              </Text>
            ))}
          </View>
        ) : null}

        {summary.warnings.map((w, i) => (
          <View key={i} style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ {w}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { bottom: 16 + insets.bottom }]}>
        <Pressable style={styles.shareButton} onPress={share}>
          <Text style={styles.shareLabel}>🔗  Partilhar link</Text>
        </Pressable>
        {!closed ? (
          <Pressable style={styles.closeButton} onPress={close}>
            <Text style={styles.closeLabel}>Fechar sessão</Text>
          </Pressable>
        ) : null}
      </View>
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
  scroll: { padding: 16 },
  merchant: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 2, marginBottom: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyText: { color: colors.textMuted, marginTop: 6, lineHeight: 20 },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  participantLeft: { flex: 1, marginRight: 8 },
  participantName: { fontSize: 16, fontWeight: '600', color: colors.text },
  participantSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  participantTotal: { fontSize: 18, fontWeight: '800', color: colors.accent },
  warningBox: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  warningTitle: {
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 4,
  },
  warningText: { color: colors.warning, fontSize: 13, marginVertical: 1 },
  footer: { position: 'absolute', left: 16, right: 16 },
  shareButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareLabel: { color: colors.onAccent, fontSize: 17, fontWeight: '700' },
  closeButton: { alignItems: 'center', paddingVertical: 12 },
  closeLabel: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
