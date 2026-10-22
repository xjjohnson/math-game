import { StyleSheet, Text as RNText, type TextProps } from 'react-native';

import { dyslexiaFontFor } from '@/hooks/useAccessibility';
import { useSettings } from '@/store/settings';

/**
 * Drop-in Text that switches to the dyslexia-friendly font when that setting is
 * on. Every screen imports this as `Text`.
 */
export function Text({ style, ...props }: TextProps) {
  const dyslexiaFont = useSettings((s) => s.dyslexiaFont);
  if (!dyslexiaFont) return <RNText style={style} {...props} />;
  const { fontWeight } = StyleSheet.flatten(style) ?? {};
  return (
    <RNText
      style={[style, { fontFamily: dyslexiaFontFor(fontWeight), fontWeight: 'normal' }]}
      {...props}
    />
  );
}
