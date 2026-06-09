import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Screen } from '../components';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency, formatDateTime, initials } from '../utils/format';
import { dashboardApi, DashboardResumen } from '../services/api';
import { useCompanyModes } from '../hooks/useCompanyModes';
import { useAuthStore } from '../stores/authStore';
import { useNetworkStore } from '../stores/networkStore';
import { useSyncStore } from '../stores/syncStore';
import { ApiError } from '../services/http';
import { pendingSalesRepo } from '../db/pendingSalesRepo';
import { pendingClientsRepo } from '../db/pendingClientsRepo';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const DashboardScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const modes = useCompanyModes();
  const vendor = useAuthStore((s) => s.vendor);
  const online = useNetworkStore((s) => s.online);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(0);

  const fetchResumen = useCallback(async () => {
    try {
      setErrorMsg(null);
      const data = await dashboardApi.resumen();
      setResumen(data);
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Sin conexión al servidor');
    }
  }, []);

  const fetchPendingCount = useCallback(async () => {
    if (!vendor) return;
    const [s, c] = await Promise.all([
      pendingSalesRepo.countPending(vendor.id),
      pendingClientsRepo.countPending(vendor.id),
    ]);
    setPendingSync(s + c);
  }, [vendor]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        await Promise.all([fetchResumen(), fetchPendingCount()]);
        setLoading(false);
      })();
    }, [fetchResumen, fetchPendingCount]),
  );

  // Cuando una sync (auto o manual) termina, re-obtenemos contador y resumen
  useEffect(() => {
    if (lastSyncAt) {
      fetchPendingCount();
      fetchResumen();
    }
  }, [lastSyncAt, fetchPendingCount, fetchResumen]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchResumen(), fetchPendingCount()]);
    setRefreshing(false);
  }, [fetchResumen, fetchPendingCount]);

  const isOnline = online;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.topBar}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {vendor ? initials(vendor.nombre) : '··'}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting} numberOfLines={1}>
                ¡Hola, {vendor?.nombre.split(' ')[0] ?? 'Vendedor'}!
              </Text>
              <Text style={styles.greetingSub} numberOfLines={1}>
                {vendor?.codigo ?? ''}
                {vendor?.zona ? ` · ${vendor.zona}` : ''}
              </Text>
            </View>
          </View>
          <Pressable hitSlop={8} style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.statusBar, isOnline ? styles.statusOnline : styles.statusOffline]}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnline ? colors.success : colors.warning },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isOnline ? colors.successDark : colors.warningDark },
            ]}
          >
            {isOnline
              ? pendingSync > 0
                ? `Conectado · ${pendingSync} por sincronizar`
                : 'En línea · Datos sincronizados'
              : 'Sin conexión · Guardando local'}
          </Text>
          {pendingSync > 0 && (
            <Pressable onPress={() => nav.navigate('Sync')} style={styles.pendingTag}>
              <Text style={styles.pendingText}>{pendingSync} pend.</Text>
            </Pressable>
          )}
        </View>

        {loading && !resumen ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Cargando resumen...</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Ventas del día</Text>
              <Text style={styles.heroAmount}>
                {formatCurrency(resumen?.hoy.total ?? 0)}
              </Text>
              <View style={styles.heroRow}>
                <View style={styles.heroItem}>
                  <Ionicons name="receipt-outline" size={16} color={colors.textInverse} style={{ opacity: 0.8 }} />
                  <Text style={styles.heroItemText}>{resumen?.hoy.ventas ?? 0} hoy</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroItem}>
                  <Ionicons name="trending-up-outline" size={16} color={colors.textInverse} style={{ opacity: 0.8 }} />
                  <Text style={styles.heroItemText}>{resumen?.mes.ventas ?? 0} en el mes</Text>
                </View>
              </View>
            </View>

            <View style={styles.quickActions}>
              {modes.pedidos && (
                <QuickAction
                  icon="add-circle"
                  label="Nuevo Pedido"
                  color={colors.primary}
                  bg={colors.primaryLight}
                  onPress={() => nav.navigate('CreateOrder')}
                />
              )}
              {modes.algunaFactura && (
                <QuickAction
                  icon="document-text"
                  label="Nueva Factura"
                  color={colors.success}
                  bg={colors.successLight}
                  onPress={() => nav.navigate('CreateInvoice')}
                />
              )}
              <QuickAction
                icon="cube"
                label="Productos"
                color={colors.warningDark}
                bg={colors.warningLight}
                onPress={() => nav.navigate('Products')}
              />
              <QuickAction
                icon="people"
                label="Clientes"
                color={colors.primaryDark}
                bg={colors.infoLight}
                onPress={() => nav.navigate('Clients')}
              />
            </View>

            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <View style={[styles.kpiIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.kpiValue}>{resumen?.clientes_asignados ?? 0}</Text>
                <Text style={styles.kpiLabel}>Clientes asignados</Text>
              </View>
              <View style={styles.kpiCard}>
                <View style={[styles.kpiIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="cash-outline" size={18} color={colors.successDark} />
                </View>
                <Text style={styles.kpiValue}>{formatCurrency(resumen?.mes.total ?? 0)}</Text>
                <Text style={styles.kpiLabel}>Ventas del mes</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={typography.h3}>Actividad reciente</Text>
              <Pressable hitSlop={8} onPress={() => nav.navigate('Main', { screen: 'Invoices' })}>
                <Text style={styles.linkText}>Ver todo</Text>
              </Pressable>
            </View>

            {resumen?.ventas_recientes.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="document-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyText}>Aún no hay ventas registradas</Text>
                <Text style={styles.emptySubtext}>Crea tu primera venta con el botón de arriba</Text>
              </View>
            ) : (
              <View style={{ gap: spacing.md }}>
                {resumen?.ventas_recientes.map((v) => (
                  <Card
                    key={v.id_venta}
                    onPress={() => nav.navigate('InvoiceDetail', { invoiceId: String(v.id_venta) })}
                  >
                    <View style={styles.activityRow}>
                      <View style={styles.activityIcon}>
                        <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activityTitle} numberOfLines={1}>
                          {v.nombre_razon_social}
                        </Text>
                        <Text style={styles.activityMeta}>
                          {v.numero_factura} · {formatDateTime(v.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.activityAmount}>
                        {formatCurrency(parseFloat(v.total))}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textMuted}
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

const QuickAction: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}> = ({ icon, label, color, bg, onPress }) => (
  <Pressable
    onPress={onPress}
    android_ripple={{ color: colors.primarySoft }}
    style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.85 }]}
  >
    <View style={[styles.quickIcon, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  avatarWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
  greeting: { ...typography.h3 },
  greetingSub: { ...typography.caption, marginTop: 2 },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statusOnline: { backgroundColor: colors.successLight },
  statusOffline: { backgroundColor: colors.dangerLight },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...typography.caption, fontWeight: '600', flex: 1 },
  pendingTag: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  pendingText: { ...typography.caption, fontWeight: '700', color: colors.warningDark },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.raised,
    shadowColor: colors.primary,
  },
  heroLabel: { ...typography.caption, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  heroAmount: {
    ...typography.displayLg,
    color: colors.textInverse,
    marginTop: spacing.xs,
    fontSize: 36,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: spacing.lg },
  heroItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroItemText: { color: colors.textInverse, fontWeight: '600', fontSize: 13 },
  heroDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.3)' },

  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  quickLabel: { ...typography.bodyStrong, fontSize: 14 },

  kpiRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  kpiValue: { ...typography.h2, fontSize: 22 },
  kpiLabel: { ...typography.caption, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  linkText: { ...typography.bodyStrong, color: colors.primary, fontSize: 14 },

  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: { ...typography.bodyStrong },
  activityMeta: { ...typography.caption, marginTop: 2 },
  activityAmount: { ...typography.bodyStrong, fontSize: 15 },

  loadingBox: { alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.md },
  loadingText: { ...typography.caption },

  emptyBox: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
  },
  emptyText: { ...typography.bodyStrong, marginTop: spacing.md },
  emptySubtext: { ...typography.caption, marginTop: 4, textAlign: 'center' },
});
