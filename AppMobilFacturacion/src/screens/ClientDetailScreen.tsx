import React from 'react';
import {
  ActivityIndicator,
  Linking,
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
import { Badge, Card, EmptyState, Header, Screen } from '../components';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency, initials } from '../utils/format';
import { clientesApi, ClientDTO } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useAuthStore } from '../stores/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ClientDetail'>;
type Rt = RouteProp<RootStackParamList, 'ClientDetail'>;

const openMaps = (lat: number, lng: number) => {
  const url = Platform.select({
    ios: `maps://?q=${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}`,
    default: `https://www.google.com/maps?q=${lat},${lng}`,
  });
  Linking.openURL(url!).catch(() =>
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`),
  );
};

const callPhone = (phone: string) => {
  Linking.openURL(`tel:${phone}`).catch(() => {});
};

const openWhatsApp = (phone: string) => {
  const clean = phone.replace(/\D/g, '');
  Linking.openURL(`https://wa.me/${clean}`).catch(() => {});
};

const openEmail = (email: string) => {
  Linking.openURL(`mailto:${email}`).catch(() => {});
};

export const ClientDetailScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const canEdit = useAuthStore((s) => s.vendor?.can_edit_clients ?? true);

  const { data: cliente, loading, error, reload } = useFetch<ClientDTO>(
    () => clientesApi.show(route.params.clientId),
    [route.params.clientId],
  );

  if (loading && !cliente) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <Header title="Cargando..." onBack={() => nav.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !cliente) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <Header title="Cliente" onBack={() => nav.goBack()} />
        <EmptyState
          icon="alert-circle-outline"
          title="Error"
          description={error ?? 'No se pudo cargar el cliente.'}
          actionLabel="Reintentar"
          onAction={reload}
        />
      </Screen>
    );
  }

  const lat =
    cliente.latitud != null && cliente.latitud !== ''
      ? parseFloat(String(cliente.latitud))
      : null;
  const lng =
    cliente.longitud != null && cliente.longitud !== ''
      ? parseFloat(String(cliente.longitud))
      : null;
  const hasGps = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

  const cupo = parseFloat(cliente.cupo_autorizado);
  const isOwn = !!cliente.is_own;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title={cliente.codigo_cliente}
        subtitle={isOwn ? 'Cliente creado por ti' : 'Cliente asignado'}
        onBack={() => nav.goBack()}
        actions={
          canEdit
            ? [
                {
                  icon: 'create-outline',
                  onPress: () =>
                    nav.navigate('EditClient', { clientId: cliente.id_cliente }),
                },
              ]
            : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(cliente.nombre_razon_social)}</Text>
          </View>
          <Text style={styles.heroName} numberOfLines={2}>
            {cliente.nombre_razon_social}
          </Text>
          <Text style={styles.heroDoc}>
            {cliente.tipo_documento}: {cliente.numero_documento}
            {cliente.digito_verificacion ? `-${cliente.digito_verificacion}` : ''}
          </Text>
          <View style={{ marginTop: spacing.sm, flexDirection: 'row', gap: spacing.sm }}>
            {isOwn && <Badge label="Creado por mí" tone="success" icon="checkmark-circle-outline" />}
            {cupo > 0 ? (
              <Badge label={`Cupo ${formatCurrency(cupo)}`} tone="warning" icon="cash-outline" />
            ) : (
              <Badge label="Contado" tone="neutral" />
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Contacto</Text>
        <Card padded={false}>
          {cliente.telefono && (
            <ContactRow
              icon="call-outline"
              label="Teléfono"
              value={cliente.telefono}
              onPress={() => callPhone(cliente.telefono!)}
            />
          )}
          {cliente.celular && cliente.celular !== cliente.telefono && (
            <ContactRow
              icon="logo-whatsapp"
              label="Celular"
              value={cliente.celular}
              onPress={() => openWhatsApp(cliente.celular!)}
              withBorder
            />
          )}
          {cliente.email && (
            <ContactRow
              icon="mail-outline"
              label="Email"
              value={cliente.email}
              onPress={() => openEmail(cliente.email!)}
              withBorder
            />
          )}
          {!cliente.telefono && !cliente.celular && !cliente.email && (
            <View style={styles.emptyRow}>
              <Text style={typography.caption}>Sin datos de contacto</Text>
            </View>
          )}
        </Card>

        <Text style={styles.sectionTitle}>Ubicación</Text>
        <Card>
          {cliente.direccion && (
            <View style={styles.lineItem}>
              <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.lineValue}>{cliente.direccion}</Text>
                {(cliente.municipio || cliente.departamento) && (
                  <Text style={typography.caption}>
                    {[cliente.municipio, cliente.departamento].filter(Boolean).join(', ')}
                  </Text>
                )}
              </View>
            </View>
          )}
          {hasGps ? (
            <Pressable
              onPress={() => openMaps(lat!, lng!)}
              style={({ pressed }) => [
                styles.gpsBox,
                pressed && { opacity: 0.85 },
                cliente.direccion ? { marginTop: spacing.md } : {},
              ]}
            >
              <View style={styles.gpsIcon}>
                <Ionicons name="navigate-circle" size={22} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsCoords}>
                  {lat!.toFixed(6)}, {lng!.toFixed(6)}
                </Text>
                <Text style={typography.caption}>
                  Toca para abrir en Maps
                  {cliente.precision_gps_metros
                    ? ` · ±${Math.round(parseFloat(String(cliente.precision_gps_metros)))}m`
                    : ''}
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={[styles.lineItem, cliente.direccion ? { marginTop: spacing.md } : {}]}>
              <Ionicons name="navigate-outline" size={18} color={colors.textMuted} />
              <Text style={typography.caption}>Sin coordenadas GPS</Text>
            </View>
          )}
          {!cliente.direccion && !hasGps && (
            <Text style={typography.caption}>Sin información de ubicación</Text>
          )}
        </Card>

        <Text style={styles.sectionTitle}>Datos fiscales</Text>
        <Card>
          <View style={styles.fiscalRow}>
            <Text style={typography.caption}>Tipo documento</Text>
            <Text style={styles.fiscalValue}>{cliente.tipo_documento ?? '—'}</Text>
          </View>
          <View style={styles.fiscalRow}>
            <Text style={typography.caption}>Número documento</Text>
            <Text style={styles.fiscalValue}>
              {cliente.numero_documento ?? '—'}
              {cliente.digito_verificacion ? `-${cliente.digito_verificacion}` : ''}
            </Text>
          </View>
          {cliente.tipo_responsabilidad && (
            <View style={styles.fiscalRow}>
              <Text style={typography.caption}>Responsabilidad</Text>
              <Text style={styles.fiscalValue}>{cliente.tipo_responsabilidad}</Text>
            </View>
          )}
          {cliente.regimen_tributario && (
            <View style={styles.fiscalRow}>
              <Text style={typography.caption}>Régimen</Text>
              <Text style={styles.fiscalValue}>{cliente.regimen_tributario}</Text>
            </View>
          )}
          {!isOwn && canEdit && (
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoBannerText}>
                Los datos fiscales solo pueden cambiarse desde administración (o si el cliente fue creado por ti).
              </Text>
            </View>
          )}
          {!canEdit && (
            <View style={styles.infoBanner}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoBannerText}>
                No tienes permisos de edición. Contacta a administración.
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
};

const ContactRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  withBorder?: boolean;
}> = ({ icon, label, value, onPress, withBorder }) => (
  <Pressable
    onPress={onPress}
    android_ripple={{ color: colors.primarySoft }}
    style={({ pressed }) => [
      styles.contactRow,
      withBorder && styles.rowBorder,
      pressed && { opacity: 0.85 },
    ]}
  >
    <View style={styles.contactIcon}>
      <Ionicons name={icon} size={18} color={colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={styles.contactValue}>{value}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
  </Pressable>
);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.huge },

  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.textInverse, fontWeight: '700', fontSize: 22 },
  heroName: { ...typography.h2, textAlign: 'center' },
  heroDoc: { ...typography.caption, marginTop: 4 },

  sectionTitle: { ...typography.label, marginTop: spacing.lg, marginBottom: spacing.sm },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactValue: { ...typography.bodyStrong, fontSize: 15 },
  emptyRow: { padding: spacing.lg, alignItems: 'center' },

  lineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  lineValue: { ...typography.body },

  gpsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  gpsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsCoords: {
    ...typography.bodyStrong,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  fiscalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  fiscalValue: { ...typography.bodyStrong, fontSize: 14 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  infoBannerText: { ...typography.caption, flex: 1 },
});
