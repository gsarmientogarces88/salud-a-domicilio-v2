import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import { colors } from '@/lib/theme';

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!loading && user) return <Redirect href="/(tabs)" />;

  const onSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  const recoverPassword = () => {
    const message = encodeURIComponent(
      'Hola Medicilio, soy prestador y necesito recuperar el acceso a mi cuenta.',
    );
    Linking.openURL(`https://wa.me/56998487300?text=${message}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.phone}>
          <LinearGradient colors={['#1d69a8', '#139fd0']} style={styles.hero}>
            <View style={styles.logoFrame}>
              <Image
                source={require('../assets/images/logo-medicilio-icon.png')}
                style={styles.logo}
                accessibilityLabel="Logo de Medicilio"
              />
            </View>
            <Text style={styles.brand}>Medicilio</Text>
            <Text style={styles.tagline}>SALUD A DOMICILIO</Text>
            <Text style={styles.appLabel}>APP PRESTADOR</Text>
          </LinearGradient>

          <View style={styles.panel}>
            <Text style={styles.h2}>Bienvenido, doctor</Text>
            <Text style={styles.muted}>Solo para profesionales verificados</Text>

            <Text style={styles.label}>CORREO PROFESIONAL</Text>
            <View style={[styles.inputShell, focusedField === 'email' && styles.inputShellFocused]}>
              <Text style={styles.inputIcon}>@</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="doctor@clinica.cl"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                accessibilityLabel="Correo profesional"
              />
            </View>

            <Text style={styles.label}>CONTRASEÑA</Text>
            <View
              style={[styles.inputShell, focusedField === 'password' && styles.inputShellFocused]}>
              <Text style={styles.inputIcon}>●</Text>
              <TextInput
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                returnKeyType="go"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={onSubmit}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                accessibilityLabel="Contraseña"
              />
              <Pressable
                onPress={() => setShowPassword((current) => !current)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                <Text style={styles.eye}>{showPassword ? 'Ocultar' : 'Ver'}</Text>
              </Pressable>
            </View>

            <Pressable onPress={recoverPassword} style={styles.forgot} accessibilityRole="link">
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </Pressable>

            <View style={styles.trustBadge}>
              <Text style={styles.shield}>✓</Text>
              <Text style={styles.trustText}>
                Acceso exclusivo · Prestadores inscritos en la Superintendencia de Salud
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <Button
              title="Entrar a atender"
              onPress={onSubmit}
              loading={busy}
              disabled={!email.trim() || !password}
              style={styles.submit}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>CUENTA MÉDICA</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable onPress={() => router.push('/verify')} style={styles.verifyLink}>
              <Text style={styles.newText}>¿Eres nuevo? </Text>
              <Text style={styles.verifyText}>Verificar cuenta médica</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: '#eaf1f8' },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'web' ? 24 : 0,
  },
  phone: {
    width: '100%',
    maxWidth: 480,
    minHeight: Platform.OS === 'web' ? 760 : '100%',
    backgroundColor: '#fff',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          borderRadius: 36,
          borderWidth: 1,
          borderColor: '#d6e1ee',
          shadowColor: '#0f172a',
          shadowOpacity: 0.12,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
        }
      : {}),
  },
  hero: {
    minHeight: 300,
    paddingTop: Platform.OS === 'ios' ? 72 : 56,
    paddingBottom: 64,
    alignItems: 'center',
  },
  logoFrame: {
    width: 92,
    height: 92,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#075985',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 14,
  },
  brand: { marginTop: 18, fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  tagline: { marginTop: 8, color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  appLabel: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  panel: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    marginTop: -34,
    paddingHorizontal: 28,
    paddingTop: 38,
    paddingBottom: 30,
  },
  h2: { fontSize: 25, fontWeight: '800', color: colors.ink },
  muted: { color: colors.muted, fontSize: 14, marginBottom: 28, marginTop: 5 },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  inputShell: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#d9e3ee',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
    backgroundColor: '#f8fafc',
  },
  inputShellFocused: {
    borderColor: '#1671bd',
    backgroundColor: '#f3f7ff',
  },
  inputIcon: { width: 18, color: '#1d69a8', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  input: {
    flex: 1,
    minHeight: 52,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 0,
  },
  eye: { color: '#0369a1', fontSize: 12, fontWeight: '700' },
  forgot: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 22, minHeight: 32, justifyContent: 'center' },
  forgotText: { color: '#0369a1', fontSize: 13, fontWeight: '600' },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7e7c8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  shield: { color: '#07864f', fontSize: 14, fontWeight: '900' },
  trustText: { flex: 1, color: '#087a49', fontSize: 11, fontWeight: '600', lineHeight: 16 },
  errorBox: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
  },
  error: { color: colors.dangerDark, fontSize: 12, lineHeight: 17 },
  submit: { minHeight: 56, borderRadius: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { color: '#94a3b8', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  verifyLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 38,
  },
  newText: { color: '#94a3b8', fontSize: 13 },
  verifyText: { color: '#0369a1', fontWeight: '800', fontSize: 13 },
});
