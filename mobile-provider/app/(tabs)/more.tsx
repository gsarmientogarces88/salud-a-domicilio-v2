import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useDoctor } from '@/context/DoctorContext';
import { Card, Row, ScreenTitle } from '@/components/ui';
import { clp } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const { profile, myServices } = useDoctor();
  const month = new Date().getMonth();
  const monthNet = myServices
    .filter((s) => s.status === 'COMPLETED' && new Date(s.createdAt).getMonth() === month)
    .reduce((acc, s) => acc + (s.doctorNetAmount || 0), 0);

  const onLogout = () => {
    Alert.alert('Cerrar sesión', '¿Salir de Medicilio Prestador?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenTitle
        title="Más"
        subtitle={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email}
      />
      <Card>
        <Row title="Ingresos" right={`${clp(monthNet)} este mes →`} onPress={() => router.push('/earnings')} />
        <Row
          title="Verificación"
          right={profile?.isVerified ? 'Aprobada' : profile?.verificationStatus || 'Pendiente'}
          onPress={() => router.push('/verify')}
        />
        <Row title="Horarios semanales" right="Web · Próximamente" />
        <Row title="Tarifa base" right={clp(profile?.baseFee)} />
        <Row title="Soporte" right="WhatsApp web" />
        <Row title="Cerrar sesión" right="" onPress={onLogout} />
      </Card>
      <Text style={styles.ver}>Medicilio Prestador · Expo MVP</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 56, paddingHorizontal: 18, paddingBottom: 28 },
  ver: { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 16 },
});
