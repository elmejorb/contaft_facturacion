import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge, Card, EmptyState, Header, Screen, SearchBar } from '../components';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency, initials } from '../utils/format';
import { clientesApi, ClientDTO } from '../services/api';
import { useCachedList } from '../hooks/useCachedList';
import { clientsRepo } from '../db/clientsRepo';
import { pendingClientsRepo, PendingClient } from '../db/pendingClientsRepo';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const ClientsScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const empresaId = useAuthStore((s) => s.company?.id ?? 0);
  const vendorId = useAuthStore((s) => s.vendor?.id ?? 0);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);

  const [pendientes, setPendientes] = useState<PendingClient[]>([]);

  const { data, loading, refreshing, error, refresh, fromCache } = useCachedList<ClientDTO>({
    fetchFromApi: () => clientesApi.list(),
    readFromCache: () => clientsRepo.listAll(empresaId),
    writeCache: (d) => clientsRepo.replaceAll(empresaId, d),
    enabled: empresaId > 0,
  });

  const refreshPendientes = useCallback(async () => {
    if (!vendorId) return;
    const list = await pendingClientsRepo.listByVendor(vendorId);
    setPendientes(list.filter((p) => p.status !== 'sent'));
  }, [vendorId]);

  useFocusEffect(
    useCallback(() => {
      refreshPendientes();
      refresh();
    }, [refreshPendientes, refresh]),
  );

  useEffect(() => {
    if (lastSyncAt) refreshPendientes();
  }, [lastSyncAt, refreshPendientes]);

  // Filtramos por búsqueda sobre cliente sincronizado y pendientes
  type ListItem =
    | { kind: 'synced'; client: ClientDTO }
    | { kind: 'pending'; client: PendingClient };

  const allItems: ListItem[] = useMemo(() => {
    const pendingItems: ListItem[] = pendientes.map((p) => ({ kind: 'pending', client: p }));
    const syncedItems: ListItem[] = data.map((c) => ({ kind: 'synced', client: c }));
    return [...pendingItems, ...syncedItems];
  }, [pendientes, data]);

  const filtered = useMemo(() => {
    if (!query) return allItems;
    const q = query.toLowerCase();
    return allItems.filter((item) => {
      const c = item.client;
      return (
        c.nombre_razon_social.toLowerCase().includes(q) ||
        (c.numero_documento ?? '').toLowerCase().includes(q) ||
        ((c as any).telefono ?? '').toLowerCase().includes(q) ||
        ((c as any).celular ?? '').toLowerCase().includes(q)
      );
    });
  }, [allItems, query]);

  const withBalance = data.filter((c) => parseFloat(c.cupo_autorizado) > 0).length;
  const pendientesCount = pendientes.length;

  const goCreate = () => nav.navigate('CreateClient');

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="Clientes"
        subtitle={
          loading
            ? 'Cargando...'
            : pendientesCount > 0
              ? `${filtered.length} · ${pendientesCount} pendientes de sync`
              : `${filtered.length} clientes · ${withBalance} con cupo`
        }
        onBack={() => nav.goBack()}
        actions={[{ icon: 'add', onPress: goCreate }]}
      />

      <View style={styles.searchRow}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar por nombre, doc. o tel..." />
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error && data.length === 0 ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Error al cargar"
          description={error}
          actionLabel="Reintentar"
          onAction={refresh}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Sin clientes"
          description={query ? 'No hay clientes que coincidan con tu búsqueda.' : 'Aún no tienes clientes asignados.'}
          actionLabel="Crear cliente"
          onAction={goCreate}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) =>
            item.kind === 'pending'
              ? `p-${item.client.id}`
              : `c-${item.client.id_cliente}`
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            if (item.kind === 'pending') {
              const p = item.client;
              const isError = p.status === 'error';
              return (
                <Card style={isError ? styles.cardError : styles.cardPending}>
                  <View style={styles.row}>
                    <View style={[styles.avatar, styles.avatarPending]}>
                      <Text style={styles.avatarText}>
                        {initials(p.nombre_razon_social)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {p.nombre_razon_social}
                      </Text>
                      <Text style={typography.caption}>
                        {p.tipo_documento}: {p.numero_documento}
                      </Text>
                      <View style={{ marginTop: spacing.sm, flexDirection: 'row' }}>
                        <Badge
                          label={isError ? 'Error de envío' : 'Pendiente de sync'}
                          tone={isError ? 'danger' : 'warning'}
                          icon={isError ? 'alert-circle' : 'time-outline'}
                        />
                      </View>
                      {p.error_message && (
                        <Text
                          style={[typography.caption, { color: colors.dangerDark, marginTop: 4 }]}
                          numberOfLines={2}
                        >
                          {p.error_message}
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              );
            }

            const c = item.client;
            const cupo = parseFloat(c.cupo_autorizado);
            const phone = c.telefono || c.celular;
            return (
              <Card onPress={() => nav.navigate('ClientDetail', { clientId: c.id_cliente })}>
                <View style={styles.row}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(c.nombre_razon_social)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {c.nombre_razon_social}
                    </Text>
                    <Text style={typography.caption}>
                      {c.tipo_documento}: {c.numero_documento}
                    </Text>
                    {(c.telefono || c.celular) && (
                      <View style={styles.metaRow}>
                        <Ionicons name="call-outline" size={13} color={colors.textMuted} />
                        <Text style={typography.caption}>{c.telefono || c.celular}</Text>
                      </View>
                    )}
                    {c.direccion && (
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                        <Text style={typography.caption} numberOfLines={1}>
                          {c.direccion}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    {cupo > 0 ? (
                      <>
                        <Text style={typography.label}>Cupo</Text>
                        <Text style={styles.balance}>{formatCurrency(cupo)}</Text>
                      </>
                    ) : (
                      <Badge label="Contado" tone="neutral" dot />
                    )}
                  </View>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => nav.navigate('ClientDetail', { clientId: c.id_cliente })}
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="eye-outline" size={16} color={colors.primary} />
                    <Text style={styles.actionText}>Ver</Text>
                  </Pressable>
                  {phone && (
                    <Pressable
                      onPress={() =>
                        require('react-native').Linking.openURL(`tel:${phone}`).catch(() => {})
                      }
                      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}
                    >
                      <Ionicons name="call" size={16} color={colors.primary} />
                      <Text style={styles.actionText}>Llamar</Text>
                    </Pressable>
                  )}
                  <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}>
                    <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                    <Text style={styles.actionText}>Facturar</Text>
                  </Pressable>
                </View>
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      )}

      <Pressable
        onPress={goCreate}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}
        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
      >
        <Ionicons name="person-add" size={24} color={colors.textInverse} />
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textInverse, fontWeight: '700' },
  avatarPending: { backgroundColor: colors.warningDark },
  cardPending: { borderLeftWidth: 3, borderLeftColor: colors.warning },
  cardError: { borderLeftWidth: 3, borderLeftColor: colors.danger, backgroundColor: colors.dangerLight },
  name: { ...typography.bodyStrong, fontSize: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  balance: { ...typography.bodyStrong, color: colors.warningDark, fontSize: 15 },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  actionText: { ...typography.caption, fontWeight: '600', color: colors.primary },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.raised,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
  },
});
