import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '@/lib/api';
import { Card, EmptyState, ScreenTitle } from '@/components/ui';
import { clp, formatDate, patientName } from '@/lib/format';
import type { ServiceRequest } from '@/lib/types';
import { colors } from '@/lib/theme';

export default function EarningsScreen() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ data: ServiceRequest[] }>('/services/doctor/me');
        setItems(res.data || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const now = new Date();
  const month = now.getMonth();
  const today = now.toDateString();
  const completed = items.filter((s) => s.status === 'COMPLETED');
  const monthItems = completed.filter((s) => new Date(s.createdAt).getMonth() === month);
  const todayItems = completed.filter((s) => new Date(s.createdAt).toDateString() === today);
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const weekItems = completed.filter((s) => new Date(s.createdAt).getTime() >= weekAgo);
  const sum = (arr: ServiceRequest[]) => arr.reduce((a, s) => a + (s.doctorNetAmount || 0), 0);
  const commission = useMemo(
    () => monthItems.reduce((a, s) => a + (s.commissionAmount || 0), 0),
    [monthItems],
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenTitle title="Ingresos" subtitle={loading ? 'Cargando…' : 'Neto ya descontada la comisión'} />
      <LinearGradient colors={['#0f766e', '#0ea5e9']} style={styles.hero}>
        <Text style={styles.heroLabel}>Este mes</Text>
        <Text style={styles.heroVal}>{clp(sum(monthItems))}</Text>
        <Text style={styles.heroFoot}>{monthItems.length} atenciones · comisión ya descontada</Text>
      </LinearGradient>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.n}>{clp(sum(todayItems)).replace(/\s/g, ' ')}</Text>
          <Text style={styles.l}>Hoy</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.n}>{clp(sum(weekItems))}</Text>
          <Text style={styles.l}>Semana</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.n}>{completed.length}</Text>
          <Text style={styles.l}>Total</Text>
        </View>
      </View>
      <Text style={styles.section}>Últimos pagos</Text>
      {completed.length === 0 ? (
        <EmptyState text="Aún no hay atenciones completadas." />
      ) : (
        <Card>
          {completed.slice(0, 12).map((s) => (
            <View key={s.id} style={styles.row}>
              <Text style={{ flex: 1, color: colors.ink }}>{patientName(s)} · {formatDate(s.createdAt)}</Text>
              <Text style={{ color: colors.ok, fontWeight: '700' }}>+{clp(s.doctorNetAmount || 0)}</Text>
            </View>
          ))}
          {commission > 0 ? (
            <View style={styles.row}>
              <Text style={{ flex: 1, color: colors.ink }}>Comisión plataforma (mes)</Text>
              <Text style={{ color: colors.danger, fontWeight: '700' }}>-{clp(commission)}</Text>
            </View>
          ) : null}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingBottom: 32 },
  hero: { borderRadius: 22, padding: 18, marginBottom: 14 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  heroVal: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  heroFoot: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 8 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  n: { fontSize: 13, fontWeight: '800', color: colors.sky800, textAlign: 'center' },
  l: { fontSize: 11, color: colors.muted, marginTop: 2 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.muted,
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 8,
  },
});
