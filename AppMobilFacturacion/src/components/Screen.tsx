import React from 'react';
import { StyleSheet, View, ViewStyle, StatusBar, Platform } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: Edge[];
  backgroundColor?: string;
  barStyle?: 'light-content' | 'dark-content';
}

export const Screen: React.FC<Props> = ({
  children,
  style,
  edges = ['top', 'bottom', 'left', 'right'],
  backgroundColor = colors.background,
  barStyle = 'dark-content',
}) => {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor }]} edges={edges}>
      {Platform.OS === 'android' && (
        <StatusBar backgroundColor={backgroundColor} barStyle={barStyle} />
      )}
      <View style={[styles.inner, style]}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1 },
});
