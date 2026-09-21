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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { empresaApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { ApiError } from '../services/http';

type Props = NativeStackScreenProps<RootStackParamList, 'VincularEmpresa'>;

export const VincularEmpresaScreen: React.FC<Props> = () => {
  const insets = useSafeAreaInsets();
  const setPairing = useAuthStore((s) => s.setPairing);
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const vincular = async (codigoInput: string) => {
    const c = codigoInput.trim();
    if (c.length < 6) {
      setErrorMsg('El código debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const r = await empresaApi.vincular(c);
      await setPairing({
        id_empresa: r.id_empresa,
        nombre_empresa: r.nombre_empresa,
        nit: r.nit,
        token_api: r.token_api,
      });
      // El RootNavigator detecta el pairing y avanza automáticamente a Login.
    } catch (e: any) {
      const msg = e instanceof ApiError
        ? (e.status === 404 ? 'Código no encontrado. Verifica con tu administrador.'
          : e.status === 410 ? 'El código expiró. Pide uno nuevo al administrador.'
          : e.message)
        : 'Sin conexión con el hub';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const abrirScanner = async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        setErrorMsg('Permiso de cámara denegado. Ingresa el código manualmente.');
        return;
      }
    }
    setErrorMsg(null);
    setShowScanner(true);
  };

  const onQRCode = (data: string) => {
    setShowScanner(false);
    vincular(data);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <View style={styles.logoCircle}>
          <Ionicons name="qr-code-outline" size={54} color={colors.primary} />
        </View>
        <Text style={styles.brand}>VINCULAR EMPRESA</Text>
        <Text style={styles.brandSub}>Ingresa el código que te enviaron</Text>
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
          <View style={styles.card}>
            <Text style={styles.title}>Código de empresa</Text>
            <Text style={styles.subtitle}>
              Es un código de 7 caracteres que tu administrador te envió por WhatsApp
            </Text>

            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.fieldLabel}>CÓDIGO</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. PAN4F82"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={10}
                  value={codigo}
                  onChangeText={(t) => setCodigo(t.toUpperCase())}
                  editable={!loading}
                />
              </View>
            </View>

            {errorMsg && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Pressable
              onPress={() => vincular(codigo)}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                loading && { opacity: 0.6 },
              ]}
              android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
            >
              <Text style={styles.submitText}>
                {loading ? 'VINCULANDO...' : 'VINCULAR'}
              </Text>
              {!loading && (
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              )}
            </Pressable>

            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>o</Text>
              <View style={styles.separatorLine} />
            </View>

            <Pressable
              onPress={abrirScanner}
              disabled={loading}
              style={({ pressed }) => [
                styles.scanBtn,
                pressed && { opacity: 0.85 },
              ]}
              android_ripple={{ color: 'rgba(124,58,237,0.15)' }}
            >
              <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
              <Text style={styles.scanText}>Escanear código QR</Text>
            </Pressable>

            <View style={styles.helpBox}>
              <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
              <Text style={styles.helpText}>
                Si no tienes el código, pídeselo al administrador de la empresa. Él lo genera desde Conta FT → Vendedores Móviles → Código empresa.
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>
            INNOVACIÓN DIGITAL · Facturación confiable
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal escáner QR */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={(r) => onQRCode(r.data)}
          />
          <View style={[styles.scannerOverlay, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
            <Pressable
              onPress={() => setShowScanner(false)}
              style={styles.scannerClose}
              hitSlop={12}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerHint}>Apunta al QR que aparece en Conta FT</Text>
          </View>
        </View>
      </Modal>

      {loading && !showScanner && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
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
    color: '#fff', fontSize: 22, fontWeight: '800',
    letterSpacing: 3,
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
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    letterSpacing: 1, marginBottom: 6,
  },
  inputWrap: { position: 'relative' },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: '#c4b5fd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '700',
    color: '#5b21b6',
    backgroundColor: '#faf5ff',
    letterSpacing: 4,
    textAlign: 'center',
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

  separator: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg, gap: 10 },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  separatorText: { fontSize: 11, color: '#9ca3af', fontWeight: '600', letterSpacing: 1 },

  scanBtn: {
    height: 48,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#fff',
  },
  scanText: {
    color: colors.primary, fontSize: 14, fontWeight: '700',
  },

  helpBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.lg,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  helpText: {
    flex: 1,
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
  },

  footer: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: spacing.xxl,
    fontWeight: '600',
  },

  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  scannerClose: {
    alignSelf: 'flex-end',
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  scannerFrame: {
    width: 260, height: 260,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scannerHint: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
