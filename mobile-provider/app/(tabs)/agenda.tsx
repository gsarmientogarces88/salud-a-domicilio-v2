import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '@/lib/api';
import { Button, Card, EmptyState, Pill, ScreenTitle } from '@/components/ui';
import { formatDate, formatTime, statusLabel } from '@/lib/format';
import type { AppointmentRequest, ServiceRequest } from '@/lib/types';
import { useDoctor } from '@/context/DoctorContext';
import { colors } from '@/lib/theme';

function apptName(r: AppointmentRequest) {
  const u = r.patient?.user;
  return u ? `${u.firstName} ${u.lastName}`.trim() : 'Paciente';
}

function slotTime(r: AppointmentRequest) {
  return formatTime(r.slot?.startAt) !== '—' ? formatTime(r.slot?.startAt) : formatDate(r.createdAt);
}

export default function AgendaScreen() {
  const { myServices, load: loadDoctor } = useDoctor();
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: AppointmentRequest[] }>('/agenda/requests');
      setRequests(res.data || []);
      await loadDoctor(true);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [loadDoctor]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = requests.filter((r) => r.status === 'PENDING' || r.status === 'REQUESTED');
  const todayVisits = myServices.filter((s) => ['ACCEPTED', 'QUEUED', 'IN_PROGRESS'].includes(s.status));

  const accept = async (id: string) => {
    setBusyId(id);
    try {
      await apiFetch(`/agenda/requests/${id}/accept`, { method: 'POST' });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo aceptar');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      await apiFetch(`/agenda/requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'HORARIO' }),
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo rechazar');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={styles.head}>
        <ScreenTitle title="Agenda" subtitle={new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })} />
        {pending.length > 0 ? <Pill label={`${pending.length} pendiente`} tone="warn" /> : null}
      </View>

      {pending.map((r) => (
        <Card key={r.id} style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb' }}>
          <Text style={styles.title}>Solicitud de agenda</Text>
          <Text style={styles.meta}>
            {apptName(r)} · {slotTime(r)} · {r.addressDisplay || r.commune || r.city || 'Domicilio'}
          </Text>
          <View style={styles.btns}>
            <Button title="Rechazar" variant="danger" onPress={() => reject(r.id)} loading={busyId === r.id} style={{ flex: 1 }} />
            <Button title="Aceptar" variant="ok" onPress={() => accept(r.id)} loading={busyId === r.id} style={{ flex: 1 }} />
          </View>
        </Card>
      ))}

      <Text style={styles.section}>Hoy</Text>
      {todayVisits.length === 0 && pending.length === 0 ? (
        <EmptyState text="No hay visitas activas ni solicitudes de agenda." />
      ) : (
        todayVisits.map((s: ServiceRequest) => (
          <Card key={s.id}>
            <View style={styles.row}>
              <Text style={styles.time}>{formatTime(s.scheduledAt || s.createdAt)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{s.pacienteNombre || 'Paciente'}</Text>
                <Text style={styles.meta}>{s.description} · {statusLabel(s.status)}</Text>
              </View>
              <Pill label={s.status === 'IN_PROGRESS' ? 'Live' : 'Activa'} tone="live" />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 56, paddingHorizontal: 18, paddingBottom: 28 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 14, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  btns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.muted,
    marginVertical: 10,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  time: { fontWeight: '700', color: colors.sky700, fontSize: 13, width: 52 },
});
