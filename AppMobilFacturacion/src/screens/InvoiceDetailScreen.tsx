import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge, Button, Card, EmptyState, Header, Screen } from '../components';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency, formatDateTime, initials } from '../utils/format';
import { ventasApi, VentaDTO, VentaDetalleDTO } from '../services/api';
import { useFetch } from '../hooks/useFetch';

type Nav = NativeStackNavigationProp<RootStackParamList, 'InvoiceDetail'>;
type Rt = RouteProp<RootStackParamList, 'InvoiceDetail'>;

const payLabels: Record<string, string> = {
  contado: 'Contado',
  credito: 'Crédito',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

export const InvoiceDetailScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const invoiceId = route.params.invoiceId;

  const { data, loading, error, reload } = useFetch<{
    venta: VentaDTO;
    detalles: VentaDetalleDTO[];
  }>(() => ventasApi.show(invoiceId), [invoiceId]);

  if (loading && !data) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <Header title="Cargando..." onBack={() => nav.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <Header title="Factura" onBack={() => nav.goBack()} />
        <EmptyState
          icon="alert-circle-outline"
          title="Error al cargar"
          description={error ?? 'No se pudo cargar la factura.'}
          actionLabel="Reintentar"
          onAction={reload}
        />
      </Screen>
    );
  }

  const { venta, detalles } = data;
  const isSentDian = !!venta.cufe;
  const isError = venta.estado === 'error';

  const badgeTone = isSentDian ? 'success' : isError ? 'danger' : 'warning';
  const badgeLabel = isSentDian
    ? 'Enviada DIAN'
    : isError
      ? 'Error'
      : 'Registrada';

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title={venta.numero_factura}
        subtitle={formatDateTime(venta.fecha_venta + 'T00:00:00Z')}
        onBack={() => nav.goBack()}
        actions={[{ icon: 'share-outline', onPress: () => {} }]}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusBlock}>
          <View style={styles.statusInner}>
            <Badge
              label={badgeLabel}
              tone={badgeTone}
              dot
              icon={
                isSentDian
                  ? 'checkmark-circle'
                  : isError
                    ? 'alert-circle'
                    : 'time-outline'
              }
            />
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(parseFloat(venta.total))}</Text>
            {venta.forma_pago && (
              <View style={styles.payChip}>
                <Ionicons name="card-outline" size={14} color={colors.primaryDark} />
                <Text style={styles.payChipText}>
                  {payLabels[venta.forma_pago] ?? venta.forma_pago}
                </Text>
              </View>
            )}
          </View>
        </View>

        {isError && (
          <Card style={{ backgroundColor: colors.dangerLight, borderColor: colors.danger }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
              <Ionicons name="alert-circle" size={22} color={colors.dangerDark} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Error en envío</Text>
                <Text style={[typography.caption, { color: colors.dangerDark, marginTop: 2 }]}>
                  {venta.estado_dian ?? 'Reintenta el envío desde el botón inferior.'}
                </Text>
              </View>
            </View>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Cliente</Text>
        <Card>
          <View style={styles.clientRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initials(venta.nombre_razon_social ?? '?')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{venta.nombre_razon_social ?? 'Cliente'}</Text>
              <Text style={typography.caption}>
                {venta.tipo_documento ?? ''}: {venta.numero_documento ?? '-'}
              </Text>
              {venta.cliente_telefono && (
                <Text style={typography.caption}>{venta.cliente_telefono}</Text>
              )}
              {venta.cliente_direccion && (
                <Text style={typography.caption} numberOfLines={2}>
                  {venta.cliente_direccion}
                </Text>
              )}
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Detalle ({detalles.length} ítems)</Text>
        <Card padded={false}>
          {detalles.map((it, idx) => (
            <View
              key={it.id_detalle}
              style={[
                styles.lineItem,
                idx !== detalles.length - 1 && styles.lineBorder,
              ]}
            >
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyBadgeText}>{parseFloat(it.cantidad)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {it.nombre_producto}
                </Text>
                <Text style={typography.caption}>
                  {formatCurrency(parseFloat(it.precio_unitario))} c/u · IVA {parseFloat(it.porcentaje_iva)}%
                </Text>
              </View>
              <Text style={styles.itemLineTotal}>
                {formatCurrency(parseFloat(it.total))}
              </Text>
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>Totales</Text>
        <Card>
          <View style={styles.sumRow}>
            <Text style={typography.body}>Subtotal</Text>
            <Text style={typography.body}>{formatCurrency(parseFloat(venta.subtotal))}</Text>
          </View>
          {venta.descuento && parseFloat(venta.descuento) > 0 && (
            <View style={styles.sumRow}>
              <Text style={typography.body}>Descuento</Text>
              <Text style={typography.body}>- {formatCurrency(parseFloat(venta.descuento))}</Text>
            </View>
          )}
          <View style={styles.sumRow}>
            <Text style={typography.body}>IVA</Text>
            <Text style={typography.body}>{formatCurrency(parseFloat(venta.total_impuestos))}</Text>
          </View>
          <View style={[styles.sumRow, styles.sumTotal]}>
            <Text style={typography.h3}>Total</Text>
            <Text style={styles.grandTotal}>{formatCurrency(parseFloat(venta.total))}</Text>
          </View>
        </Card>

        {venta.cufe && (
          <>
            <Text style={styles.sectionTitle}>DIAN</Text>
            <Card>
              <Text style={typography.caption}>CUFE</Text>
              <Text style={styles.cufe} selectable>
                {venta.cufe}
              </Text>
            </Card>
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Imprimir"
              icon="print-outline"
              variant="secondary"
              size="lg"
              onPress={() => Alert.alert('Imprimir', 'Próximamente: impresión Bluetooth')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Compartir"
              icon="share-social-outline"
              variant="secondary"
              size="lg"
              onPress={() => {}}
            />
          </View>
        </View>
        {!isSentDian && (
          <Button
            label={isError ? 'Reintentar envío' : 'Enviar a DIAN'}
            icon="cloud-upload-outline"
            size="lg"
            onPress={() => Alert.alert('Próximamente', 'Integración DIAN en fase 4')}
          />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: 200 },
  statusBlock: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusInner: { alignItems: 'center', gap: spacing.sm },
  totalLabel: { ...typography.caption, color: 'rgba(255,255,255,0.85)', marginTop: spacing.sm },
  totalValue: { ...typography.displayLg, color: colors.textInverse, fontSize: 40 },
  payChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  payChipText: { ...typography.captionStrong, color: colors.primaryDark },

  sectionTitle: { ...typography.label, marginTop: spacing.lg, marginBottom: spacing.sm },
  errorTitle: { ...typography.bodyStrong, color: colors.dangerDark },

  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700' },
  clientName: { ...typography.bodyStrong, fontSize: 16 },

  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
  },
  lineBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  qtyBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadgeText: { ...typography.bodyStrong, color: colors.primary, fontSize: 14 },
  itemName: { ...typography.bodyStrong, fontSize: 14 },
  itemLineTotal: { ...typography.bodyStrong },

  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  sumTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  grandTotal: { ...typography.h1, color: colors.primary },

  cufe: {
    ...typography.caption,
    fontFamily: 'monospace',
    marginTop: 4,
    color: colors.text,
  },

  bottomBar: {
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
