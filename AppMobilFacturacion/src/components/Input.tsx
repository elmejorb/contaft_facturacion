import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<Props> = ({
  label,
  error,
  hint,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  const showToggle = secureTextEntry !== undefined;
  const effectiveRightIcon = showToggle
    ? hidden
      ? 'eye-outline'
      : 'eye-off-outline'
    : rightIcon;

  return (
    <View style={[containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocused,
          !!error && styles.inputWrapError,
        ]}
      >
        {icon && <Ionicons name={icon} size={20} color={colors.textMuted} style={styles.iconLeft} />}
        <TextInput
          {...rest}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {effectiveRightIcon && (
          <Pressable
            hitSlop={10}
            onPress={showToggle ? () => setHidden(!hidden) : onRightIconPress}
          >
            <Ionicons
              name={effectiveRightIcon}
              size={20}
              color={colors.textMuted}
              style={styles.iconRight}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { ...typography.captionStrong, marginBottom: spacing.xs, color: colors.textSecondary },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  inputWrapFocused: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  inputWrapError: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  iconLeft: { marginRight: spacing.sm },
  iconRight: { marginLeft: spacing.sm },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  hintText: { ...typography.caption, marginTop: spacing.xs },
});
