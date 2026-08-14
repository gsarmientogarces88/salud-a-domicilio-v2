import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Pill, ScreenTitle } from '@/components/ui';
import type { VerificationPayload } from '@/lib/types';
import { colors } from '@/lib/theme';

const LABELS: Record<string, string> = {
  CEDULA_ANVERSO: 'Cédula (frontal)',
  CEDULA_REVERSO: 'Cédula (reverso)',
  SELFIE_CON_CEDULA: 'Foto de rostro',
  TITULO_MEDICO: 'Título / certificado',
  CERTIFICADO_SIS: 'Registro Superintendencia',
};

export default function VerifyScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<VerificationPayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await apiFetch<{ data: VerificationPayload }>('/doctor/me/verification');
        setData(res.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Inicia sesión para ver tu verificación');
      }
    })();
  }, [user]);

  const uploaded = new Set((data?.documents || []).map((d) => d.type));
  const types = data?.requiredTypes?.length ? data.requiredTypes : Object.keys(LABELS);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenTitle
        title="Valida tu perfil"
        subtitle="Sube documentos desde el panel web o, en la siguiente fase, con la cámara. El equipo revisa en 24–48 h."
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Card>
        {types.map((type) => (
          <View key={type} style={styles.row}>
            <Text style={styles.rowTitle}>{LABELS[type] || type}</Text>
            <Pill label={uploaded.has(type) ? 'Listo' : 'Pendiente'} tone={uploaded.has(type) ? 'ok' : 'warn'} />
          </View>
        ))}
        <View style={styles.row}>
          <Text style={styles.rowTitle}>Datos bancarios</Text>
          <Pill label={data?.bankAccountNumber ? 'Listo' : 'Pendiente'} tone={data?.bankAccountNumber ? 'ok' : 'warn'} />
        </View>
      </Card>
      {data ? (
        <Pill
          label={
            data.isVerified
              ? 'Aprobada'
              : data.verificationStatus === 'SUBMITTED'
                ? 'En revisión'
                : data.verificationStatus
          }
          tone={data.isVerified ? 'ok' : 'warn'}
        />
      ) : null}
      <Button
        title={user ? 'Volver al inicio' : 'Ir a iniciar sesión'}
        onPress={() => router.replace(user ? '/(tabs)' : '/login')}
        style={{ marginTop: 16 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingBottom: 32 },
  error: { color: colors.danger, marginBottom: 12, fontSize: 13 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 8,
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
});
