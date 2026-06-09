import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

interface Props {
  variant?: 'light' | 'dark';
}

export const DeveloperCredit: React.FC<Props> = ({ variant = 'light' }) => {
  const open = () => Linking.openURL('https://innovacion-digital.com/');

  const color = variant === 'dark' ? colors.textInverse : colors.textMuted;
  const accent = variant === 'dark' ? colors.textInverse : colors.primary;

  return (
    <Pressable
      onPress={open}
      hitSlop={10}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.6 }]}
    >
      <Text style={[styles.prefix, { color }]}>Desarrollado por</Text>
      <View style={styles.linkRow}>
        <Ionicons name="sparkles" size={13} color={accent} />
        <Text style={[styles.link, { color: accent }]}>Innovación Digital</Text>
        <Ionicons name="open-outline" size={12} color={accent} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 3, paddingVertical: spacing.sm },
  prefix: { ...typography.caption, fontSize: 11 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  link: { ...typography.captionStrong, fontSize: 13, fontWeight: '700' },
});
