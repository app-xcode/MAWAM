import { StyleSheet, Text, type TextProps, Dimensions } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'unlink' | 'caption';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'unlink' ? styles.unlink : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'caption' ? styles.caption : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const phi = 1.618;
const defaultFont = 9;

const styles = StyleSheet.create({
  default: {
    fontSize: defaultFont * phi,
  },
  defaultSemiBold: {
    fontSize: defaultFont * phi,
    fontWeight: '600',
  },
  title: {
    fontSize: defaultFont * phi * phi,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: defaultFont * phi,
    fontWeight: 'bold',
  },
  link: {
    fontSize: defaultFont * phi,
    color: '#0a7ea4',
  },
  unlink: {
    fontSize: defaultFont * phi,
    color: '#a40a8aff',
  },
  caption:{
    fontSize:defaultFont
  }
});
