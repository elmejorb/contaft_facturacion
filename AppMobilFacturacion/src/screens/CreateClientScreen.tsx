import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Badge,
  Button,
  GpsCapture,
  Header,
  Input,
  MunicipalityPicker,
  Screen,
} from '../components';
import type { GpsValue } from '../components';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../stores/authStore';
import { useNetworkStore } from '../stores/networkStore';
import { saveOrQueueClient } from '../services/syncService';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateClient'>;

type TipoDocumento = 'CC' | 'NIT' | 'CE' | 'TI' | 'PP';

const tiposDoc: { key: TipoDocumento; label: string }[] = [
  { key: 'CC', label: 'Cédula' },
  { key: 'NIT', label: 'NIT' },
  { key: 'CE', label: 'Cédula extranjera' },
  { key: 'TI', label: 'Tarjeta ident.' },
  { key: 'PP', label: 'Pasaporte' },
];

export const CreateClientScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const vendor = useAuthStore((s) => s.vendor);
  const company = useAuthStore((s) => s.company);
  const online = useNetworkStore((s) => s.online);

  const [nombre, setNombre] = useState('');
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>('CC');
  const [numeroDoc, setNumeroDoc] = useState('');
  const [dv, setDv] = useState('');
  const [telefono, setTelefono] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [municipio, setMunicipio] = useState<{ id: number; label: string; name: string; department_name: string } | null>(null);
  const [cupo, setCupo] = useState('');
  const [gps, setGps] = useState<GpsValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = 'El nombre o razón social es obligatorio';
    if (!numeroDoc.trim()) e.numeroDoc = 'El número de documento es obligatorio';
    if (tipoDoc === 'NIT' && !dv.trim()) e.dv = 'El dígito de verificación es obligatorio para NIT';
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Email inválido';
    if (cupo && isNaN(parseFloat(cupo))) e.cupo = 'Debe ser un número';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!vendor || !company) {
      Alert.alert('Error', 'Sesión inválida');
      return;
    }

    setSaving(true);
    try {
      const result = await saveOrQueueClient({
        id_vendedor_mobile: vendor.id,
        id_empresa: company.id,
        nombre_razon_social: nombre.trim(),
        tipo_documento: tipoDoc,
        numero_documento: numeroDoc.trim(),
        digito_verificacion: tipoDoc === 'NIT' ? dv.trim() : null,
        telefono: telefono.trim() || null,
        celular: celular.trim() || null,
        email: email.trim() || null,
        direccion: direccion.trim() || null,
        municipio: municipio?.name ?? null,
        departamento: municipio?.department_name ?? null,
        id_municipio: municipio?.id ?? null,
        latitud: gps?.latitud ?? null,
        longitud: gps?.longitud ?? null,
        precision_gps_metros: gps?.precision_gps_metros ?? null,
        cupo_autorizado: cupo ? parseFloat(cupo) : 0,
      });

      if (result.sent) {
        Alert.alert(
          'Cliente creado',
          `${result.remoteClient?.nombre_razon_social ?? 'Cliente'} (${result.remoteClient?.codigo_cliente ?? ''})`,
          [{ text: 'OK', onPress: () => nav.goBack() }],
        );
      } else {
        Alert.alert(
          'Guardado local',
          result.error
            ? `Pendiente: ${result.error}\n\nSe enviará cuando haya conexión.`
            : 'Sin conexión. El cliente se enviará cuando haya red.',
          [{ text: 'OK', onPress: () => nav.goBack() }],
        );
      }
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="Nuevo Cliente"
        subtitle={online ? company?.nombre : 'Sin conexión'}
        onBack={() => nav.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!online && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={18} color={colors.warningDark} />
              <Text style={styles.offlineText}>
                Se guardará local y se enviará al recuperar conexión
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Identificación</Text>

          <Input
            label="Nombre o razón social *"
            icon="business-outline"
            placeholder="Distribuidora XYZ S.A.S"
            value={nombre}
            onChangeText={setNombre}
            error={errors.nombre}
            autoCapitalize="words"
            containerStyle={{ marginBottom: spacing.lg }}
          />

          <Text style={styles.fieldLabel}>Tipo de documento *</Text>
          <View style={styles.tipoDocRow}>
            {tiposDoc.map((t) => {
              const active = tipoDoc === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTipoDoc(t.key)}
                  style={[styles.tipoDocBtn, active && styles.tipoDocBtnActive]}
                >
                  <Text
                    style={[
                      styles.tipoDocLabel,
                      active && styles.tipoDocLabelActive,
                    ]}
                  >
                    {t.key}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.docRow}>
            <View style={{ flex: 2 }}>
              <Input
                label="Número de documento *"
                icon="card-outline"
                placeholder="900123456"
                value={numeroDoc}
                onChangeText={setNumeroDoc}
                error={errors.numeroDoc}
                keyboardType="number-pad"
              />
            </View>
            {tipoDoc === 'NIT' && (
              <View style={{ flex: 1 }}>
                <Input
                  label="DV *"
                  placeholder="0"
                  value={dv}
                  onChangeText={setDv}
                  error={errors.dv}
                  keyboardType="number-pad"
                  maxLength={1}
                />
              </View>
            )}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Contacto</Text>

          <Input
            label="Teléfono"
            icon="call-outline"
            placeholder="300 123 4567"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            containerStyle={{ marginBottom: spacing.lg }}
          />

          <Input
            label="Celular / WhatsApp"
            icon="logo-whatsapp"
            placeholder="310 555 1212"
            value={celular}
            onChangeText={setCelular}
            keyboardType="phone-pad"
            containerStyle={{ marginBottom: spacing.lg }}
          />

          <Input
            label="Email"
            icon="mail-outline"
            placeholder="cliente@ejemplo.com"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={{ marginBottom: spacing.lg }}
          />

          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Ubicación</Text>

          <Input
            label="Dirección"
            icon="location-outline"
            placeholder="Cra 50 #10-20"
            value={direccion}
            onChangeText={setDireccion}
            autoCapitalize="words"
            containerStyle={{ marginBottom: spacing.lg }}
          />

          <View style={{ marginBottom: spacing.lg }}>
            <MunicipalityPicker
              label="Ciudad / Municipio"
              value={municipio ? { id: municipio.id, label: municipio.label } : null}
              onChange={setMunicipio}
            />
          </View>

          <Text style={styles.fieldLabel}>Ubicación GPS del cliente</Text>
          <View style={{ marginBottom: spacing.lg }}>
            <GpsCapture value={gps} onChange={setGps} />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Condiciones</Text>

          <Input
            label="Cupo autorizado (opcional)"
            icon="cash-outline"
            placeholder="0"
            value={cupo}
            onChangeText={setCupo}
            error={errors.cupo}
            keyboardType="decimal-pad"
            hint="Solo aplica para clientes a crédito"
            containerStyle={{ marginBottom: spacing.lg }}
          />

          <View style={{ height: spacing.xl }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button
              label="Cancelar"
              variant="secondary"
              onPress={() => nav.goBack()}
              size="lg"
            />
            <View style={{ flex: 2 }}>
              <Button
                label={online ? 'Guardar cliente' : 'Guardar local'}
                icon={online ? 'checkmark-circle-outline' : 'cloud-offline-outline'}
                onPress={handleSave}
                size="lg"
                loading={saving}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 140 },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  offlineText: { ...typography.caption, color: colors.warningDark, flex: 1, fontWeight: '600' },

  sectionTitle: {
    ...typography.label,
    marginBottom: spacing.md,
  },

  fieldLabel: {
    ...typography.captionStrong,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  tipoDocRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  tipoDocBtn: {
    flex: 1,
    minWidth: 60,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tipoDocBtnActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tipoDocLabel: { ...typography.caption, fontWeight: '700', color: colors.textSecondary },
  tipoDocLabelActive: { color: colors.primary },

  docRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
