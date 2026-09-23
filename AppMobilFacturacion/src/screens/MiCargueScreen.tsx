import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Card, Header, Screen } from '../components';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../stores/authStore';
import { productsRepo } from '../db/productsRepo';
import { carguesApi, CargueDTO, ProductDTO } from '../services/api';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const fmt = (v: number | string | null | undefined) =>
  '$ ' + Math.round(Number(v) || 0).toLocaleString('es-CO');

interface LineaLocal {
  item_id: number;
  nombre: string;
  precio_venta: number;
  precio_costo: number;
  cantidad: string; // input controlado
}

export const MiCargueScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const company = useAuthStore((s) => s.company);
  const [cargue, setCargue] = useState<CargueDTO | null>(null);
  const [productos, setProductos] = useState<ProductDTO[]>([]);
  const [lineas, setLineas] = useState<LineaLocal[]>([]);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [modoCerrar, setModoCerrar] = useState(false);
  const [devs, setDevs] = useState<Record<number, { dev: string; dan: string }>>({});
  const [dinero, setDinero] = useState('');

  const cargar = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    try {
      const actual = await carguesApi.miActual();
      setCargue(actual);
      if (!actual) {
        const prods = await productsRepo.listAll(company.id);
        setProductos(prods);
        setLineas(prods.map((p) => ({
          item_id: p.id_producto,
          nombre: p.nombre,
          precio_venta: Number(p.precio_venta) || 0,
          precio_costo: 0,
          cantidad: '',
        })));
      } else {
        // preparar mapa devs con ceros
        const m: Record<number, { dev: string; dan: string }> = {};
        actual.items.forEach((l) => { if (l.id) m[l.id] = { dev: '', dan: '' }; });
        setDevs(m);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useFocusEffect(useCallback(() => { cargar(); setModoCerrar(false); }, [cargar]));

  const totalArmando = useMemo(() =>
    lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0) * l.precio_venta, 0), [lineas]);

  const enviarCargue = async () => {
    const conCant = lineas.filter((l) => Number(l.cantidad) > 0);
    if (conCant.length === 0) { Alert.alert('Sin líneas', 'Ingresa al menos una cantidad'); return; }
    setEnviando(true);
    try {
      await carguesApi.crear({
        lineas: conCant.map((l) => ({
          item_id: l.item_id,
          nombre_producto: l.nombre,
          cantidad: Number(l.cantidad),
          precio_venta: l.precio_venta,
          precio_costo: l.precio_costo,
        })),
        notas: notas || undefined,
      });
      Alert.alert('Enviado', 'Tu cargue quedó pendiente de aprobación del admin');
      await cargar();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setEnviando(false); }
  };

  const cerrarCargue = async () => {
    if (!cargue) return;
    // Validar cantidades
    const items: { id: number; cant_devuelta: number; cant_danada: number }[] = [];
    for (const l of cargue.items) {
      if (!l.id) continue;
      const d = devs[l.id] || { dev: '', dan: '' };
      const cd = Number(d.dev) || 0;
      const cn = Number(d.dan) || 0;
      const cargado = Number(l.cant_cargue) || 0;
      if (cd + cn > cargado) {
        Alert.alert('Cantidad inválida', `${l.nombre_producto}: devuelto+dañado (${cd}+${cn}) supera cargue (${cargado})`);
        return;
      }
      items.push({ id: l.id, cant_devuelta: cd, cant_danada: cn });
    }
    const din = Number(dinero) || 0;
    if (din === 0 && !(await new Promise<boolean>((res) => Alert.alert(
      'Dinero en 0',
      '¿Confirmas cerrar sin dinero recibido?',
      [{ text: 'No', style: 'cancel', onPress: () => res(false) }, { text: 'Sí, cerrar', onPress: () => res(true) }],
    )))) return;

    setEnviando(true);
    try {
      await carguesApi.cerrar(cargue.id, { items, dinero_recibido: din, notas: notas || undefined });
      Alert.alert('Cerrado', 'Cargue cerrado. Espera cuadre del admin.');
      await cargar();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setEnviando(false); }
  };

  const badgeEstado = (estado: string) => {
    const bg = estado === 'pendiente' ? '#fef3c7' :
               estado === 'aprobado' ? '#dcfce7' :
               estado === 'cerrado' ? '#dbeafe' : '#fee2e2';
    const color = estado === 'pendiente' ? '#92400e' :
                  estado === 'aprobado' ? '#166534' :
                  estado === 'cerrado' ? '#1e40af' : '#991b1b';
    return (
      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: bg }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color }}>{estado.toUpperCase()}</Text>
      </View>
    );
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Mi cargue del día" onBack={() => nav.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.center}><Text style={typography.body}>Cargando...</Text></View>
        ) : !cargue ? (
          // Modo: armar cargue
          <>
            <Card padded style={{ margin: spacing.md }}>
              <Text style={typography.h3}>Arma tu cargue</Text>
              <Text style={typography.caption}>Escribe la cantidad que vas a cargar de cada producto</Text>
              <Text style={[typography.h2, { marginTop: spacing.sm, color: colors.primary }]}>{fmt(totalArmando)}</Text>
            </Card>
            <FlatList
              data={lineas}
              keyExtractor={(l) => String(l.item_id)}
              contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 200 }}
              renderItem={({ item, index }) => (
                <View style={styles.linea}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineaNombre} numberOfLines={2}>{item.nombre}</Text>
                    <Text style={typography.caption}>{fmt(item.precio_venta)} c/u</Text>
                  </View>
                  <TextInput
                    keyboardType="numeric"
                    value={item.cantidad}
                    onChangeText={(t) => setLineas((prev) => prev.map((l, i) => i === index ? { ...l, cantidad: t.replace(/[^0-9.]/g, '') } : l))}
                    placeholder="0"
                    style={styles.input}
                  />
                </View>
              )}
              ListFooterComponent={(
                <View style={{ marginTop: spacing.lg }}>
                  <Text style={typography.label}>Notas (opcional)</Text>
                  <TextInput
                    value={notas}
                    onChangeText={setNotas}
                    placeholder="Ej: llevo doble de pan queso porque hay evento"
                    multiline
                    style={styles.notas}
                  />
                </View>
              )}
            />
            <View style={styles.footer}>
              <Pressable onPress={enviarCargue} disabled={enviando} style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.8 }]}>
                <Ionicons name="send" size={18} color="white" />
                <Text style={styles.btnPrimaryText}>{enviando ? 'Enviando...' : 'Enviar cargue'}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          // Modo: ver estado / cerrar
          <>
            <Card padded style={{ margin: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={typography.h3}>Cargue #{cargue.id}</Text>
                {badgeEstado(cargue.estado)}
              </View>
              <Text style={[typography.caption, { marginTop: 4 }]}>Fecha: {cargue.fecha}</Text>
              <Text style={[typography.h2, { marginTop: spacing.sm, color: colors.primary }]}>{fmt(cargue.total_valor_cargue)}</Text>
              {cargue.notas_admin && (
                <View style={styles.notaAdmin}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Nota del admin:</Text>
                  <Text style={{ fontSize: 13, marginTop: 2 }}>{cargue.notas_admin}</Text>
                </View>
              )}
            </Card>

            {cargue.estado === 'pendiente' && (
              <Card padded style={{ margin: spacing.md, backgroundColor: '#fef3c7' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400e' }}>Esperando aprobación del admin</Text>
                <Text style={[typography.caption, { marginTop: 4 }]}>Puedes editar reenviando otro cargue si aún no lo aprueban.</Text>
              </Card>
            )}

            {cargue.estado === 'aprobado' && !modoCerrar && (
              <View style={{ padding: spacing.md }}>
                <Pressable onPress={() => setModoCerrar(true)} style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.8 }]}>
                  <Ionicons name="checkmark-done" size={18} color="white" />
                  <Text style={styles.btnPrimaryText}>Cerrar cargue del día</Text>
                </Pressable>
              </View>
            )}

            {(cargue.estado === 'aprobado' && modoCerrar) || cargue.estado === 'cerrado' ? (
              <FlatList
                data={cargue.items}
                keyExtractor={(l) => String(l.id)}
                contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 200 }}
                renderItem={({ item }) => {
                  const readonly = cargue.estado === 'cerrado';
                  const d = devs[item.id!] || { dev: String(item.cant_devuelta || ''), dan: String(item.cant_danada || '') };
                  const vend = Number(item.cant_cargue || 0) - (Number(d.dev) || 0) - (Number(d.dan) || 0);
                  return (
                    <View style={styles.lineaCerrar}>
                      <Text style={styles.lineaNombre} numberOfLines={2}>{item.nombre_producto}</Text>
                      <View style={{ flexDirection: 'row', marginTop: 4 }}>
                        <Text style={typography.caption}>Cargue: {item.cant_cargue} · Vendido: {vend}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.miniLabel}>Devueltos</Text>
                          <TextInput
                            keyboardType="numeric"
                            value={readonly ? String(item.cant_devuelta) : d.dev}
                            editable={!readonly}
                            onChangeText={(t) => setDevs((prev) => ({ ...prev, [item.id!]: { ...(prev[item.id!] || { dev: '', dan: '' }), dev: t.replace(/[^0-9.]/g, '') } }))}
                            placeholder="0"
                            style={styles.inputMini}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.miniLabel}>Dañados</Text>
                          <TextInput
                            keyboardType="numeric"
                            value={readonly ? String(item.cant_danada) : d.dan}
                            editable={!readonly}
                            onChangeText={(t) => setDevs((prev) => ({ ...prev, [item.id!]: { ...(prev[item.id!] || { dev: '', dan: '' }), dan: t.replace(/[^0-9.]/g, '') } }))}
                            placeholder="0"
                            style={styles.inputMini}
                          />
                        </View>
                      </View>
                    </View>
                  );
                }}
                ListFooterComponent={cargue.estado === 'aprobado' ? (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={typography.label}>Dinero recibido total</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={dinero}
                      onChangeText={(t) => setDinero(t.replace(/[^0-9]/g, ''))}
                      placeholder="Ej: 88000"
                      style={styles.input}
                    />
                    <Text style={typography.label}>Nota (opcional)</Text>
                    <TextInput
                      value={notas}
                      onChangeText={setNotas}
                      placeholder="Ej: falta pan queso, se cayó de la moto"
                      multiline
                      style={styles.notas}
                    />
                  </View>
                ) : null}
              />
            ) : null}

            {cargue.estado === 'aprobado' && modoCerrar && (
              <View style={styles.footer}>
                <Pressable onPress={cerrarCargue} disabled={enviando} style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.8 }]}>
                  <Ionicons name="lock-closed" size={18} color="white" />
                  <Text style={styles.btnPrimaryText}>{enviando ? 'Enviando...' : 'Confirmar cierre'}</Text>
                </Pressable>
              </View>
            )}

            {cargue.estado === 'cerrado' && (
              <Card padded style={{ margin: spacing.md, backgroundColor: '#dbeafe' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e40af' }}>Cargue cerrado</Text>
                <Text style={[typography.caption, { marginTop: 4 }]}>Espera el cuadre del admin.</Text>
              </Card>
            )}

            {cargue.estado === 'rechazado' && (
              <Card padded style={{ margin: spacing.md, backgroundColor: '#fee2e2' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#991b1b' }}>Cargue rechazado</Text>
                <Text style={[typography.caption, { marginTop: 4 }]}>{cargue.notas_admin || 'El admin rechazó tu cargue. Crea uno nuevo.'}</Text>
              </Card>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  linea: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  lineaCerrar: {
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.divider,
  },
  lineaNombre: { ...typography.bodyStrong, fontSize: 14 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 8, minWidth: 80, textAlign: 'right',
    fontSize: 15, backgroundColor: colors.surface,
  },
  inputMini: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 6, textAlign: 'right',
    fontSize: 14, backgroundColor: colors.surface,
  },
  miniLabel: { ...typography.caption, marginBottom: 2 },
  notas: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    padding: 10, minHeight: 60, textAlignVertical: 'top', backgroundColor: colors.surface,
  },
  notaAdmin: {
    marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  footer: {
    padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface,
  },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.md,
  },
  btnPrimaryText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
