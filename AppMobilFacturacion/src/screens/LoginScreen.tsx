import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, DeveloperCredit, Input, Screen } from '../components';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { ApiError } from '../services/http';
import { syncCatalogsFromApi } from '../services/syncService';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = () => {
  const [email, setEmail] = useState('fernando@epikom.com');
  const [password, setPassword] = useState('demo1234');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Ingresa correo y contraseña');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await authApi.login(email.trim(), password);
      await setSession(resp.token, resp.vendedor, resp.empresa);
      if (resp.empresa) {
        // Descarga catálogos en background para que la app funcione offline
        syncCatalogsFromApi(resp.empresa.id).catch((err) =>
          console.warn('Sync de catálogos falló (se reintentará):', err),
        );
      }
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : 'Error inesperado. Intenta de nuevo.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen backgroundColor={colors.surface}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="receipt" size={40} color={colors.textInverse} />
            </View>
            <Text style={styles.brand}>FactúMóvil</Text>
            <Text style={styles.brandSub}>Facturación en campo</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>Ingresa con tu cuenta de vendedor</Text>

            <View style={{ gap: spacing.lg, marginTop: spacing.xxl }}>
              <Input
                label="Correo electrónico"
                icon="mail-outline"
                placeholder="tu@empresa.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
              <Input
                label="Contraseña"
                icon="lock-closed-outline"
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.row}>
              <Pressable
                onPress={() => setRemember(!remember)}
                style={styles.checkRow}
                hitSlop={8}
              >
                <View style={[styles.checkbox, remember && styles.checkboxOn]}>
                  {remember && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
                </View>
                <Text style={styles.checkLabel}>Recordarme</Text>
              </Pressable>
              <Pressable hitSlop={8}>
                <Text style={styles.link}>¿Olvidaste tu clave?</Text>
              </Pressable>
            </View>

            {errorMsg && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.dangerDark} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <View style={{ marginTop: spacing.xxl }}>
              <Button
                label="Iniciar sesión"
                size="lg"
                onPress={handleLogin}
                loading={loading}
                icon="log-in-outline"
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>v1.0.0 · Ambiente de producción</Text>
            <DeveloperCredit />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.huge },
  logoWrap: { alignItems: 'center', marginBottom: spacing.huge },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  brand: { ...typography.h1, fontSize: 26 },
  brandSub: { ...typography.caption, marginTop: spacing.xs },
  form: { flex: 1 },
  title: { ...typography.display },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { ...typography.body, color: colors.textSecondary },
  link: { ...typography.bodyStrong, color: colors.primary },
  footer: { alignItems: 'center', paddingVertical: spacing.xl },
  footerText: { ...typography.caption, color: colors.textMuted },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  errorText: { ...typography.caption, color: colors.dangerDark, flex: 1, fontWeight: '600' },
});
