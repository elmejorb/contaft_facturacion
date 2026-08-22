import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';
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

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const fechaHoy = () => {
  const d = new Date();
  const dia = DIAS[d.getDay()];
  const mes = MESES[d.getMonth()];
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)}, ${d.getDate()} de ${mes}`;
};

export const DashboardScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const modes = useCompanyModes();
  const vendor = useAuthStore((s) => s.vendor);
  const logout = useAuthStore((s) => s.logout);
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
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" colors={['#fff']} progressBackgroundColor={colors.primary} />}
      >
        {/* HERO — Header morado con blobs */}
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />

          <View style={styles.heroTop}>
            <View style={styles.brandRow}>
              <View style={styles.brandDot} />
              <Text style={styles.brandText}>CONTA FT MÓVIL</Text>
            </View>
            <Pressable onPress={logout} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.userRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {vendor ? initials(vendor.nombre) : '··'}
                </Text>
              </View>
              <View style={styles.avatarBadge}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateText}>{fechaHoy()}</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {vendor?.nombre?.toUpperCase() ?? 'VENDEDOR'}
              </Text>
              <View style={styles.rolePill}>
                <Ionicons name="briefcase-outline" size={12} color="#fff" />
                <Text style={styles.roleText}>
                  {vendor?.codigo ?? 'V000'}{vendor?.zona ? ` · ${vendor.zona}` : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats banda dentro del hero */}
          <View style={styles.statsBar}>
            <StatItem value={String(resumen?.hoy.ventas ?? 0)} label="HOY" />
            <View style={styles.statDivider} />
            <StatItem value={String(pendingSync)} label="POR SYNC" tint={pendingSync > 0 ? '#fbbf24' : undefined} />
            <View style={styles.statDivider} />
            <StatItem value={String(resumen?.mes.ventas ?? 0)} label="MES" />
            <View style={styles.statDivider} />
            <StatItem value={String(resumen?.clientes_asignados ?? 0)} label="CLIENTES" />
          </View>
        </View>

        {/* Estado conexión */}
        <View style={styles.statusStrip}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#16a34a' : '#f59e0b' }]} />
          <Text style={[styles.statusText, { color: isOnline ? '#15803d' : '#b45309' }]}>
            {isOnline
              ? pendingSync > 0
                ? `Conectado · ${pendingSync} por sincronizar`
                : 'En línea · Datos sincronizados'
              : 'Sin conexión · Guardando local'}
          </Text>
          {pendingSync > 0 && (
            <Pressable onPress={() => nav.navigate('Sync')} style={styles.pendingTag}>
              <Text style={styles.pendingTagText}>Sync</Text>
            </Pressable>
          )}
        </View>

        {/* KPI Ventas del día — card blanca destacada */}
        {loading && !resumen ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        ) : (
          <View style={styles.salesCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.salesLabel}>Ventas del día</Text>
              <Text style={styles.salesAmount}>{formatCurrency(resumen?.hoy.total ?? 0)}</Text>
              <View style={styles.salesMetaRow}>
                <Ionicons name="trending-up" size={14} color="#16a34a" />
                <Text style={styles.salesMetaText}>
                  Mes: {formatCurrency(resumen?.mes.total ?? 0)}
                </Text>
              </View>
            </View>
            <View style={styles.salesIcon}>
              <Ionicons name="cash" size={28} color={colors.primary} />
            </View>
          </View>
        )}

        {/* Sección OPERACIONES */}
        <Text style={styles.sectionTitle}>OPERACIONES</Text>

        <View style={styles.opsGrid}>
          {modes.pedidos && (
            <OpCard
              badge={String(pendingSync)}
              badgeShow={pendingSync > 0}
              icon="cube"
              title="Nuevo Pedido"
              subtitle="Toma pedidos de clientes"
              gradient={['#7c3aed', '#5b21b6']}
              onPress={() => nav.navigate('CreateOrder')}
            />
          )}
          {modes.algunaFactura && (
            <OpCard
              icon="document-text"
              title="Nueva Factura"
              subtitle="POS o Electrónica"
              gradient={['#059669', '#065f46']}
              onPress={() => nav.navigate('CreateInvoice')}
            />
          )}
          <OpCard
            icon="people"
            title="Clientes"
            subtitle={`${resumen?.clientes_asignados ?? 0} asignados`}
            gradient={['#2563eb', '#1e40af']}
            onPress={() => nav.navigate('Clients')}
          />
          <OpCard
            icon="pricetags"
            title="Productos"
            subtitle="Catálogo disponible"
            gradient={['#ea580c', '#9a3412']}
            onPress={() => nav.navigate('Products')}
          />
        </View>

        {/* Actividad reciente */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>ACTIVIDAD RECIENTE</Text>
          <Pressable hitSlop={8} onPress={() => nav.navigate('Main', { screen: 'Invoices' })}>
            <Text style={styles.linkText}>Ver todo</Text>
          </Pressable>
        </View>

        {resumen?.ventas_recientes.length === 0 ? (
          <View style={styles.tipsCard}>
            <View style={styles.tipsHead}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={styles.tipsTitle}>Tips rápidos</Text>
            </View>
            <Text style={styles.tipsLine}>• Toca <Text style={styles.tipBold}>Nuevo Pedido</Text> para tomar pedidos de tus clientes en ruta.</Text>
            <Text style={styles.tipsLine}>• Si no tienes red, los pedidos se guardan y se sincronizan cuando vuelvas.</Text>
            <Text style={styles.tipsLine}>• Desliza hacia abajo para refrescar los totales.</Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {resumen?.ventas_recientes.slice(0, 5).map((v) => (
              <Pressable
                key={v.id_venta}
                onPress={() => nav.navigate('InvoiceDetail', { invoiceId: String(v.id_venta) })}
                android_ripple={{ color: '#f5f3ff' }}
                style={({ pressed }) => [styles.activityRow, pressed && Platform.OS === 'ios' && { opacity: 0.7 }]}
              >
                <View style={styles.activityIcon}>
                  <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {v.nombre_razon_social}
                  </Text>
                  <Text style={styles.activityMeta}>
                    {v.numero_factura} · {formatDateTime(v.created_at)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.activityAmount}>{formatCurrency(parseFloat(v.total))}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={{ marginLeft: 4 }} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: spacing.huge }} />
      </ScrollView>

      {errorMsg && (
        <View style={styles.errorToast}>
          <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
          <Text style={styles.errorToastText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
};

const StatItem: React.FC<{ value: string; label: string; tint?: string }> = ({ value, label, tint }) => (
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={[styles.statValue, tint && { color: tint }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const OpCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  gradient: [string, string];
  badge?: string;
  badgeShow?: boolean;
  onPress: () => void;
}> = ({ icon, title, subtitle, gradient, badge, badgeShow, onPress }) => (
  <Pressable
    onPress={onPress}
    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
    style={({ pressed }) => [
      styles.opCard,
      { backgroundColor: gradient[0] },
      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
    ]}
  >
    <View style={styles.opTopRow}>
      <View style={styles.opIconBox}>
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      {badgeShow && badge && (
        <View style={styles.opBadge}>
          <Text style={styles.opBadgeText}>{badge}</Text>
        </View>
      )}
    </View>
    <Text style={styles.opTitle}>{title}</Text>
    <Text style={styles.opSubtitle}>{subtitle}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    paddingBottom: 60,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.09)',
    top: -100, right: -60,
  },
  blob2: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -60, left: -40,
  },

  heroTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fbbf24' },
  brandText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginTop: spacing.xl,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 22 },
  avatarBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#16a34a',
    borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  dateText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 2 },
  userName: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },
  rolePill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  roleText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  statLabel: {
    color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '700',
    letterSpacing: 1, marginTop: 3,
  },
  statDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.18)' },

  statusStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.lg, marginTop: -40,
    padding: 12,
    backgroundColor: '#fff', borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flex: 1, fontSize: 12, fontWeight: '600' },
  pendingTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
  },
  pendingTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  loadingBox: { alignItems: 'center', padding: spacing.huge, gap: 8 },
  loadingText: { color: '#6b7280', fontSize: 12 },

  salesCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: '#fff', borderRadius: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  salesLabel: { color: '#6b7280', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  salesAmount: { color: '#111827', fontSize: 26, fontWeight: '800', marginTop: 4 },
  salesMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  salesMetaText: { color: '#6b7280', fontSize: 12, fontWeight: '500' },
  salesIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#f5f3ff',
    alignItems: 'center', justifyContent: 'center',
  },

  sectionTitle: {
    color: '#6b7280', fontSize: 11, fontWeight: '800',
    letterSpacing: 1.5,
    marginHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm,
  },

  opsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: spacing.lg,
  },
  opCard: {
    flex: 1, minWidth: '45%',
    borderRadius: 20,
    padding: 16,
    minHeight: 130,
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  opTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  opIconBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  opBadge: {
    minWidth: 26, height: 24, paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  opBadgeText: { color: '#111827', fontSize: 11, fontWeight: '800' },
  opTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 12 },
  opSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2, fontWeight: '500' },

  recentHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.lg,
    paddingRight: spacing.lg,
  },
  linkText: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: spacing.xl },

  tipsCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
    padding: spacing.lg,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  tipsHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tipsTitle: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  tipsLine: { color: '#374151', fontSize: 12, lineHeight: 20 },
  tipBold: { fontWeight: '800' },

  activityList: {
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  activityIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#f5f3ff',
    alignItems: 'center', justifyContent: 'center',
  },
  activityTitle: { color: '#111827', fontSize: 13, fontWeight: '700' },
  activityMeta: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  activityAmount: { color: '#16a34a', fontSize: 14, fontWeight: '800' },

  errorToast: {
    position: 'absolute', bottom: 90, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#dc2626',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999,
  },
  errorToastText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
