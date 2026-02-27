import * as React from 'react';
import { View, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import type { RadiusKey, ShadowKey, SpaceKey } from '../tokens';

type BoxProps = ViewProps & {
  p?: SpaceKey;
  px?: SpaceKey;
  py?: SpaceKey;
  pt?: SpaceKey;
  pr?: SpaceKey;
  pb?: SpaceKey;
  pl?: SpaceKey;
  m?: SpaceKey;
  mx?: SpaceKey;
  my?: SpaceKey;
  mt?: SpaceKey;
  mr?: SpaceKey;
  mb?: SpaceKey;
  ml?: SpaceKey;
  bg?: keyof ReturnType<typeof useTheme>['colors'];
  borderColor?: keyof ReturnType<typeof useTheme>['colors'];
  borderWidth?: number;
  radius?: RadiusKey;
  shadow?: ShadowKey;
  flex?: number;
  grow?: number;
  shrink?: number;
  basis?: ViewStyle['flexBasis'];
  row?: boolean;
  col?: boolean;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  gap?: SpaceKey;
  wrap?: ViewStyle['flexWrap'];
  style?: StyleProp<ViewStyle>;
};

export function Box({
  p,
  px,
  py,
  pt,
  pr,
  pb,
  pl,
  m,
  mx,
  my,
  mt,
  mr,
  mb,
  ml,
  bg,
  borderColor,
  borderWidth,
  radius,
  shadow,
  flex,
  grow,
  shrink,
  basis,
  row,
  col,
  align,
  justify,
  gap,
  wrap,
  style,
  ...rest
}: BoxProps): React.JSX.Element {
  const t = useTheme();

  const computedStyle: ViewStyle = {
    ...(bg ? { backgroundColor: t.colors[bg] } : null),
    ...(radius ? { borderRadius: t.radius[radius] } : null),
    ...(shadow ? t.shadows[shadow] : null),
    ...(p ? { padding: t.spacing[p] } : null),
    ...(px ? { paddingHorizontal: t.spacing[px] } : null),
    ...(py ? { paddingVertical: t.spacing[py] } : null),
    ...(pt ? { paddingTop: t.spacing[pt] } : null),
    ...(pr ? { paddingRight: t.spacing[pr] } : null),
    ...(pb ? { paddingBottom: t.spacing[pb] } : null),
    ...(pl ? { paddingLeft: t.spacing[pl] } : null),
    ...(m ? { margin: t.spacing[m] } : null),
    ...(mx ? { marginHorizontal: t.spacing[mx] } : null),
    ...(my ? { marginVertical: t.spacing[my] } : null),
    ...(mt ? { marginTop: t.spacing[mt] } : null),
    ...(mr ? { marginRight: t.spacing[mr] } : null),
    ...(mb ? { marginBottom: t.spacing[mb] } : null),
    ...(ml ? { marginLeft: t.spacing[ml] } : null),
    ...(borderColor ? { borderColor: t.colors[borderColor] } : null),
    ...(typeof borderWidth === 'number' ? { borderWidth } : null),
    ...(typeof flex === 'number' ? { flex } : null),
    ...(typeof grow === 'number' ? { flexGrow: grow } : null),
    ...(typeof shrink === 'number' ? { flexShrink: shrink } : null),
    ...(basis ? { flexBasis: basis } : null),
    ...(row ? { flexDirection: 'row' } : null),
    ...(col ? { flexDirection: 'column' } : null),
    ...(align ? { alignItems: align } : null),
    ...(justify ? { justifyContent: justify } : null),
    ...(gap ? { gap: t.spacing[gap] } : null),
    ...(wrap ? { flexWrap: wrap } : null)
  };

  return <View style={[computedStyle, style]} {...rest} />;
}
