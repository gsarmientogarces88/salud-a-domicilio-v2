import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '@/lib/api';
import { Button, Card, MapPlaceholder, Pill } from '@/components/ui';
import { patientName, placeLabel, statusLabel } from '@/lib/format';
import type { ChatMessage, ServiceRequest } from '@/lib/types';
import { colors } from '@/lib/theme';
import { publishLiveLocation, requestForegroundLocation } from '@/features/location';

const STEPS = ['Aceptada', 'En camino', 'En domicilio', 'Cerrar'] as const;

function stepIndex(status: string) {
  if (status === 'COMPLETED') return 3;
  if (status === 'IN_PROGRESS') return 2;
  if (status === 'ACCEPTED' || status === 'QUEUED') return 1;
  return 0;
}

export default function VisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sr, setSr] = useState<ServiceRequest | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [draft, setDraft] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiFetch<{ data: ServiceRequest }>(`/services/${id}`);
      setSr(res.data);
      try {
        const c = await apiFetch<{ data: { messages: ChatMessage[]; canWrite: boolean } }>(
          `/services/${id}/chat`,
        );
        setChat(c.data.messages || []);
        setCanWrite(!!c.data.canWrite);
      } catch {
        setChat([]);
        setCanWrite(false);
      }
    } catch (e) {
      Alert.alert('Visita', e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const pingGps = async () => {
    const coords = await requestForegroundLocation();
    if (coords) await publishLiveLocation(coords);
  };

  const patchStatus = async (status: 'IN_PROGRESS' | 'COMPLETED') => {
    if (!sr) return;
    setBusy(status);
    try {
      await apiFetch(`/services/${sr.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
      if (status === 'COMPLETED') router.replace('/(tabs)/history');
    } catch (e) {
      Alert.alert('Estado', e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setBusy(null);
    }
  };

  const confirmPin = async () => {
    if (!sr) return;
    setBusy('pin');
    try {
      await apiFetch(`/services/${sr.id}/confirm-arrival-pin`, {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
      await patchStatus('IN_PROGRESS');
    } catch (e) {
      Alert.alert('PIN', e instanceof Error ? e.message : 'PIN incorrecto');
      setBusy(null);
    }
  };

  const sendChat = async () => {
    if (!sr || !draft.trim()) return;
    setBusy('chat');
    try {
      await apiFetch(`/services/${sr.id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: draft.trim() }),
      });
      setDraft('');
      await load();
    } catch (e) {
      Alert.alert('Chat', e instanceof Error ? e.message : 'No se pudo enviar');
    } finally {
      setBusy(null);
    }
  };

  const cancel = () => {
    if (!sr) return;
    Alert.alert('Cancelar visita', '¿Cancelar esta atención?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setBusy('cancel');
          try {
            await apiFetch(`/services/${sr.id}/cancel-by-doctor`, {
              method: 'POST',
              body: JSON.stringify({ reason: 'Cancelada desde la app' }),
            });
            router.replace('/(tabs)');
          } catch (e) {
            Alert.alert('Cancelar', e instanceof Error ? e.message : 'No se pudo cancelar');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const openMaps = () => {
    if (!sr) return;
    const q =
      sr.requestLat != null && sr.requestLng != null
        ? `${sr.requestLat},${sr.requestLng}`
        : encodeURIComponent(sr.address || placeLabel(sr));
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`);
  };

  if (loading || !sr) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.sky600} />
      </View>
    );
  }

  const current = stepIndex(sr.status);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.steps}>
        {STEPS.map((label, i) => (
          <View key={label} style={{ flex: 1 }}>
            <View style={[styles.stepBar, i <= current && styles.stepBarOn]} />
            <Text style={[styles.stepLabel, i === current && { color: colors.sky800, fontWeight: '700' }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Pill label={`GPS ${sr.status === 'COMPLETED' ? 'off' : 'ON'}`} tone="live" />
      </View>

      <MapPlaceholder label={placeLabel(sr)} />

      <Card>
        <Text style={styles.title}>{patientName(sr)}</Text>
        <Text style={styles.meta}>
          {sr.description} · {statusLabel(sr.status)}
        </Text>
        <Text style={styles.meta}>{placeLabel(sr)}</Text>
        <View style={styles.btns}>
          <Button title="Abrir mapas" variant="ghost" onPress={openMaps} style={{ flex: 1 }} />
          <Button title="Actualizar GPS" variant="primary" onPress={pingGps} style={{ flex: 1 }} />
        </View>
      </Card>

      {sr.status !== 'IN_PROGRESS' && sr.status !== 'COMPLETED' ? (
        <>
          <Text style={styles.section}>Confirmar llegada (PIN del paciente)</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="••••"
            placeholderTextColor={colors.muted}
            style={styles.pin}
          />
          <Button
            title="Confirmar PIN e iniciar"
            variant="ghost"
            onPress={confirmPin}
            loading={busy === 'pin' || busy === 'IN_PROGRESS'}
            disabled={pin.length < 4}
          />
          <Button
            title="Iniciar sin PIN"
            onPress={() => patchStatus('IN_PROGRESS')}
            loading={busy === 'IN_PROGRESS'}
            style={{ marginTop: 8 }}
          />
        </>
      ) : null}

      <Text style={styles.section}>Chat con paciente</Text>
      <Card>
        {chat.length === 0 ? (
          <Text style={styles.meta}>Sin mensajes aún.</Text>
        ) : (
          chat.map((m) => (
            <View key={m.id} style={[styles.bubble, m.senderType === 'DOCTOR' ? styles.out : styles.in]}>
              <Text style={{ fontSize: 12, color: m.senderType === 'DOCTOR' ? '#334155' : colors.sky800 }}>
                {m.message}
              </Text>
            </View>
          ))
        )}
        {canWrite ? (
          <View style={{ marginTop: 8, gap: 8 }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Escribe un mensaje"
              placeholderTextColor={colors.muted}
              style={styles.chatInput}
            />
            <Button title="Enviar" onPress={sendChat} loading={busy === 'chat'} disabled={!draft.trim()} />
          </View>
        ) : null}
      </Card>

      <View style={styles.btns}>
        {sr.status !== 'COMPLETED' ? (
          <Button title="Cancelar" variant="danger" onPress={cancel} loading={busy === 'cancel'} style={{ flex: 1 }} />
        ) : null}
        {sr.status === 'IN_PROGRESS' ? (
          <Button
            title="Completar"
            variant="ok"
            onPress={() => patchStatus('COMPLETED')}
            loading={busy === 'COMPLETED'}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  steps: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  stepBar: { height: 4, borderRadius: 99, backgroundColor: colors.line, marginBottom: 6 },
  stepBarOn: { backgroundColor: colors.sky500 },
  stepLabel: { fontSize: 10, color: colors.muted, textAlign: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  btns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 14,
    marginBottom: 8,
  },
  pin: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.sky200,
    borderRadius: 12,
    padding: 14,
    fontSize: 22,
    letterSpacing: 10,
    textAlign: 'center',
    marginBottom: 10,
    color: colors.sky800,
    fontWeight: '700',
  },
  bubble: { maxWidth: '80%', padding: 8, borderRadius: 12, marginBottom: 6 },
  in: { backgroundColor: colors.sky100, alignSelf: 'flex-start' },
  out: { backgroundColor: '#f1f5f9', alignSelf: 'flex-end' },
  chatInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.ink,
  },
});
