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

export const OrdersScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const [query, setQuery] = useState('');

  const { data, loading, refreshing, error, refresh } = useFetch<VentaDTO[]>(
    () => ventasApi.list({ origen: 'pedido' }),
    [],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter(
      (o) =>
        (o.nombre_razon_social ?? '').toLowerCase().includes(q) ||
        o.numero_factura.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="Pedidos"
        subtitle={
          loading && !data
            ? 'Cargando...'
            : `${filtered.length} ${filtered.length === 1 ? 'pedido' : 'pedidos'}`
        }
      />

      <View style={styles.searchRow}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar por cliente o número..." />
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
          icon="cart-outline"
          title="Sin pedidos"
          description={query ? 'No hay coincidencias.' : 'Aún no has creado pedidos.'}
          actionLabel="Crear pedido"
          onAction={() => nav.navigate('CreateOrder')}
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
          renderItem={({ item }) => (
            <Card onPress={() => nav.navigate('InvoiceDetail', { invoiceId: String(item.id_venta) })}>
              <View style={styles.orderHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderNumber}>{item.numero_factura}</Text>
                  <Text style={styles.orderClient} numberOfLines={1}>
                    {item.nombre_razon_social ?? 'Cliente'}
                  </Text>
                </View>
                <Badge label="Pedido" tone="info" dot icon="cart-outline" />
              </View>

              <View style={styles.orderMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.metaText}>
                    {formatDateTime(item.fecha_venta + 'T00:00:00Z')}
                  </Text>
                </View>
              </View>

              <View style={styles.orderFooter}>
                <Text style={typography.caption}>Total</Text>
                <Text style={styles.orderTotal}>{formatCurrency(parseFloat(item.total))}</Text>
              </View>
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      )}

      <Pressable
        onPress={() => nav.navigate('CreateOrder')}
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  orderHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  orderNumber: { ...typography.captionStrong, color: colors.primary, marginBottom: 2 },
  orderClient: { ...typography.bodyStrong, fontSize: 16 },
  orderMeta: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.caption },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  orderTotal: { ...typography.h3, color: colors.text },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.raised,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
  },
});
