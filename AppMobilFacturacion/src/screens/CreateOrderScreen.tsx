import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Badge,
  Button,
  Card,
  Header,
  QuantityStepper,
  Screen,
  SearchBar,
} from '../components';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency, initials } from '../utils/format';
import {
  clientesApi,
  productosApi,
  ClientDTO,
  ProductDTO,
} from '../services/api';
import { useCachedList } from '../hooks/useCachedList';
import { clientsRepo } from '../db/clientsRepo';
import { productsRepo } from '../db/productsRepo';
import { useAuthStore } from '../stores/authStore';
import { saveOrQueueSale } from '../services/syncService';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface LocalLineItem {
  id_producto: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  porcentaje_iva: number;
}

export const CreateOrderScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const vendor = useAuthStore((s) => s.vendor);
  const company = useAuthStore((s) => s.company);
  const empresaId = company?.id ?? 0;

  const [client, setClient] = useState<ClientDTO | null>(null);
  const [items, setItems] = useState<LocalLineItem[]>([]);
  const [showClients, setShowClients] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const clientsReq = useCachedList<ClientDTO>({
    fetchFromApi: () => clientesApi.list(),
    readFromCache: () => clientsRepo.listAll(empresaId),
    writeCache: (d) => clientsRepo.replaceAll(empresaId, d),
    enabled: empresaId > 0,
  });
  const productsReq = useCachedList<ProductDTO>({
    fetchFromApi: () => productosApi.list(),
    readFromCache: () => productsRepo.listAll(empresaId),
    writeCache: (d) => productsRepo.replaceAll(empresaId, d),
    enabled: empresaId > 0,
  });

  const subtotal = items.reduce((a, b) => a + b.precio_unitario * b.cantidad, 0);
  const tax = items.reduce(
    (a, b) => a + b.precio_unitario * b.cantidad * (b.porcentaje_iva / 100),
    0,
  );
  const total = subtotal + tax;

  const addProduct = (p: ProductDTO) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id_producto === p.id_producto);
      if (existing) {
        return prev.map((i) =>
          i.id_producto === p.id_producto ? { ...i, cantidad: i.cantidad + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          id_producto: p.id_producto,
          nombre: p.nombre,
          cantidad: 1,
          precio_unitario: parseFloat(p.precio_venta),
          porcentaje_iva: parseFloat(p.porcentaje_iva),
        },
      ];
    });
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty === 0) {
      setItems((prev) => prev.filter((i) => i.id_producto !== productId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id_producto === productId ? { ...i, cantidad: qty } : i)),
      );
    }
  };

  const handleSave = async () => {
    if (!client) {
      Alert.alert('Falta cliente', 'Selecciona un cliente para el pedido.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Agrega productos', 'El pedido debe tener al menos un ítem.');
      return;
    }
    if (!vendor || !empresaId) {
      Alert.alert('Error', 'Sesión inválida');
      return;
    }
    setSaving(true);
    try {
      const result = await saveOrQueueSale({
        id_vendedor_mobile: vendor.id,
        id_empresa: empresaId,
        id_cliente: client.id_cliente,
        cliente_nombre: client.nombre_razon_social,
        forma_pago: 'credito',
        origen: 'pedido',
        items: items.map((it) => ({
          id_producto: it.id_producto,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          porcentaje_iva: it.porcentaje_iva,
        })),
        subtotal,
        impuestos: tax,
        total,
      });

      if (result.sent) {
        Alert.alert(
          'Pedido enviado',
          `${result.remoteNumeroFactura} · ${formatCurrency(total)}`,
          [{ text: 'OK', onPress: () => nav.goBack() }],
        );
      } else {
        Alert.alert(
          'Guardado local',
          result.error
            ? `Pendiente: ${result.error}\n\nSe reenviará cuando haya red.`
            : 'Sin conexión. Se enviará cuando haya red.',
          [{ text: 'OK', onPress: () => nav.goBack() }],
        );
      }
    } catch (e) {
      Alert.alert('Error inesperado', String(e));
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!clientsReq.data) return [];
    if (!clientQuery) return clientsReq.data;
    const q = clientQuery.toLowerCase();
    return clientsReq.data.filter(
      (c) =>
        c.nombre_razon_social.toLowerCase().includes(q) ||
        (c.numero_documento ?? '').toLowerCase().includes(q),
    );
  }, [clientsReq.data, clientQuery]);

  const filteredProducts = useMemo(() => {
    if (!productsReq.data) return [];
    if (!productQuery) return productsReq.data;
    const q = productQuery.toLowerCase();
    return productsReq.data.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q),
    );
  }, [productsReq.data, productQuery]);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Nuevo Pedido" onBack={() => nav.goBack()} />

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id_producto)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <Text style={styles.sectionTitle}>Cliente</Text>
            {client ? (
              <Card onPress={() => setShowClients(true)}>
                <View style={styles.clientRow}>
                  <View style={styles.clientAvatar}>
                    <Text style={styles.clientAvatarText}>
                      {initials(client.nombre_razon_social)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>{client.nombre_razon_social}</Text>
                    <Text style={typography.caption}>
                      {client.tipo_documento}: {client.numero_documento}
                    </Text>
                  </View>
                  <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
                </View>
              </Card>
            ) : (
              <Pressable
                onPress={() => setShowClients(true)}
                style={({ pressed }) => [styles.pickerBtn, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                <Text style={styles.pickerText}>Seleccionar cliente</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>
            )}

            <View style={styles.productsHead}>
              <Text style={styles.sectionTitle}>Productos ({items.length})</Text>
              <Pressable onPress={() => setShowProducts(true)} hitSlop={8}>
                <Text style={styles.linkText}>+ Agregar</Text>
              </Pressable>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.nombre}
                </Text>
                <Text style={styles.itemPrice}>{formatCurrency(item.precio_unitario)} c/u</Text>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => updateQty(item.id_producto, 0)}
                style={styles.removeBtn}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
            <View style={styles.itemFooter}>
              <QuantityStepper
                value={item.cantidad}
                onChange={(v) => updateQty(item.id_producto, v)}
                size="sm"
                min={0}
              />
              <Text style={styles.itemTotal}>
                {formatCurrency(item.precio_unitario * item.cantidad)}
              </Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Pressable
            onPress={() => setShowProducts(true)}
            style={({ pressed }) => [styles.emptyProducts, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="cube-outline" size={28} color={colors.primary} />
            <Text style={styles.emptyProductsTitle}>Agrega productos</Text>
            <Text style={styles.emptyProductsSub}>Toca aquí para buscar en el catálogo</Text>
          </Pressable>
        }
      />

      <View style={styles.summary}>
        <View style={styles.sumRow}>
          <Text style={typography.caption}>Subtotal</Text>
          <Text style={typography.body}>{formatCurrency(subtotal)}</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={typography.caption}>IVA</Text>
          <Text style={typography.body}>{formatCurrency(tax)}</Text>
        </View>
        <View style={[styles.sumRow, styles.sumTotal]}>
          <Text style={typography.h3}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
        <View style={{ marginBottom: spacing.md }}>
          <Badge label="Pedido (no genera factura)" tone="info" icon="information-circle-outline" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label="Cancelar" variant="secondary" onPress={() => nav.goBack()} size="lg" />
          <View style={{ flex: 2 }}>
            <Button
              label="Guardar pedido"
              icon="checkmark-circle-outline"
              onPress={handleSave}
              size="lg"
              loading={saving}
            />
          </View>
        </View>
      </View>

      <PickerModal
        visible={showClients}
        onClose={() => setShowClients(false)}
        title="Seleccionar cliente"
        search={clientQuery}
        onSearch={setClientQuery}
        placeholder="Buscar por nombre o documento..."
      >
        {clientsReq.loading && !clientsReq.data ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredClients}
            keyExtractor={(c) => String(c.id_cliente)}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setClient(item);
                  setShowClients(false);
                  setClientQuery('');
                }}
                android_ripple={{ color: colors.primarySoft }}
                style={({ pressed }) => [styles.pickerItem, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.clientAvatarSm}>
                  <Text style={styles.clientAvatarTextSm}>
                    {initials(item.nombre_razon_social)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.nombre_razon_social}</Text>
                  <Text style={typography.caption}>
                    {item.tipo_documento}: {item.numero_documento}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </PickerModal>

      <PickerModal
        visible={showProducts}
        onClose={() => setShowProducts(false)}
        title="Agregar productos"
        search={productQuery}
        onSearch={setProductQuery}
        placeholder="Buscar por nombre o código..."
      >
        {productsReq.loading && !productsReq.data ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(p) => String(p.id_producto)}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
            renderItem={({ item }) => {
              const inCart = items.find((i) => i.id_producto === item.id_producto);
              const stock = parseFloat(item.stock);
              const outOfStock = stock === 0;
              return (
                <Pressable
                  onPress={() => !outOfStock && addProduct(item)}
                  disabled={outOfStock}
                  android_ripple={{ color: colors.primarySoft }}
                  style={({ pressed }) => [
                    styles.pickerItem,
                    pressed && { opacity: 0.85 },
                    outOfStock && { opacity: 0.5 },
                  ]}
                >
                  <View style={styles.prodIcon}>
                    <Ionicons name="cube-outline" size={22} color={colors.warningDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.nombre}
                    </Text>
                    <Text style={typography.caption}>
                      {item.codigo} ·{' '}
                      <Text
                        style={{
                          color: outOfStock
                            ? colors.danger
                            : stock < 20
                              ? colors.warningDark
                              : colors.success,
                          fontWeight: '600',
                        }}
                      >
                        {outOfStock ? 'Sin stock' : `Stock: ${stock}`}
                      </Text>
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.itemPriceBig}>
                      {formatCurrency(parseFloat(item.precio_venta))}
                    </Text>
                    {inCart && (
                      <View style={styles.inCartBadge}>
                        <Text style={styles.inCartText}>×{inCart.cantidad}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </PickerModal>
    </Screen>
  );
};

const PickerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}> = ({ visible, onClose, title, search, onSearch, placeholder, children }) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <Header title={title} onBack={onClose} />
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <SearchBar value={search} onChangeText={onSearch} placeholder={placeholder} autoFocus />
      </View>
      {children}
    </Screen>
  </Modal>
);

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 300 },
  sectionTitle: { ...typography.label, marginBottom: spacing.sm, marginTop: spacing.xs },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  pickerText: { ...typography.bodyStrong, color: colors.primary, flex: 1 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: { color: colors.textInverse, fontWeight: '700' },
  clientName: { ...typography.bodyStrong, fontSize: 16 },
  productsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  linkText: { ...typography.bodyStrong, color: colors.primary },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  itemName: { ...typography.bodyStrong, fontSize: 15 },
  itemPrice: { ...typography.caption, marginTop: 2 },
  itemPriceBig: { ...typography.bodyStrong, color: colors.text },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  itemTotal: { ...typography.h3 },
  emptyProducts: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
  },
  emptyProductsTitle: { ...typography.h3, marginTop: spacing.md, color: colors.primary },
  emptyProductsSub: { ...typography.caption, marginTop: 4 },

  summary: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadows.raised,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  sumTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  totalValue: { ...typography.h1, color: colors.primary },

  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  separator: { height: 1, backgroundColor: colors.divider },
  clientAvatarSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarTextSm: { color: colors.primary, fontWeight: '700' },
  prodIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inCartBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  inCartText: { color: colors.textInverse, fontSize: 11, fontWeight: '700' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
});
