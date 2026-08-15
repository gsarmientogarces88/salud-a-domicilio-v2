import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '@/lib/api';
import { formatPoints, type LoyaltyHistoryRow, type LoyaltySummary } from '@/lib/loyalty';
import { formatDate } from '@/lib/format';
import { Button, Card, EmptyState, Pill, ScreenTitle } from '@/components/ui';
import { colors } from '@/lib/theme';

export default function PuntosScreen() {
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [rows, setRows] = useState<LoyaltyHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ackBusy, setAckBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [s, h] = await Promise.all([
        apiFetch<{ data: LoyaltySummary }>('/doctor/loyalty'),
        apiFetch<{ data: LoyaltyHistoryRow[] }>('/doctor/loyalty/history?page=1&limit=40'),
      ]);
      setSummary(s.data);
      setRows(h.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar Medicilio Puntos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unseen = summary?.unseenMilestones[0] ?? null;
  const pct = Math.round((summary?.progress.ratio ?? 0) * 100);

  const ackMilestone = async () => {
    if (!unseen) return;
    setAckBusy(true);
    try {
      await apiFetch(`/doctor/loyalty/milestones/${unseen.id}/ack`, { method: 'POST' });
      setSummary((prev) =>
        prev
          ? { ...prev, unseenMilestones: prev.unseenMilestones.filter((m) => m.id !== unseen.id) }
          : prev,
      );
    } catch {
      // El modal no debe bloquear; se reintentará al recargar.
      setSummary((prev) =>
        prev
          ? { ...prev, unseenMilestones: prev.unseenMilestones.filter((m) => m.id !== unseen.id) }
          : prev,
      );
    } finally {
      setAckBusy(false);
    }
  };

  const remainingLabel = !summary?.nextMilestone
    ? 'Has alcanzado la meta más alta disponible por ahora.'
    : summary.progress.remaining === 1
      ? 'Te falta 1 atención para alcanzar tu próxima meta.'
      : `Te faltan ${formatPoints(summary.progress.remaining)} atenciones para alcanzar tu próxima meta.`;

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}>
        <ScreenTitle
          title="Medicilio Puntos"
          subtitle="Reconocimiento por atenciones completadas"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {summary ? (
          <>
            <LinearGradient colors={['#0369a1', '#0ea5e9']} style={styles.hero}>
              <View style={styles.heroTop}>
                <Text style={styles.heroLabel}>Puntos acumulados</Text>
                <Pill label={summary.level.name} tone="sky" />
              </View>
              <Text style={styles.heroVal}>
                {formatPoints(summary.pointsBalance)}
                <Text style={styles.heroUnit}> puntos</Text>
              </Text>
              <Text style={styles.heroFoot}>
                {formatPoints(summary.completedVisitsCount)} atenciones completadas
              </Text>
            </LinearGradient>

            <Card>
              <Text style={styles.sectionLabel}>Próxima meta</Text>
              <Text style={styles.nextTitle}>
                {summary.nextMilestone
                  ? `${formatPoints(summary.nextMilestone.pointsRequired)} atenciones`
                  : 'Todas las metas actuales'}
              </Text>
              {summary.lastReachedMilestone ? (
                <Text style={styles.reached}>
                  Meta alcanzada: {formatPoints(summary.lastReachedMilestone.pointsRequired)}
                </Text>
              ) : null}

              <View style={styles.progressHead}>
                <Text style={styles.progressFrac}>
                  {formatPoints(summary.progress.current)} / {formatPoints(summary.progress.target)}
                </Text>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` as `${number}%` }]} />
              </View>
              <Text style={styles.remaining}>{remainingLabel}</Text>
            </Card>
          </>
        ) : loading ? (
          <EmptyState text="Cargando puntos…" />
        ) : null}

        <Text style={styles.section}>Historial de puntos</Text>
        {rows.length === 0 && !loading ? (
          <EmptyState text="Aún no hay movimientos de puntos." />
        ) : (
          <Card>
            {rows.map((row) => (
              <View key={row.id} style={styles.histRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histConcept}>{row.concept}</Text>
                  <Text style={styles.histMeta}>{formatDate(row.date)}</Text>
                  {row.patientLabel ? (
                    <Text style={styles.histMeta}>Paciente: {row.patientLabel}</Text>
                  ) : (
                    <Text style={styles.histMeta}>Atención #{row.displayId}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.histPts}>
                    {row.points > 0 ? `+${row.points}` : String(row.points)}
                  </Text>
                  <Text style={styles.histMeta}>Saldo {formatPoints(row.balanceAfter)}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <Modal visible={!!unseen} transparent animationType="fade" onRequestClose={() => void ackMilestone()}>
        <Pressable style={styles.modalBackdrop} onPress={() => void ackMilestone()}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalEyebrow}>Medicilio Puntos</Text>
            <Text style={styles.modalTitle}>🎉 ¡Nueva meta alcanzada!</Text>
            <Text style={styles.modalBody}>
              Has completado {formatPoints(unseen?.pointsRequired || 0)} atenciones a través de
              Medicilio.
            </Text>
            <Text style={styles.modalBodyMuted}>
              Gracias por formar parte de nuestra red médica.
            </Text>
            <Button
              title="Continuar"
              loading={ackBusy}
              onPress={() => void ackMilestone()}
              style={{ marginTop: 16 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingBottom: 36 },
  error: { color: colors.danger, marginBottom: 10, fontSize: 13 },
  hero: { borderRadius: 22, padding: 18, marginBottom: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  heroVal: { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 8 },
  heroUnit: { fontSize: 16, fontWeight: '600' },
  heroFoot: { color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  nextTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 6 },
  reached: { fontSize: 12, color: colors.okDark, marginTop: 4 },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  },
  progressFrac: { fontSize: 13, fontWeight: '600', color: colors.ink },
  progressPct: { fontSize: 12, color: colors.muted },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.sky100,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.sky600,
  },
  remaining: { fontSize: 13, color: colors.muted, marginTop: 10 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.muted,
    marginVertical: 12,
  },
  histRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  histConcept: { fontSize: 14, fontWeight: '600', color: colors.ink },
  histMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  histPts: { fontSize: 15, fontWeight: '800', color: colors.ok },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.sky800,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 8 },
  modalBody: { fontSize: 14, color: colors.ink, marginTop: 12, lineHeight: 20 },
  modalBodyMuted: { fontSize: 13, color: colors.muted, marginTop: 8, lineHeight: 19 },
});
