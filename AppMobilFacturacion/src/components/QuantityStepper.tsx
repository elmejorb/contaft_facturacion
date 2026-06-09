import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}

export const QuantityStepper: React.FC<Props> = ({
  value,
  onChange,
  min = 0,
  max = 9999,
  size = 'md',
}) => {
  const btnSize = size === 'sm' ? 34 : 44;
  const iconSize = size === 'sm' ? 18 : 22;
  const fontSize = size === 'sm' ? 15 : 18;

  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={dec}
        disabled={value <= min}
        style={[
          styles.btn,
          { width: btnSize, height: btnSize },
          value <= min && styles.btnDisabled,
        ]}
        android_ripple={{ color: colors.primarySoft, borderless: true }}
      >
        <Ionicons
          name="remove"
          size={iconSize}
          color={value <= min ? colors.textMuted : colors.primary}
        />
      </Pressable>
      <Text style={[styles.value, { fontSize, minWidth: size === 'sm' ? 32 : 44 }]}>{value}</Text>
      <Pressable
        onPress={inc}
        disabled={value >= max}
        style={[
          styles.btn,
          { width: btnSize, height: btnSize },
          value >= max && styles.btnDisabled,
        ]}
        android_ripple={{ color: colors.primarySoft, borderless: true }}
      >
        <Ionicons
          name="add"
          size={iconSize}
          color={value >= max ? colors.textMuted : colors.primary}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
  },
  btnDisabled: { backgroundColor: 'transparent' },
  value: { ...typography.bodyStrong, textAlign: 'center' },
});
