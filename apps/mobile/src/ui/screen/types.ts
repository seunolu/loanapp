import type { KeyboardAvoidingViewProps, ScrollViewProps, StyleProp, ViewStyle } from 'react-native';

export type ScreenPreset = 'fixed' | 'scroll' | 'auto';
export type ScreenPadding = 'none' | 'sm' | 'md' | 'lg';

export type ScreenProps = {
  children: React.ReactNode;
  preset?: ScreenPreset;
  scroll?: boolean;
  safeTop?: boolean;
  safeBottom?: boolean;
  backgroundColor?: string;
  padding?: ScreenPadding;
  keyboardBehavior?: KeyboardAvoidingViewProps['behavior'];
  keyboardVerticalOffset?: number;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: ScrollViewProps['showsVerticalScrollIndicator'];
};

export type ScreenContentProps = {
  children: React.ReactNode;
  preset: ScreenPreset;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: ScrollViewProps['showsVerticalScrollIndicator'];
  onLayoutHeightChange?: (height: number) => void;
  onContentHeightChange?: (height: number) => void;
};

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  showBack?: boolean;
  onBackPress?: () => void;
  variant?: 'default' | 'transparent';
  divider?: boolean;
  safeTop?: boolean;
};
