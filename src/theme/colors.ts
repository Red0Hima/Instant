import type { ThemeMode } from '../types';

export type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryDark: string;
  danger: string;
  chip: string;
  tab: string;
};

export const lightColors: ThemeColors = {
  background: '#f5f3fa',
  surface: '#ffffff',
  text: '#1d1a26',
  muted: '#6f6a80',
  border: '#ddd6ee',
  primary: '#7a5ea8',
  primaryDark: '#5a3f85',
  danger: '#c0392b',
  chip: '#ebe6f7',
  tab: '#f8f5ff',
};

export const darkColors: ThemeColors = {
  background: '#100f16',
  surface: '#1a1724',
  text: '#f2effa',
  muted: '#a9a0be',
  border: '#302b3f',
  primary: '#9f86c9',
  primaryDark: '#c7b8e6',
  danger: '#ff6b6b',
  chip: '#241f31',
  tab: '#15121f',
};

export function getThemeColors(theme: ThemeMode): ThemeColors {
  return theme === 'dark' ? darkColors : lightColors;
}
