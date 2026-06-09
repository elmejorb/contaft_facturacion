import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge, Card, EmptyState, Header, Screen, SearchBar } from '../components';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency } from '../utils/format';
import {
  productosApi,
  categoriasApi,
  ProductDTO,
  CategoriaDTO,
} from '../services/api';
import { useCachedList } from '../hooks/useCachedList';
import { productsRepo } from '../db/productsRepo';
import { categoriesRepo } from '../db/categoriesRepo';
import { useAuthStore } from '../stores/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const ProductsScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const empresaId = useAuthStore((s) => s.company?.id ?? 0);

  const { data, loading, refreshing, error, refresh } = useCachedList<ProductDTO>({
    fetchFromApi: () => productosApi.list(),
    readFromCache: () => productsRepo.listAll(empresaId),
    writeCache: (d) => productsRepo.replaceAll(empresaId, d),
    enabled: empresaId > 0,
  });

  const categoriasReq = useCachedList<CategoriaDTO>({
    fetchFromApi: () => categoriasApi.list(),
    readFromCache: () => categoriesRepo.listAll(empresaId),
    writeCache: (d) => categoriesRepo.replaceAll(empresaId, d),
    enabled: empresaId > 0,
  });

  // Solo mostramos categorías que de verdad tengan productos
  const categoriasUsadas = useMemo(() => {
    const idsEnProductos = new Set(
      data.map((p) => p.id_categoria).filter((id): id is number => id != null),
    );
    return categoriasReq.data.filter((c) => idsEnProductos.has(c.id_categoria));
  }, [data, categoriasReq.data]);

  const filtered = useMemo(() => {
    return data.filter((p) => {
      const matchQ =
        !query ||
        p.nombre.toLowerCase().includes(query.toLowerCase()) ||
        p.codigo.toLowerCase().includes(query.toLowerCase());
      const matchC = categoriaId == null || p.id_categoria === categoriaId;
      return matchQ && matchC;
    });
  }, [data, query, categoriaId]);

  const stockTone = (stock: number) => {
    if (stock === 0) return { tone: 'danger' as const, label: 'Sin stock' };
    if (stock < 20) return { tone: 'warning' as const, label: `${stock}` };
    return { tone: 'success' as const, label: `${stock}` };
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="Productos"
        subtitle={loading ? 'Cargando...' : `${filtered.length} productos`}
        onBack={() => nav.goBack()}
      />

      <View style={styles.searchRow}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar por nombre o código..." />
      </View>

      {categoriasUsadas.length > 0 && (
        <View style={styles.catContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
          >
            <Pressable
              onPress={() => setCategoriaId(null)}
              style={[styles.chip, categoriaId === null && styles.chipActive]}
            >
              <Text style={[styles.chipText, categoriaId === null && styles.chipTextActive]}>
                Todas
              </Text>
            </Pressable>
            {categoriasUsadas.map((c) => {
              const active = categoriaId === c.id_categoria;
              return (
                <Pressable
                  key={c.id_categoria}
                  onPress={() => setCategoriaId(c.id_categoria)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {c.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

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
          icon="cube-outline"
          title="Sin productos"
          description={query ? 'No coincide ningún producto.' : 'No hay productos en el catálogo.'}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => String(p.id_producto)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            const stockNum = parseFloat(item.stock);
            const s = stockTone(stockNum);
            const precio = parseFloat(item.precio_venta);
            return (
              <Card>
                <View style={styles.row}>
                  <View style={styles.icon}>
                    <Ionicons name="cube-outline" size={24} color={colors.warningDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={2}>
                      {item.nombre}
                    </Text>
                    <Text style={typography.caption}>
                      SKU: {item.codigo} · IVA {item.porcentaje_iva}%
                    </Text>
                    <View style={styles.footer}>
                      <Text style={styles.price}>{formatCurrency(precio)}</Text>
                      <Badge label={s.label} tone={s.tone} icon="layers-outline" />
                    </View>
                  </View>
                </View>
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  catContainer: { paddingBottom: spacing.md },
  catRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, flexDirection: 'row' },
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

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.bodyStrong, fontSize: 15 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  price: { ...typography.h3, color: colors.primary },
});
