import React, { useMemo, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge, Card, EmptyState, Header, Screen, SearchBar } from '../components';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { ventasApi, VentaDTO } from '../services/api';
import { useFetch } from '../hooks/useFetch';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Filter = 'all' | 'registrada' | 'sent_dian' | 'error';

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'registrada', label: 'Registradas' },
  { key: 'sent_dian', label: 'Enviadas DIAN' },
  { key: 'error', label: 'Con error' },
];

const statusBadge = (v: VentaDTO) => {
  if (v.estado === 'error' || v.cufe === null && (v as any).estado_dian === 'error') {
    return { tone: 'danger' as const, label: 'Error' };
  }
  if (v.cufe) {
    return { tone: 'success' as const, label: 'Enviada DIAN' };
  }
  return { tone: 'warning' as const, label: 'Registrada' };
};

export const InvoicesScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const { data, loading, refreshing, error, refresh } = useFetch<VentaDTO[]>(
    () => ventasApi.list({ excluir_origen: 'pedido' }),
    [],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((v) => {
      const matchQ =
        !query ||
        (v.nombre_razon_social ?? '').toLowerCase().includes(query.toLowerCase()) ||
        v.numero_factura.toLowerCase().includes(query.toLowerCase());
      const matchF =
        filter === 'all' ||
        (filter === 'registrada' && !v.cufe && v.estado !== 'error') ||
        (filter === 'sent_dian' && !!v.cufe) ||
        (filter === 'error' && v.estado === 'error');
      return matchQ && matchF;
    });
  }, [data, query, filter]);

  const totalFiltered = filtered.reduce((a, b) => a + parseFloat(b.total), 0);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="Facturas"
        subtitle={
          loading && !data
            ? 'Cargando...'
            : `${filtered.length} · ${formatCurrency(totalFiltered)}`
        }
      />

      <View style={styles.searchRow}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar por cliente o número..." />
      </View>

      <View style={styles.filters}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading && !data ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Error al cargar"
          description={error}
          actionLabel="Reintentar"
          onAction={refresh}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Sin facturas"
          description={query || filter !== 'all' ? 'No hay facturas con los filtros aplicados.' : 'Aún no has creado facturas.'}
          actionLabel="Crear factura"
          onAction={() => nav.navigate('CreateInvoice')}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id_venta)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            const sb = statusBadge(item);
            return (
              <Card onPress={() => nav.navigate('InvoiceDetail', { invoiceId: String(item.id_venta) })}>
                <View style={styles.head}>
                  <View style={styles.iconWrap}>
                    <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.number}>{item.numero_factura}</Text>
                    <Text style={styles.client} numberOfLines={1}>
                      {item.nombre_razon_social ?? 'Cliente'}
                    </Text>
                    <Text style={styles.meta}>
                      {formatDateTime(item.fecha_venta + 'T00:00:00Z')} · {item.forma_pago}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.total}>{formatCurrency(parseFloat(item.total))}</Text>
                    <Badge label={sb.label} tone={sb.tone} dot />
                  </View>
                </View>
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      )}

      <Pressable
        onPress={() => nav.navigate('CreateInvoice')}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}
        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse },

  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { ...typography.captionStrong, color: colors.primary, marginBottom: 2 },
  client: { ...typography.bodyStrong, fontSize: 16 },
  meta: { ...typography.caption, marginTop: 2 },
  total: { ...typography.h3 },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.raised,
    shadowColor: colors.success,
    shadowOpacity: 0.35,
  },
});
