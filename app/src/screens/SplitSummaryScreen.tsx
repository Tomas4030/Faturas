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
  const unclaimedTotal = summary.unclaimed.reduce(
    (s, u) => s + u.amount_cents,
    0,
  );
  const claimedTotal = summary.participants.reduce(
    (s, p) => s + p.total_cents,
    0,
  );

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
        </Text>

        {closed ? (
          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>✓ Sessão fechada</Text>
          </View>
        ) : null}

        {/* Summary bar */}
        {summary.participants.length > 0 ? (
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatCents(claimedTotal)}</Text>
              <Text style={styles.summaryLabel}>Reclamado</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, unclaimedTotal > 0 ? { color: colors.warning } : null]}>
                {formatCents(unclaimedTotal)}
              </Text>
              <Text style={styles.summaryLabel}>Por reclamar</Text>
            </View>
          </View>
        ) : null}

        {/* Participants */}
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
            <Text style={styles.sectionTitle}>Participantes</Text>
            {summary.participants.map((p, i) => (
              <View
                key={p.id}
                style={[
                  styles.participantRow,
                  i === summary.participants.length - 1 ? styles.lastRow : null,
                ]}
              >
                <View style={styles.participantLeft}>
                  <Text style={styles.participantName}>{p.display_name}</Text>
                </View>
                <Text style={styles.participantTotal}>
                  {formatCents(p.total_cents)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Unclaimed items */}
        {summary.unclaimed.length > 0 ? (
          <View style={styles.unclaimedCard}>
            <Text style={styles.unclaimedTitle}>
              Por reclamar ({summary.unclaimed.length} {summary.unclaimed.length === 1 ? 'item' : 'itens'})
            </Text>
            {summary.unclaimed.map((u, i) => (
              <View key={i} style={styles.unclaimedRow}>
                <Text style={styles.unclaimedName} numberOfLines={1}>
                  {u.description}
                </Text>
                <Text style={styles.unclaimedPrice}>
                  {formatCents(u.amount_cents)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {summary.warnings.map((w, i) => (
          <View key={i} style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ {w}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
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
  closedBadge: {
    backgroundColor: colors.success + '22',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  closedText: { color: colors.success, fontSize: 13, fontWeight: '600' },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.accent },
  summaryLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: colors.border },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8 },
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
  lastRow: { borderBottomWidth: 0 },
  participantLeft: { flex: 1, marginRight: 8 },
  participantName: { fontSize: 16, fontWeight: '600', color: colors.text },
  participantTotal: { fontSize: 18, fontWeight: '800', color: colors.accent },
  unclaimedCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  unclaimedTitle: {
    fontWeight: '700',
    color: colors.warning,
    fontSize: 13,
    marginBottom: 8,
  },
  unclaimedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  unclaimedName: { flex: 1, fontSize: 14, color: colors.textMuted, marginRight: 8 },
  unclaimedPrice: { fontSize: 14, color: colors.text, fontWeight: '600' },
  warningBox: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  warningText: { color: colors.warning, fontSize: 13 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
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
