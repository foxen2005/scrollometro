import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { MascotKey } from '../../modules/scroll-tracker';
import { mascotXml } from '../lib/mascots';
import { EASE_SINE } from '../theme';
import { usePop, useReduceMotion } from './ui';

/**
 * Mascota viva. Cada estado tiene su "idle" (como en la maqueta):
 * 0 rebota · 1 se tambalea · 2 se arrastra cansado · 3 camina a tirones (zombie).
 * Al cambiar de estado hace un "pop" con rebote.
 */
export function Mascot({ k, stage, size, still }: { k: MascotKey; stage: number; size: number; still?: boolean }) {
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  const pop = usePop(`${k}:${stage}`);
  const xml = useMemo(() => mascotXml(k, stage), [k, stage]);

  useEffect(() => {
    t.stopAnimation();
    t.setValue(0);
    if (reduce || still) return;
    const anim =
      stage === 3
        ? Animated.loop(Animated.timing(t, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }))
        : Animated.loop(
            Animated.sequence([
              Animated.timing(t, { toValue: 1, duration: [1600, 1100, 2600][stage], easing: EASE_SINE, useNativeDriver: true }),
              Animated.timing(t, { toValue: 0, duration: [1600, 1100, 2600][stage], easing: EASE_SINE, useNativeDriver: true }),
            ])
          );
    anim.start();
    return () => anim.stop();
  }, [stage, reduce, still, t]);

  const idle = (() => {
    switch (stage) {
      case 0:
        return [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
          { scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) },
        ];
      case 1:
        return [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) }];
      case 2:
        return [
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '2deg'] }) },
          { scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.965] }) },
        ];
      default:
        return [
          { rotate: t.interpolate({ inputRange: [0, 0.2, 0.28, 0.55, 0.62, 1], outputRange: ['0deg', '-4deg', '-2deg', '3deg', '5deg', '0deg'] }) },
          { translateX: t.interpolate({ inputRange: [0, 0.2, 0.28, 0.55, 0.62, 1], outputRange: [0, -2, -1, 2, 3, 0] }) },
        ];
    }
  })();

  const h = size * (222 / 210);
  return (
    <Animated.View style={{ width: size, height: h, transform: [{ scale: pop }], transformOrigin: 'bottom' }}>
      <Animated.View style={{ width: size, height: h, transform: idle, transformOrigin: 'bottom' }}>
        <View pointerEvents="none">
          <SvgXml xml={xml} width={size} height={h} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
