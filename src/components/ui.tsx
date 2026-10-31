import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { BORDER, C, EASE_OUT, F, RADIUS } from '../theme';

// ---------- Reducir movimiento (ajuste del sistema) ----------
const ReduceMotionCtx = createContext(false);
export const useReduceMotion = () => useContext(ReduceMotionCtx);
export function ReduceMotionProvider({ children }: { children: ReactNode }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return <ReduceMotionCtx.Provider value={reduce}>{children}</ReduceMotionCtx.Provider>;
}

// ---------- Texto con Baloo 2 ----------
type Weight = keyof typeof F;
export function Txt({ w = 'semibold', style, ...rest }: TextProps & { w?: Weight; style?: StyleProp<TextStyle> }) {
  return <Text {...rest} style={[{ fontFamily: F[w], color: C.ink, fontSize: 15 }, style]} />;
}

// ---------- Tarjeta con borde y sombra dura ----------
export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <View style={styles.shadowWrap}>
      <View style={styles.shadow} />
      <View style={[styles.card, style]}>{children}</View>
    </View>
  );
}

// ---------- Botón que se hunde al presionar (feedback, 160 ms ease-out) ----------
export function PressScale({
  onPress,
  children,
  style,
  disabled,
}: {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.timing(scale, { toValue: v, duration: 160, easing: EASE_OUT, useNativeDriver: true }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.95)} onPressOut={() => to(1)} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Btn({ label, onPress, kind = 'sky' }: { label: string; onPress: () => void; kind?: 'sky' | 'lime' | 'ghost' }) {
  return (
    <PressScale onPress={onPress} style={[styles.btn, kind === 'lime' && { backgroundColor: C.lime }, kind === 'ghost' && { backgroundColor: '#fff' }]}>
      <Txt w="black" style={{ fontSize: 14 }}>{label}</Txt>
    </PressScale>
  );
}

export function Chip({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.chip, style]}>
      <Txt w="bold" style={{ fontSize: 12, lineHeight: 18 }}>{children}</Txt>
    </View>
  );
}

// ---------- Interruptor (la perilla se desliza 200 ms ease-out) ----------
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 200, easing: EASE_OUT, useNativeDriver: true }).start();
  }, [value, x]);
  return (
    <PressScale onPress={() => onChange(!value)} style={[styles.toggle, { backgroundColor: value ? C.lime : C.dash }]}>
      <Animated.View style={[styles.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />
    </PressScale>
  );
}

// ---------- Entrada en cascada al abrir (320 ms, 50 ms entre tarjetas) ----------
export function FadeInUp({ index = 0, children }: { index?: number; children: ReactNode }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.timing(v, { toValue: 1, duration: 320, delay: 60 + index * 50, easing: EASE_OUT, useNativeDriver: true }).start();
  }, [index, reduce, v]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

/** "Pop" con rebote cuando cambia `trigger` (no en el primer render). */
export function usePop(trigger: unknown, from = 0.92) {
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduce) return;
    scale.setValue(from);
    Animated.spring(scale, { toValue: 1, speed: 14, bounciness: 12, useNativeDriver: true }).start();
  }, [trigger, from, reduce, scale]);
  return scale;
}

const styles = StyleSheet.create({
  shadowWrap: { position: 'relative', marginRight: 4, marginBottom: 4 },
  shadow: { position: 'absolute', top: 4, left: 4, right: -4, bottom: -4, backgroundColor: C.ink, borderRadius: RADIUS },
  card: { backgroundColor: C.card, borderWidth: BORDER, borderColor: C.ink, borderRadius: RADIUS, padding: 14 },
  btn: {
    backgroundColor: C.sky, borderWidth: BORDER, borderColor: C.ink, borderRadius: 12,
    paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start',
  },
  chip: {
    alignSelf: 'flex-start', borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 9, backgroundColor: '#fff',
  },
  toggle: { width: 46, height: 26, borderRadius: 999, borderWidth: BORDER, borderColor: C.ink, justifyContent: 'center', paddingHorizontal: 1 },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', borderWidth: 2, borderColor: C.ink },
});
