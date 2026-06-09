import React, { useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, radius, spacing, typography } from '../theme';

export interface GpsValue {
  latitud: number;
  longitud: number;
  precision_gps_metros: number;
}

interface Props {
  value: GpsValue | null;
  onChange: (v: GpsValue | null) => void;
  capturedAt?: string | null;
}

const openInMaps = (lat: number, lng: number) => {
  const url = Platform.select({
    ios: `maps://?q=${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}`,
    default: `https://www.google.com/maps?q=${lat},${lng}`,
  });
  Linking.openURL(url!).catch(() =>
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`),
  );
};

export const GpsCapture: React.FC<Props> = ({ value, onChange, capturedAt }) => {
  const [loading, setLoading] = useState(false);

  const capture = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Activa el permiso de ubicación en los ajustes del sistema para capturar GPS.',
        );
        return;
      }

      const services = await Location.hasServicesEnabledAsync();
      if (!services) {
        Alert.alert('GPS apagado', 'Enciende el GPS del dispositivo y vuelve a intentar.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      onChange({
        latitud: pos.coords.latitude,
        longitud: pos.coords.longitude,
        precision_gps_metros: pos.coords.accuracy ?? 0,
      });
    } catch (e) {
      Alert.alert('No se pudo obtener ubicación', String(e));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => onChange(null);

  if (value) {
    return (
      <View style={styles.capturedWrap}>
        <View style={styles.row}>
          <View style={styles.iconOk}>
            <Ionicons name="location" size={18} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.coords}>
              {value.latitud.toFixed(6)}, {value.longitud.toFixed(6)}
            </Text>
            <Text style={typography.caption}>
              Precisión ±{Math.round(value.precision_gps_metros)} m
              {capturedAt ? ` · ${new Date(capturedAt).toLocaleDateString('es-CO')}` : ''}
            </Text>
          </View>
        </View>
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => openInMaps(value.latitud, value.longitud)}
            style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="map-outline" size={15} color={colors.primary} />
            <Text style={styles.smallBtnText}>Ver en Maps</Text>
          </Pressable>
          <Pressable
            onPress={capture}
            style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.8 }]}
            disabled={loading}
          >
            <Ionicons name="refresh-outline" size={15} color={colors.primary} />
            <Text style={styles.smallBtnText}>{loading ? 'Capturando...' : 'Re-capturar'}</Text>
          </Pressable>
          <Pressable
            onPress={clear}
            style={({ pressed }) => [styles.smallBtnDanger, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
            <Text style={[styles.smallBtnText, { color: colors.danger }]}>Quitar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={capture}
      disabled={loading}
      style={({ pressed }) => [styles.captureBtn, pressed && { opacity: 0.85 }]}
    >
      <Ionicons
        name={loading ? 'sync-outline' : 'location-outline'}
        size={22}
        color={colors.primary}
      />
      <Text style={styles.captureText}>
        {loading ? 'Obteniendo ubicación...' : 'Capturar ubicación GPS'}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  captureText: { ...typography.bodyStrong, color: colors.primary },

  capturedWrap: {
    backgroundColor: colors.successLight,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconOk: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coords: { ...typography.bodyStrong, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 },

  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.pill,
  },
  smallBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.pill,
  },
  smallBtnText: { ...typography.caption, color: colors.primary, fontWeight: '600', fontSize: 12 },
});
