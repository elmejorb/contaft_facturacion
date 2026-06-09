import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { SyncStatus } from '../types';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface Props {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  dot?: boolean;
  style?: ViewStyle;
}

const toneMap: Record<Tone, { bg: string; fg: string; dot: string }> = {
  success: { bg: colors.successLight, fg: colors.successDark, dot: colors.success },
  warning: { bg: colors.warningLight, fg: colors.warningDark, dot: colors.warning },
  danger: { bg: colors.dangerLight, fg: colors.dangerDark, dot: colors.danger },
  info: { bg: colors.infoLight, fg: colors.primaryDark, dot: colors.info },
  neutral: { bg: colors.surfaceAlt, fg: colors.textSecondary, dot: colors.textMuted },
};

export const Badge: React.FC<Props> = ({ label, tone = 'neutral', icon, dot, style }) => {
  const t = toneMap[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: t.dot }]} />}
      {icon && <Ionicons name={icon} size={13} color={t.fg} style={{ marginRight: 4 }} />}
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
};

export const statusToTone = (status: SyncStatus): Tone => {
  switch (status) {
    case 'sent':
      return 'success';
    case 'pending':
      return 'warning';
    case 'error':
      return 'danger';
    case 'draft':
      return 'neutral';
  }
};

export const statusLabel = (status: SyncStatus): string => {
  switch (status) {
    case 'sent':
      return 'Enviado';
    case 'pending':
      return 'Pendiente';
    case 'error':
      return 'Error';
    case 'draft':
      return 'Borrador';
  }
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  label: { ...typography.caption, fontWeight: '600', fontSize: 12 },
});
