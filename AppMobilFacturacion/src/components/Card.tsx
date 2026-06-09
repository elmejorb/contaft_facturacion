import React from 'react';
import { Pressable, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '../theme';

interface Props extends ViewProps {
  onPress?: () => void;
  padded?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
}

export const Card: React.FC<Props> = ({ onPress, padded = true, style, children, ...rest }) => {
  const content = (
    <View style={[styles.card, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: colors.primarySoft }}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.9, transform: [{ scale: 0.997 }] },
});
