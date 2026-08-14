import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useDoctor } from '@/context/DoctorContext';
import { Card, EmptyState, Pill, ScreenTitle } from '@/components/ui';
import { clp, patientName, placeLabel, remainingLabel } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function RequestsScreen() {
  const { profile, available, loading, load } = useDoctor();
  const online = !!profile?.isAvailable;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}>
      <View style={styles.head}>
        <ScreenTitle title="Solicitudes" subtitle="Urgentes cerca de ti" />
        <Pill label={online ? 'Online' : 'Offline'} tone={online ? 'live' : 'muted'} />
      </View>

      {!online ? (
        <EmptyState text="Ponte Disponible en Inicio para recibir solicitudes." />
      ) : available.length === 0 ? (
        <EmptyState text="No hay solicitudes en tu radio ahora. La lista se actualiza cada 5 s." />
      ) : (
        available.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/request/${item.id}`)}>
            <Card style={item.type === 'URGENT' ? { borderColor: '#fecaca' } : undefined}>
              <View style={styles.row}>
                <Pill label={item.type === 'URGENT' ? 'Urgente' : 'Programada'} tone={item.type === 'URGENT' ? 'warn' : 'sky'} />
                {item.remainingSeconds != null ? (
                  <Text style={styles.timer}>{remainingLabel(item.remainingSeconds)}</Text>
                ) : null}
              </View>
              <Text style={styles.title}>
                {patientName(item)}
                {item.edadPaciente != null ? ` · ${item.edadPaciente} años` : ''}
              </Text>
              <Text style={styles.meta}>
                {item.description}
                {'\n'}
                {item.distanceKm != null ? `${item.distanceKm} km · ` : ''}
                {placeLabel(item)}
              </Text>
              <View style={styles.row}>
                <Text style={styles.fee}>{clp(item.totalAmount)}</Text>
                <Text style={styles.meta}>Toca para ver</Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 56, paddingHorizontal: 18, paddingBottom: 28 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 8 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 18 },
  fee: { fontWeight: '700', color: colors.ok, fontSize: 15, marginTop: 10 },
  timer: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
