import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

export default function ThemedInput(props: any) {
  const bg = useThemeColor({}, 'inputBg');
  const color = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  const placeholder = useThemeColor({}, 'placeholder');

  const styles = StyleSheet.create({
    input:
    {
      backgroundColor: bg,
      color: color,
      borderColor: border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      outlineColor: border,
      outlineWidth: 0,
      fontSize:16
    }

  })
  if (props?.rightIcon) {
    return (
      <React.Fragment>
         {props?.label}
        <View style={{ position: 'relative', marginBottom: 12 }}>
          <TextInput
            {...props}
            placeholderTextColor={placeholder}
            style={[styles.input, props.style, { margin: 0 }]}
          />
          {props?.rightIcon}
        </View>
      </React.Fragment>
    )
  }
  return (
    <React.Fragment>
       {props?.label}
      <TextInput
        {...props}
        placeholderTextColor={placeholder}
        style={[styles.input, {marginBottom: 12}, props.style]}
      />
    </React.Fragment>
  );
}

