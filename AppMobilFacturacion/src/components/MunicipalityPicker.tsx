import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { MunicipioDTO } from '../services/api';
import { municipiosRepo } from '../db/municipiosRepo';
import { SearchBar } from './SearchBar';
import { Screen } from './Screen';
import { Header } from './Header';

interface Props {
  value: { id: number; label: string } | null;
  onChange: (v: { id: number; label: string; name: string; department_name: string } | null) => void;
  label?: string;
}

export const MunicipalityPicker: React.FC<Props> = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {label && <Text style={styles.fieldLabel}>{label}</Text>}

      {value ? (
        <View style={styles.selectedWrap}>
          <View style={styles.selectedIcon}>
            <Ionicons name="location" size={18} color={colors.primary} />
          </View>
          <Text style={styles.selectedLabel} numberOfLines={2}>
            {value.label}
          </Text>
          <Pressable onPress={() => setOpen(true)} hitSlop={8} style={styles.changeBtn}>
            <Text style={styles.changeText}>Cambiar</Text>
          </Pressable>
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={8}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.pickBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={styles.pickText}>Seleccionar municipio</Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>
      )}

      <Picker
        visible={open}
        onClose={() => setOpen(false)}
        onSelect={(m) => {
          onChange({
            id: m.id,
            label: m.label,
            name: m.name,
            department_name: m.departamento_nombre,
          });
          setOpen(false);
        }}
      />
    </>
  );
};

const Picker: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelect: (m: MunicipioDTO) => void;
}> = ({ visible, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MunicipioDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCache, setTotalCache] = useState(0);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setTotalCache(await municipiosRepo.count());
    })();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const rs = await municipiosRepo.search(query, 80);
        if (!cancelled) setResults(rs);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <Header
          title="Seleccionar municipio"
          subtitle={totalCache > 0 ? `${totalCache} en catálogo` : undefined}
          onBack={onClose}
        />

        <View style={styles.searchRow}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar municipio o departamento..."
            autoFocus
          />
        </View>

        {totalCache === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cloud-download-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Catálogo no descargado</Text>
            <Text style={styles.emptyText}>
              Conéctate a internet y vuelve a abrir la app para descargar municipios.
            </Text>
          </View>
        ) : loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item)}
                android_ripple={{ color: colors.primarySoft }}
                style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.itemIcon}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={typography.caption}>
                    {item.departamento_nombre} · {item.code}
                  </Text>
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={typography.caption}>Sin resultados</Text>
              </View>
            }
          />
        )}
      </Screen>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fieldLabel: {
    ...typography.captionStrong,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 52,
  },
  pickText: { ...typography.body, color: colors.textMuted, flex: 1 },

  selectedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  selectedIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLabel: { ...typography.bodyStrong, color: colors.primary, flex: 1, fontSize: 14 },
  changeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: radius.pill,
  },
  changeText: { ...typography.caption, color: colors.primary, fontWeight: '700', fontSize: 11 },
  clearBtn: { padding: 2 },

  searchRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.h3, marginTop: spacing.md },
  emptyText: { ...typography.caption, textAlign: 'center' },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { ...typography.bodyStrong, fontSize: 15 },
  separator: { height: 1, backgroundColor: colors.divider },
});
