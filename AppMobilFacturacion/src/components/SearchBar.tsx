import React from 'react';
import { Pressable, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<Props> = ({
  value,
  onChangeText,
  placeholder = 'Buscar...',
  style,
  autoFocus,
}) => {
  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name="search" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable hitSlop={10} onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 48,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
});
