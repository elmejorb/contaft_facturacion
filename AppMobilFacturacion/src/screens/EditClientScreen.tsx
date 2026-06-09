import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Badge,
  Button,
  EmptyState,
  GpsCapture,
  Header,
  Input,
  MunicipalityPicker,
  Screen,
} from '../components';
import type { GpsValue } from '../components';
import { municipiosRepo } from '../db/municipiosRepo';
import { clientsRepo } from '../db/clientsRepo';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import {
  clientesApi,
  ClientDTO,
  ClientUpdatePayload,
} from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useNetworkStore } from '../stores/networkStore';
import { ApiError } from '../services/http';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditClient'>;
type Rt = RouteProp<RootStackParamList, 'EditClient'>;

type TipoDocumento = 'CC' | 'NIT' | 'CE' | 'TI' | 'PP';
const tiposDoc: { key: TipoDocumento; label: string }[] = [
  { key: 'CC', label: 'Cédula' },
  { key: 'NIT', label: 'NIT' },
  { key: 'CE', label: 'CE' },
  { key: 'TI', label: 'TI' },
  { key: 'PP', label: 'Pasaporte' },
];

export const EditClientScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const canEdit = useAuthStore((s) => s.vendor?.can_edit_clients ?? true);
  const empresaId = useAuthStore((s) => s.company?.id ?? 0);
  const online = useNetworkStore((s) => s.online);

  const [cliente, setCliente] = useState<ClientDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // form state
  const [nombre, setNombre] = useState('');
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>('CC');
  const [numeroDoc, setNumeroDoc] = useState('');
  const [dv, setDv] = useState('');
  const [telefono, setTelefono] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [municipio, setMunicipio] = useState<{
    id: number;
    label: string;
    name: string;
    department_name: string;
  } | null>(null);
  const [cupo, setCupo] = useState('');
  const [gps, setGps] = useState<GpsValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const c = await clientesApi.show(route.params.clientId);
        setCliente(c);
        setNombre(c.nombre_razon_social);
        setTipoDoc((c.tipo_documento as TipoDocumento) || 'CC');
        setNumeroDoc(c.numero_documento ?? '');
        setDv(c.digito_verificacion ?? '');
        setTelefono(c.telefono ?? '');
        setCelular(c.celular ?? '');
        setEmail(c.email ?? '');
        setDireccion(c.direccion ?? '');
        if (c.id_municipio) {
          const local = await municipiosRepo.findById(c.id_municipio);
          if (local) {
            setMunicipio({
              id: local.id,
              label: local.label,
              name: local.name,
              department_name: local.departamento_nombre,
            });
          } else if (c.municipio) {
            // Fallback: tenemos nombre pero no cache
            setMunicipio({
              id: c.id_municipio,
              label: c.municipio,
              name: c.municipio,
              department_name: c.departamento ?? '',
            });
          }
        }
        setCupo(c.cupo_autorizado ? String(c.cupo_autorizado) : '');
        if (c.latitud != null && c.longitud != null) {
          setGps({
            latitud: parseFloat(String(c.latitud)),
            longitud: parseFloat(String(c.longitud)),
            precision_gps_metros: c.precision_gps_metros
              ? parseFloat(String(c.precision_gps_metros))
              : 0,
          });
        }
      } catch (e) {
        setLoadError(e instanceof ApiError ? e.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    })();
  }, [route.params.clientId]);

  if (loading) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <Header title="Cargando..." onBack={() => nav.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (loadError || !cliente) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <Header title="Editar cliente" onBack={() => nav.goBack()} />
        <EmptyState
          icon="alert-circle-outline"
          title="Error"
          description={loadError ?? 'No se pudo cargar.'}
        />
      </Screen>
    );
  }

  if (!canEdit) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <Header title="Editar cliente" onBack={() => nav.goBack()} />
        <EmptyState
          icon="lock-closed-outline"
          title="Sin permisos"
          description="No tienes permisos para editar clientes. Contacta a administración."
        />
      </Screen>
    );
  }

  const isOwn = !!cliente.is_own;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = 'Obligatorio';
    if (isOwn && !numeroDoc.trim()) e.numeroDoc = 'Obligatorio';
    if (isOwn && tipoDoc === 'NIT' && !dv.trim()) e.dv = 'Obligatorio para NIT';
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Email inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    // Construir payload solo con los campos permitidos según isOwn
    const payload: ClientUpdatePayload = {
      nombre_razon_social: nombre.trim(),
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
    };

    if (isOwn) {
      payload.tipo_documento = tipoDoc;
      payload.numero_documento = numeroDoc.trim();
      payload.digito_verificacion = tipoDoc === 'NIT' ? dv.trim() : null;
      if (cupo) payload.cupo_autorizado = parseFloat(cupo);
    }

    setSaving(true);
    try {
      const updated = await clientesApi.update(cliente.id_cliente, payload);
      // Refleja el cambio en el caché local SQLite para que el listado lo
      // muestre apenas vuelves del modal (sin esperar al próximo fetch ni al
      // ciclo focus→refresh→cache→fetch del useCachedList).
      if (empresaId > 0) {
        try { await clientsRepo.upsert(empresaId, updated); } catch {}
      }
      Alert.alert('Cliente actualizado', 'Los cambios se guardaron.', [
        { text: 'OK', onPress: () => nav.goBack() },
      ]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Error al guardar';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const disabled = !isOwn;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="Editar cliente"
        subtitle={
          !online
            ? 'Sin conexión'
            : isOwn
              ? 'Cliente propio — edita todo'
              : 'Cliente asignado — solo contacto'
        }
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
                La edición requiere conexión. Los cambios no se pueden guardar offline aún.
              </Text>
            </View>
          )}

          {!isOwn && (
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primaryDark} />
              <Text style={styles.infoText}>
                Este cliente lo descargaste del sistema. Solo puedes editar contacto y ubicación.
                Los datos fiscales (documento, régimen, cupo) los cambia administración.
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Identificación</Text>

          <Input
            label="Nombre o razón social *"
            icon="business-outline"
            value={nombre}
            onChangeText={setNombre}
            error={errors.nombre}
            autoCapitalize="words"
            containerStyle={{ marginBottom: spacing.lg }}
          />

          <Text style={styles.fieldLabel}>Tipo de documento {disabled ? '(solo lectura)' : '*'}</Text>
          <View style={styles.tipoDocRow}>
            {tiposDoc.map((t) => {
              const active = tipoDoc === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => !disabled && setTipoDoc(t.key)}
                  disabled={disabled}
                  style={[
                    styles.tipoDocBtn,
                    active && styles.tipoDocBtnActive,
                    disabled && styles.disabled,
                  ]}
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
                label={`Número documento ${disabled ? '(solo lectura)' : '*'}`}
                icon="card-outline"
                value={numeroDoc}
                onChangeText={setNumeroDoc}
                error={errors.numeroDoc}
                keyboardType="number-pad"
                editable={!disabled}
              />
            </View>
            {tipoDoc === 'NIT' && (
              <View style={{ flex: 1 }}>
                <Input
                  label="DV"
                  value={dv}
                  onChangeText={setDv}
                  error={errors.dv}
                  keyboardType="number-pad"
                  maxLength={1}
                  editable={!disabled}
                />
              </View>
            )}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Contacto</Text>

          <Input
            label="Teléfono"
            icon="call-outline"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            containerStyle={{ marginBottom: spacing.lg }}
          />

          <Input
            label="Celular / WhatsApp"
            icon="logo-whatsapp"
            value={celular}
            onChangeText={setCelular}
            keyboardType="phone-pad"
            containerStyle={{ marginBottom: spacing.lg }}
          />

          <Input
            label="Email"
            icon="mail-outline"
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

          <Text style={styles.fieldLabel}>Ubicación GPS</Text>
          <View style={{ marginBottom: spacing.lg }}>
            <GpsCapture
              value={gps}
              onChange={setGps}
              capturedAt={cliente.gps_capturado_at ?? null}
            />
          </View>

          {isOwn && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Condiciones</Text>
              <Input
                label="Cupo autorizado"
                icon="cash-outline"
                value={cupo}
                onChangeText={setCupo}
                keyboardType="decimal-pad"
                containerStyle={{ marginBottom: spacing.lg }}
              />
            </>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button label="Cancelar" variant="secondary" onPress={() => nav.goBack()} size="lg" />
            <View style={{ flex: 2 }}>
              <Button
                label="Guardar cambios"
                icon="checkmark-circle-outline"
                onPress={handleSave}
                size="lg"
                loading={saving}
                disabled={!online}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  infoText: { ...typography.caption, color: colors.primaryDark, flex: 1 },

  sectionTitle: { ...typography.label, marginBottom: spacing.md },
  fieldLabel: {
    ...typography.captionStrong,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  tipoDocRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
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
  disabled: { opacity: 0.6 },

  docRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },

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
