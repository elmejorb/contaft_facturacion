import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, DeveloperCredit, Header, Screen } from '../components';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';
import { authApi } from '../services/api';
import { clearCatalogCache } from '../db';
import { pendingSalesRepo } from '../db/pendingSalesRepo';
import { pendingClientsRepo } from '../db/pendingClientsRepo';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const MoreScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const clearSession = useAuthStore((s) => s.clearSession);
  const vendor = useAuthStore((s) => s.vendor);
  const company = useAuthStore((s) => s.company);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = useCallback(async () => {
    if (!vendor) return;
    const [sales, clients] = await Promise.all([
      pendingSalesRepo.countPending(vendor.id),
      pendingClientsRepo.countPending(vendor.id),
    ]);
    setPendingCount(sales + clients);
  }, [vendor]);

  useFocusEffect(
    useCallback(() => {
      refreshPending();
    }, [refreshPending]),
  );

  useEffect(() => {
    if (lastSyncAt) refreshPending();
  }, [lastSyncAt, refreshPending]);

  const sections: {
    title: string;
    items: {
      icon: keyof typeof Ionicons.glyphMap;
      label: string;
      color: string;
      onPress?: () => void;
      badge?: string;
    }[];
  }[] = [
    {
      title: 'Operación',
      items: [
        {
          icon: 'people-outline',
          label: 'Clientes',
          color: colors.primary,
          onPress: () => nav.navigate('Clients'),
        },
        {
          icon: 'cube-outline',
          label: 'Productos',
          color: colors.warningDark,
          onPress: () => nav.navigate('Products'),
        },
        {
          icon: 'sync-outline',
          label: 'Sincronización',
          color: colors.success,
          onPress: () => nav.navigate('Sync'),
          badge: pendingCount > 0 ? String(pendingCount) : undefined,
        },
      ],
    },
    {
      title: 'Configuración',
      items: [
        { icon: 'person-circle-outline', label: 'Mi perfil', color: colors.textSecondary },
        { icon: 'print-outline', label: 'Impresora Bluetooth', color: colors.textSecondary },
        { icon: 'notifications-outline', label: 'Notificaciones', color: colors.textSecondary },
        { icon: 'help-circle-outline', label: 'Ayuda y soporte', color: colors.textSecondary },
      ],
    },
  ];

  const logout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.logout();
          } catch {
            // ignorar: salimos igual
          }
          await clearCatalogCache();
          await clearSession();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Más" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card padded>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {vendor ? vendor.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : '··'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.h3} numberOfLines={1}>
                {vendor?.nombre ?? 'Vendedor'}
              </Text>
              <Text style={typography.caption} numberOfLines={1}>
                {vendor?.email ?? ''}
              </Text>
              <Text style={[typography.caption, { color: colors.primary, marginTop: 2 }]} numberOfLines={1}>
                {vendor?.codigo ?? ''}
                {vendor?.zona ? ` · ${vendor.zona}` : ''}
              </Text>
              {company && (
                <Text style={[typography.caption, { marginTop: 2 }]} numberOfLines={1}>
                  {company.nombre}
                  {company.factura_electronica_activa ? ' · FE activa' : ''}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {sections.map((section) => (
          <View key={section.title} style={{ marginTop: spacing.xl }}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  android_ripple={{ color: colors.primarySoft }}
                  style={({ pressed }) => [
                    styles.row,
                    idx !== section.items.length - 1 && styles.rowBorder,
                    pressed && { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  {item.badge && (
                    <View style={styles.rowBadge}>
                      <Text style={styles.rowBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Pressable>
              ))}
            </Card>
          </View>
        ))}

        <Pressable
          onPress={logout}
          style={({ pressed }) => [styles.logout, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>

        <Text style={styles.version}>FactúMóvil v1.0.0</Text>
        <DeveloperCredit />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.huge },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textInverse, fontWeight: '700', fontSize: 18 },
  sectionTitle: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { ...typography.bodyLg, flex: 1 },
  rowBadge: {
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    minWidth: 22,
    paddingHorizontal: 7,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBadgeText: { ...typography.caption, color: colors.textInverse, fontWeight: '700', fontSize: 11 },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
  },
  logoutText: { ...typography.bodyStrong, color: colors.danger },
  version: { ...typography.caption, textAlign: 'center', marginTop: spacing.xl },
});
