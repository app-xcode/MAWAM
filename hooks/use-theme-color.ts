import { Colors } from '@/constants/theme';
import { useTheme } from 'expo-router';
// import { useTheme } from '@react-navigation/native';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useTheme();

  const colorFromProps = theme.dark
    ? props.dark
    : props.light;

  if (colorFromProps) {
    return colorFromProps;
  } else {
    const colors = Colors[theme.dark ? 'dark' : 'light'];
    return colors[colorName];
  }
}