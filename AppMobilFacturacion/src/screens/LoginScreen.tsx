import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { ApiError } from '../services/http';
import { syncCatalogsFromApi } from '../services/syncService';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = () => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(__DEV__ ? 'demo@contamovil.com' : '');
  const [password, setPassword] = useState(__DEV__ ? 'demo1234' : '');
  const [showPwd, setShowPwd] = useState(false);
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Fondo morado con blobs decorativos */}
      <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />

        <View style={styles.logoCircle}>
          <Ionicons name="receipt-outline" size={54} color={colors.primary} />
        </View>
        <Text style={styles.brand}>CONTA FT MÓVIL</Text>
        <Text style={styles.brandSub}>Facturación en campo</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Card blanca de login */}
          <View style={styles.card}>
            <Text style={styles.title}>Iniciar sesión</Text>
            <Text style={styles.subtitle}>Ingresa tus credenciales para continuar</Text>

            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.fieldLabel}>USUARIO O CORREO</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="tu@empresa.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.fieldLabel}>CONTRASEÑA</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, { paddingRight: 46 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPwd}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPwd(!showPwd)}
                  hitSlop={8}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#6b7280"
                  />
                </Pressable>
              </View>
            </View>

            {errorMsg && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                loading && { opacity: 0.6 },
              ]}
              android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
            >
              <Text style={styles.submitText}>
                {loading ? 'INGRESANDO...' : 'ENTRAR'}
              </Text>
              {!loading && (
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              )}
            </Pressable>

            <View style={styles.linkRow}>
              <Pressable hitSlop={8}>
                <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.footer}>
            INNOVACIÓN DIGITAL · Facturación confiable
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },

  hero: {
    paddingBottom: 30,
    alignItems: 'center',
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -120, right: -80,
  },
  blob2: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: 40, left: -70,
  },
  blob3: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -50, right: 40,
  },
  logoCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  brand: {
    color: '#fff', fontSize: 26, fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
  },
  brandSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13, marginTop: 6,
    letterSpacing: 0.5,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.xl,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 22, fontWeight: '800', color: '#111827',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13, color: '#6b7280', marginTop: 4,
  },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    letterSpacing: 1, marginBottom: 6,
  },
  inputWrap: { position: 'relative' },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fafafa',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12, top: 0, bottom: 0,
    width: 34,
    alignItems: 'center', justifyContent: 'center',
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#fef2f2',
    borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginTop: spacing.lg,
  },
  errorText: {
    fontSize: 13, color: '#b91c1c', flex: 1, fontWeight: '600',
  },

  submitBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: spacing.xl,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitText: {
    color: '#fff', fontSize: 15, fontWeight: '800',
    letterSpacing: 1.5,
  },

  linkRow: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  link: {
    color: colors.primary, fontSize: 13, fontWeight: '600',
  },

  footer: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: spacing.xxl,
    fontWeight: '600',
  },
});
