import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useDoctor } from '@/context/DoctorContext';
import { Button, Card, Pill, ScreenTitle } from '@/components/ui';
import { clp, formatTime, patientName, placeLabel } from '@/lib/format';
import { formatPoints, type LoyaltySummary } from '@/lib/loyalty';
import { apiFetch } from '@/lib/api';
import { colors } from '@/lib/theme';
import { useCallback, useEffect, useState } from 'react';

export default function HomeScreen() {
  const { user } = useAuth();
  const { profile, myServices, available, loading, load, setAvailableOnline } = useDoctor();
  const [toggling, setToggling] = useState(false);
  const [loyalty, setLoyalty] = useState<LoyaltySummary | null>(null);

  const loadLoyalty = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: LoyaltySummary }>('/doctor/loyalty');
      setLoyalty(res.data);
    } catch {
      setLoyalty(null);
    }
  }, []);

  useEffect(() => {
    void loadLoyalty();
  }, [loadLoyalty]);

  const refresh = async () => {
    await Promise.all([load(), loadLoyalty()]);
  };

  const firstName = profile?.user?.firstName || user?.firstName || 'Doctor';
  const active = myServices.find((s) => ['ACCEPTED', 'QUEUED', 'IN_PROGRESS'].includes(s.status));
  const today = new Date().toDateString();
  const todayDone = myServices.filter(
    (s) => s.status === 'COMPLETED' && new Date(s.createdAt).toDateString() === today,
  );
  const todayNet = todayDone.reduce((acc, s) => acc + (s.doctorNetAmount || 0), 0);
  const online = !!profile?.isAvailable;

  const onToggle = async (value: boolean) => {
    setToggling(true);
    try {
      await setAvailableOnline(value);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo cambiar disponibilidad');
    } finally {
      setToggling(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <ScreenTitle title={`Hola, ${firstName}`} subtitle={`${profile?.specialty || 'Prestador'} · ${profile?.isVerified ? 'Verificado' : 'Pendiente de verificación'}`} />
        </View>
        <Pill label={profile?.isVerified ? 'SIS OK' : 'KYC'} tone={profile?.isVerified ? 'ok' : 'warn'} />
      </View>

      <LinearGradient colors={online ? ['#0369a1', '#0ea5e9'] : ['#475569', '#64748b']} style={styles.avail}>
        <View style={styles.availRow}>
          <View>
            <Text style={styles.availLabel}>Estado operativo</Text>
            <Text style={styles.availState}>{online ? 'Disponible' : 'No disponible'}</Text>
          </View>
          <Switch
            value={online}
            onValueChange={onToggle}
            disabled={toggling || !profile}
            trackColor={{ false: 'rgba(255,255,255,0.35)', true: '#22c55e' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.availFoot}>
          {online
            ? 'Recibiendo solicitudes de urgencia'
            : 'No recibirás nuevas urgencias hasta reconectarte'}
        </Text>
      </LinearGradient>

      {active ? (
        <Card>
          <View style={styles.rowBetween}>
            <Pill label="Visita en curso" tone="live" />
            <Pill label={active.status === 'IN_PROGRESS' ? 'En domicilio' : 'En camino'} tone="sky" />
          </View>
          <Text style={styles.cardTitle}>{patientName(active)} · {active.description}</Text>
          <Text style={styles.meta}>{placeLabel(active)}</Text>
          <Button title="Continuar visita" onPress={() => router.push(`/visit/${active.id}`)} style={{ marginTop: 12 }} />
        </Card>
      ) : null}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statN}>{todayDone.length}</Text>
          <Text style={styles.statL}>Hoy</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statN}>{available.length}</Text>
          <Text style={styles.statL}>Cola</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statN}>{clp(todayNet).replace('CLP', '').trim()}</Text>
          <Text style={styles.statL}>Hoy</Text>
        </View>
      </View>

      {loyalty ? (
        <Pressable onPress={() => router.push('/puntos')}>
          <Card>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pointsLabel}>Medicilio Puntos</Text>
                <Text style={styles.pointsVal}>
                  {formatPoints(loyalty.pointsBalance)}{' '}
                  <Text style={styles.pointsUnit}>puntos</Text>
                </Text>
                <Text style={styles.meta}>
                  {loyalty.nextMilestone
                    ? `Próxima meta: ${formatPoints(loyalty.nextMilestone.pointsRequired)} · Te faltan ${formatPoints(loyalty.progress.remaining)}`
                    : 'Todas las metas actuales alcanzadas'}
                </Text>
                <View style={styles.miniTrack}>
                  <View
                    style={[
                      styles.miniFill,
                      { width: `${Math.round(loyalty.progress.ratio * 100)}%` as `${number}%` },
                    ]}
                  />
                </View>
              </View>
              <Pill label={loyalty.level.name} tone="sky" />
            </View>
          </Card>
        </Pressable>
      ) : null}

      <Pressable onPress={() => router.push('/(tabs)/agenda')}>
        <Card>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {active ? `${formatTime(active.createdAt)} · ${patientName(active)}` : 'Sin visita activa'}
              </Text>
              <Text style={styles.meta}>Ver agenda y solicitudes programadas</Text>
            </View>
            <Pill label="Agenda" tone="sky" />
          </View>
        </Card>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 56, paddingHorizontal: 18, paddingBottom: 28 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  avail: { borderRadius: 22, padding: 18, marginBottom: 14 },
  availRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  availState: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  availFoot: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 10 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statN: { fontSize: 18, fontWeight: '800', color: colors.sky800 },
  statL: { fontSize: 11, color: colors.muted, marginTop: 2 },
  pointsLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.sky800,
  },
  pointsVal: { fontSize: 26, fontWeight: '800', color: colors.ink, marginTop: 4 },
  pointsUnit: { fontSize: 14, fontWeight: '600', color: colors.muted },
  miniTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.sky100,
    overflow: 'hidden',
    marginTop: 10,
  },
  miniFill: { height: '100%', borderRadius: 999, backgroundColor: colors.sky600 },
});
