import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge, Button, Card, Header, Screen } from '../components';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { useAuthStore } from '../stores/authStore';
import { useNetworkStore } from '../stores/networkStore';
import { useSyncStore } from '../stores/syncStore';
import { pendingSalesRepo, PendingSale, PendingSaleStatus } from '../db/pendingSalesRepo';
import { pendingClientsRepo, PendingClient } from '../db/pendingClientsRepo';
import { flushPendingSales, flushPendingClients, syncCatalogsFromApi } from '../services/syncService';
import { tryRun as tryAutoSync } from '../services/autoSync';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const statusMeta = (s: PendingSaleStatus) => {
  switch (s) {
    case 'sent':
      return { tone: 'success' as const, label: 'Enviada', icon: 'checkmark-circle' as const };
    case 'error':
      return { tone: 'danger' as const, label: 'Error', icon: 'alert-circle' as const };
    case 'sending':
      return { tone: 'info' as const, label: 'Enviando...', icon: 'sync' as const };
    default:
      return { tone: 'warning' as const, label: 'Pendiente', icon: 'time-outline' as const };
  }
};

export const SyncScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const vendor = useAuthStore((s) => s.vendor);
  const company = useAuthStore((s) => s.company);
  const online = useNetworkStore((s) => s.online);
  const autoSyncing = useSyncStore((s) => s.syncing);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);

  const [pendientes, setPendientes] = useState<PendingSale[]>([]);
  const [pendingClients, setPendingClients] = useState<PendingClient[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const load = useCallback(async () => {
    if (!vendor) return;
    const [sales, clients] = await Promise.all([
      pendingSalesRepo.listByVendor(vendor.id),
      pendingClientsRepo.listByVendor(vendor.id),
    ]);
    setPendientes(sales);
    setPendingClients(clients);
  }, [vendor]);

  // Re-carga al entrar a la pantalla + dispara un auto-sync si aplica
  useFocusEffect(
    useCallback(() => {
      load();
      tryAutoSync('manual').catch(() => {});
    }, [load]),
  );

  // Cuando el store de sync notifica que terminó, re-cargamos
  useEffect(() => {
    if (lastSyncAt) load();
  }, [lastSyncAt, load]);

  const handleSync = async () => {
    if (!vendor || !company) return;
    if (!online) {
      Alert.alert('Sin conexión', 'Conéctate a internet para sincronizar.');
      return;
    }
    setSyncing(true);
    setProgress({ done: 0, total: 0 });
    try {
      // Primero refrescamos catálogos
      await syncCatalogsFromApi(company.id);
      // Luego enviamos clientes pendientes (antes que ventas)
      const clientsRes = await flushPendingClients(vendor.id);
      // Finalmente ventas
      const salesRes = await flushPendingSales(vendor.id, (done, total) =>
        setProgress({ done, total }),
      );
      await load();
      const totalSent = clientsRes.sent + salesRes.sent;
      const totalFailed = clientsRes.failed + salesRes.failed;
      const totalProc = clientsRes.total + salesRes.total;
      Alert.alert(
        'Sincronización finalizada',
        `Enviadas: ${totalSent}\nCon error: ${totalFailed}\nTotal procesadas: ${totalProc}`,
      );
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setSyncing(false);
      setProgress(null);
    }
  };

  const handleCleanSent = async () => {
    if (!vendor) return;
    Alert.alert('Limpiar enviadas', '¿Eliminar de la lista las ya enviadas?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpiar',
        onPress: async () => {
          await pendingSalesRepo.deleteAllSent(vendor.id);
          await pendingClientsRepo.deleteAllSent(vendor.id);
          await load();
        },
      },
    ]);
  };

  const countsByStatus = pendientes.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    },
    { pending: 0, sending: 0, sent: 0, error: 0 } as Record<PendingSaleStatus, number>,
  );
  const clientsCounts = pendingClients.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    },
    { pending: 0, sending: 0, sent: 0, error: 0 } as Record<string, number>,
  );
  const porEnviarClientes = clientsCounts.pending + clientsCounts.error;
  const porEnviar = countsByStatus.pending + countsByStatus.error + porEnviarClientes;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Sincronización" onBack={() => nav.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name={porEnviar === 0 ? 'cloud-done' : 'cloud-upload'}
              size={32}
              color={colors.primary}
            />
          </View>
          <Text style={styles.heroTitle}>
            {porEnviar === 0 ? 'Todo sincronizado' : `${porEnviar} por sincronizar`}
          </Text>
          <Text style={styles.heroSub}>
            {online
              ? porEnviar === 0
                ? 'No hay documentos pendientes'
                : 'Hay documentos esperando subirse'
              : 'Sin conexión, se reintentará al volver la red'}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{countsByStatus.pending}</Text>
              <Text style={styles.heroStatLabel}>Pendientes</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{countsByStatus.sent}</Text>
              <Text style={styles.heroStatLabel}>Enviadas</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text
                style={[
                  styles.heroStatVal,
                  countsByStatus.error > 0 && { color: colors.danger },
                ]}
              >
                {countsByStatus.error}
              </Text>
              <Text style={styles.heroStatLabel}>Con error</Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.connectionCard,
            online ? styles.connOnline : styles.connOffline,
          ]}
        >
          <View
            style={[
              styles.connDot,
              { backgroundColor: online ? colors.success : colors.danger },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.connTitle,
                { color: online ? colors.successDark : colors.dangerDark },
              ]}
            >
              {online ? 'Conectado' : 'Sin conexión'}
            </Text>
            <Text style={typography.caption}>
              {progress
                ? `Enviando ${progress.done} / ${progress.total}`
                : autoSyncing
                  ? 'Sincronizando en segundo plano...'
                  : online
                    ? 'Red disponible'
                    : 'Trabajando en modo local'}
            </Text>
          </View>
          <Ionicons
            name={online ? 'wifi' : 'cloud-offline-outline'}
            size={22}
            color={online ? colors.success : colors.danger}
          />
        </View>

        {(countsByStatus.sent > 0 || clientsCounts.sent > 0) && (
          <View style={{ marginTop: spacing.xl, alignItems: 'flex-end' }}>
            <Pressable onPress={handleCleanSent} hitSlop={8}>
              <Text style={styles.linkText}>Limpiar enviadas</Text>
            </Pressable>
          </View>
        )}

        {pendingClients.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.lg, marginBottom: spacing.md }]}>
              Clientes ({pendingClients.length})
            </Text>
            <View style={{ gap: spacing.md }}>
              {pendingClients.map((c) => {
                const meta = statusMeta(c.status as any);
                return (
                  <Card key={`pc-${c.id}`} style={{ marginBottom: 0 }}>
                    <View style={styles.row}>
                      <View
                        style={[
                          styles.itemIcon,
                          {
                            backgroundColor:
                              c.status === 'error'
                                ? colors.dangerLight
                                : c.status === 'sent'
                                  ? colors.successLight
                                  : colors.warningLight,
                          },
                        ]}
                      >
                        <Ionicons
                          name="person-outline"
                          size={20}
                          color={
                            c.status === 'error'
                              ? colors.dangerDark
                              : c.status === 'sent'
                                ? colors.successDark
                                : colors.warningDark
                          }
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {c.nombre_razon_social}
                        </Text>
                        <Text style={typography.caption}>
                          {c.tipo_documento}: {c.numero_documento} · {formatDateTime(c.created_at)}
                        </Text>
                        {c.remote_codigo_cliente && (
                          <Text style={[typography.caption, { color: colors.success, marginTop: 2 }]}>
                            {c.remote_codigo_cliente}
                          </Text>
                        )}
                        <View style={{ marginTop: spacing.sm, flexDirection: 'row' }}>
                          <Badge label={meta.label} tone={meta.tone} icon={meta.icon} />
                        </View>
                        {c.error_message && (
                          <Text
                            style={[typography.caption, { color: colors.dangerDark, marginTop: 4 }]}
                            numberOfLines={2}
                          >
                            {c.error_message}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </>
        )}

        {pendientes.length === 0 && pendingClients.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No hay documentos locales</Text>
            <Text style={styles.emptySub}>
              Lo que crees sin internet (clientes, ventas) aparecerá aquí
            </Text>
          </View>
        ) : pendientes.length === 0 ? null : (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.lg, marginBottom: spacing.md }]}>
              Ventas ({pendientes.length})
            </Text>

            {pendientes.map((p) => {
              const meta = statusMeta(p.status);
              return (
                <Card key={p.id} style={{ marginBottom: spacing.md }}>
                  <View style={styles.row}>
                    <View
                      style={[
                        styles.itemIcon,
                        {
                          backgroundColor:
                            p.status === 'error'
                              ? colors.dangerLight
                              : p.status === 'pending'
                                ? colors.warningLight
                                : colors.successLight,
                        },
                      ]}
                    >
                      <Ionicons
                        name={p.origen === 'pedido' ? 'cart-outline' : 'receipt-outline'}
                        size={20}
                        color={
                          p.status === 'error'
                            ? colors.dangerDark
                            : p.status === 'pending'
                              ? colors.warningDark
                              : colors.successDark
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {p.cliente_nombre}
                      </Text>
                      <Text style={typography.caption}>
                        {p.origen === 'pedido' ? 'Pedido' : 'Factura'} · {p.items.length} ítems ·{' '}
                        {formatDateTime(p.created_at)}
                      </Text>
                      {p.remote_numero_factura && (
                        <Text
                          style={[typography.caption, { color: colors.success, marginTop: 2 }]}
                        >
                          N° {p.remote_numero_factura}
                        </Text>
                      )}
                      <View style={{ marginTop: spacing.sm, flexDirection: 'row' }}>
                        <Badge label={meta.label} tone={meta.tone} icon={meta.icon} />
                      </View>
                      {p.error_message && (
                        <Text
                          style={[typography.caption, { color: colors.dangerDark, marginTop: 4 }]}
                          numberOfLines={2}
                        >
                          {p.error_message}
                        </Text>
                      )}
                      {p.attempts > 0 && p.status !== 'sent' && (
                        <Text style={[typography.caption, { marginTop: 2 }]}>
                          Intentos: {p.attempts}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.itemAmount}>{formatCurrency(p.total)}</Text>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Leyenda</Text>
        <Card>
          <View style={styles.legendRow}>
            <Badge label="Pendiente" tone="warning" dot />
            <Text style={typography.caption}>Guardada local, esperando envío</Text>
          </View>
          <View style={[styles.legendRow, { marginTop: spacing.md }]}>
            <Badge label="Enviada" tone="success" dot />
            <Text style={typography.caption}>Recibida por el servidor</Text>
          </View>
          <View style={[styles.legendRow, { marginTop: spacing.md }]}>
            <Badge label="Error" tone="danger" dot />
            <Text style={typography.caption}>Falló el envío, se reintentará</Text>
          </View>
        </Card>
      </ScrollView>

      <View style={styles.syncBar}>
        <Button
          label={
            syncing
              ? progress
                ? `Sincronizando ${progress.done}/${progress.total}`
                : 'Sincronizando...'
              : 'Sincronizar ahora'
          }
          icon={syncing ? undefined : 'sync'}
          size="lg"
          loading={syncing}
          onPress={handleSync}
          disabled={!online || porEnviar === 0}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: { ...typography.h2, textAlign: 'center' },
  heroSub: { ...typography.caption, textAlign: 'center', marginTop: 4 },
  heroStats: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatVal: { ...typography.h1 },
  heroStatLabel: { ...typography.caption, marginTop: 2 },
  heroDivider: { width: 1, height: 32, backgroundColor: colors.divider },

  connectionCard: {
    marginTop: spacing.lg,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  connOnline: { backgroundColor: colors.successLight },
  connOffline: { backgroundColor: colors.dangerLight },
  connDot: { width: 10, height: 10, borderRadius: 5 },
  connTitle: { ...typography.bodyStrong, fontSize: 14 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.label },
  linkText: { ...typography.bodyStrong, color: colors.primary, fontSize: 13 },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { ...typography.bodyStrong },
  itemAmount: { ...typography.bodyStrong, fontSize: 15 },

  emptyBox: {
    alignItems: 'center',
    padding: spacing.xxl,
    marginTop: spacing.lg,
  },
  emptyText: { ...typography.bodyStrong, marginTop: spacing.md },
  emptySub: { ...typography.caption, marginTop: 4, textAlign: 'center' },

  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  syncBar: {
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
