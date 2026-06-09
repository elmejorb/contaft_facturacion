import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography: Record<string, TextStyle> = {
  displayLg: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  display: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  bodyLg: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  captionStrong: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
};
