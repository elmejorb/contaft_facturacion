import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
}

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: HeaderAction[];
}

export const Header: React.FC<Props> = ({ title, subtitle, onBack, actions }) => {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onBack && (
          <Pressable hitSlop={10} onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {actions && (
        <View style={styles.actions}>
          {actions.map((a, i) => (
            <Pressable key={i} hitSlop={10} onPress={a.onPress} style={styles.actionBtn}>
              <Ionicons name={a.icon} size={22} color={colors.text} />
              {a.badge != null && a.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{a.badge > 9 ? '9+' : a.badge}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: { padding: 4, marginRight: 4, marginLeft: -4 },
  title: { ...typography.h2 },
  subtitle: { ...typography.caption, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.textInverse, fontSize: 10, fontWeight: '700' },
});
