import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<Props> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}) => {
  const containerStyle = [
    styles.base,
    styles[`size_${size}`],
    styles[`variant_${variant}`],
    fullWidth ? styles.fullWidth : null,
    disabled || loading ? styles.disabled : null,
    style,
  ];

  const textStyle: TextStyle[] = [
    styles.textBase,
    styles[`text_${size}`],
    styles[`textVariant_${variant}`],
  ];

  const iconColor =
    variant === 'secondary' || variant === 'ghost' ? colors.primary : colors.textInverse;

  const iconSize = size === 'lg' ? 22 : size === 'sm' ? 16 : 20;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
      style={({ pressed }) => [...containerStyle, pressed && !disabled && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.iconLeft} />}
          <Text style={textStyle}>{label}</Text>
          {iconRight && (
            <Ionicons name={iconRight} size={iconSize} color={iconColor} style={styles.iconRight} />
          )}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconLeft: { marginRight: spacing.sm },
  iconRight: { marginLeft: spacing.sm },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },

  size_sm: { paddingVertical: 10, paddingHorizontal: spacing.lg, minHeight: 40 },
  size_md: { paddingVertical: 14, paddingHorizontal: spacing.xl, minHeight: 50 },
  size_lg: { paddingVertical: 17, paddingHorizontal: spacing.xxl, minHeight: 58 },

  variant_primary: { backgroundColor: colors.primary },
  variant_secondary: {
    backgroundColor: colors.primaryLight,
  },
  variant_ghost: { backgroundColor: 'transparent' },
  variant_danger: { backgroundColor: colors.danger },
  variant_success: { backgroundColor: colors.success },

  textBase: { ...typography.bodyStrong, textAlign: 'center' },
  text_sm: { fontSize: 14 },
  text_md: { fontSize: 15 },
  text_lg: { fontSize: 17 },

  textVariant_primary: { color: colors.textInverse },
  textVariant_secondary: { color: colors.primary },
  textVariant_ghost: { color: colors.primary },
  textVariant_danger: { color: colors.textInverse },
  textVariant_success: { color: colors.textInverse },
});
