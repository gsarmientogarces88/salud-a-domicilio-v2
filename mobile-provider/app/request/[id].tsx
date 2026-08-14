import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '@/lib/api';
import { useDoctor } from '@/context/DoctorContext';
import { Button, Card, MapPlaceholder, Pill } from '@/components/ui';
import { clp, patientName, placeLabel, remainingLabel } from '@/lib/format';
import { colors } from '@/lib/theme';
import { requestForegroundLocation, publishLiveLocation } from '@/features/location';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { available, load } = useDoctor();
  const item = available.find((s) => s.id === id);
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);

  if (!item) {
    return (
      <View style={styles.missing}>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>
          Esta solicitud ya no está disponible (aceptada, expirada o fuera de radio).
        </Text>
        <Button title="Volver a solicitudes" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const accept = async () => {
    setBusy('accept');
    try {
      const coords = await requestForegroundLocation();
      if (coords) await publishLiveLocation(coords).catch(() => undefined);
      await apiFetch(`/services/${item.id}/accept`, { method: 'POST' });
      await load(true);
      router.replace(`/visit/${item.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo aceptar');
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    setBusy('reject');
    try {
      await apiFetch(`/services/${item.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'No disponible en este momento' }),
      });
      await load(true);
      router.back();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo rechazar');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <MapPlaceholder
        label={item.distanceKm != null ? `Paciente · ${item.distanceKm} km` : 'Paciente'}
      />
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{patientName(item)}</Text>
            <Text style={styles.meta}>
              {item.edadPaciente != null ? `${item.edadPaciente} años · ` : ''}
              {placeLabel(item)}
            </Text>
          </View>
          {item.remainingSeconds != null ? (
            <Text style={styles.timer}>{remainingLabel(item.remainingSeconds)}</Text>
          ) : null}
        </View>
        <Text style={styles.body}>{item.description}</Text>
        {item.referencias ? <Text style={styles.meta}>{item.referencias}</Text> : null}
        <View style={styles.pills}>
          {item.distanceKm != null ? <Pill label={`${item.distanceKm} km`} tone="sky" /> : null}
          <Pill label={clp(item.totalAmount)} tone="ok" />
        </View>
      </Card>
      <View style={styles.btns}>
        <Button title="Rechazar" variant="danger" onPress={reject} loading={busy === 'reject'} style={{ flex: 1 }} />
        <Button title="Aceptar" variant="ok" onPress={accept} loading={busy === 'accept'} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingBottom: 32 },
  missing: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  body: { marginTop: 12, fontSize: 14, lineHeight: 20, color: colors.ink },
  pills: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  btns: { flexDirection: 'row', gap: 10 },
  timer: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
});
