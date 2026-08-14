import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useDoctor } from '@/context/DoctorContext';
import { Card, EmptyState, Pill, ScreenTitle } from '@/components/ui';
import { clp, formatDate, patientName, statusLabel } from '@/lib/format';
import { colors } from '@/lib/theme';

const ACTIVE = new Set(['ACCEPTED', 'QUEUED', 'IN_PROGRESS']);

export default function HistoryScreen() {
  const { myServices, loading, load } = useDoctor();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}>
      <ScreenTitle title="Atenciones" subtitle="Historial reciente" />
      {myServices.length === 0 ? (
        <EmptyState text="Aún no tienes atenciones asignadas." />
      ) : (
        <Card>
          {myServices.slice(0, 30).map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push(ACTIVE.has(s.status) ? `/visit/${s.id}` : `/visit/${s.id}`)}
              style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{patientName(s)}</Text>
                <Text style={styles.meta}>
                  {formatDate(s.createdAt)} · {statusLabel(s.status)}
                </Text>
              </View>
              {ACTIVE.has(s.status) ? (
                <Pill label="Activa" tone="sky" />
              ) : (
                <Text style={styles.amount}>{clp(s.doctorNetAmount || s.totalAmount)}</Text>
              )}
            </Pressable>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 56, paddingHorizontal: 18, paddingBottom: 28 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 8,
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  amount: { color: colors.ok, fontWeight: '700' },
});
