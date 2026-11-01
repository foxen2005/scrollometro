import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Card, Chip, FadeInUp, Txt, useReduceMotion } from '../components/ui';
import { MEDALS, fmtDist } from '../lib/content';
import { BORDER, C, RADIUS } from '../theme';

export function Logros({ histCm }: { histCm: number }) {
  const hist = histCm / 100;
  const unlocked = MEDALS.filter(([, , need]) => hist >= need).length;
  const next = MEDALS[unlocked]; // el próximo logro por desbloquear (undefined si ya llegaste a la Luna)
  const prevNeed = unlocked > 0 ? MEDALS[unlocked - 1][2] : 0;

  // Logros que se desbloquean mientras la app está abierta → animación de celebración
  const seen = useRef<number | null>(null);
  const fresh = seen.current === null ? -1 : seen.current;
  useEffect(() => {
    seen.current = unlocked;
  }, [unlocked]);

  return (
    <>
      <FadeInUp index={0}>
        <Txt w="black" style={{ fontSize: 26, lineHeight: 30 }}>Logros</Txt>
      </FadeInUp>

      {/* Total acumulado de toda la vida: no se reinicia a medianoche como el de "Hoy" */}
      <FadeInUp index={1}>
        <Card style={{ backgroundColor: C.grape }}>
          <Txt w="bold" style={{ fontSize: 14, color: '#fff' }}>En total, tu pulgar ha recorrido</Txt>
          <Txt w="black" style={styles.total}>{fmtDist(hist)}</Txt>
          <View style={styles.totalRow}>
            <Chip>🏆 {unlocked}/{MEDALS.length} logros</Chip>
          </View>
          {next && (
            <View style={styles.next}>
              <Txt w="bold" style={{ fontSize: 14, lineHeight: 19 }}>
                Próximo: {next[0]} {next[1]} · te faltan {fmtDist(next[2] - hist)}
              </Txt>
              <View style={styles.nextBar}>
                <View style={{ width: `${Math.max(2, ((hist - prevNeed) / (next[2] - prevNeed)) * 100)}%`, height: '100%', backgroundColor: C.lime }} />
              </View>
            </View>
          )}
        </Card>
      </FadeInUp>
      <View style={styles.grid}>
        {MEDALS.map(([em, title, need], i) => (
          <Medal key={title} em={em} title={title} need={need} hist={hist} celebrate={fresh >= 0 && i >= fresh && i < unlocked} index={i} />
        ))}
      </View>
    </>
  );
}

function Medal({ em, title, need, hist, celebrate, index }: { em: string; title: string; need: number; hist: number; celebrate: boolean; index: number }) {
  const reduce = useReduceMotion();
  const on = hist >= need;
  const pop = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(1)).current; // 1 = reposo; la celebración parte en 0

  // Momento raro: rebote de la tarjeta + la medalla da una vuelta
  useEffect(() => {
    if (!celebrate || reduce) return;
    pop.setValue(0.85);
    spin.setValue(0);
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, speed: 10, bounciness: 14, useNativeDriver: true }),
      Animated.spring(spin, { toValue: 1, speed: 8, bounciness: 10, useNativeDriver: true }),
    ]).start();
  }, [celebrate, reduce, pop, spin]);

  const card = (
    <Animated.View style={[styles.medal, !on && styles.off, { transform: [{ scale: pop }] }]}>
      <Animated.View
        style={{
          transform: [
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['-20deg', '0deg'] }) },
            { scale: spin.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          ],
        }}
      >
        <Txt style={{ fontSize: 34, lineHeight: 42, opacity: on ? 1 : 0.35 }}>{on ? em : '🔒'}</Txt>
      </Animated.View>
      <Txt w="bold" style={{ fontSize: 14, lineHeight: 18, textAlign: 'center' }}>{title}</Txt>
      <Txt w="semibold" style={{ fontSize: 12, color: C.muted }}>{fmtDist(need)}</Txt>
      {!on && (
        <View style={styles.meter}>
          <View style={{ width: `${Math.min(100, (hist / need) * 100)}%`, height: '100%', backgroundColor: C.grape }} />
        </View>
      )}
    </Animated.View>
  );

  return (
    <View style={styles.cell}>
      {/* Solo los primeros entran en cascada; el resto ya está fuera de pantalla */}
      {index < 8 ? <FadeInUp index={index + 2}>{card}</FadeInUp> : card}
    </View>
  );
}

const styles = StyleSheet.create({
  total: {
    fontSize: 52, lineHeight: 60, color: '#fff', letterSpacing: -1,
    textShadowColor: C.ink, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 1,
  },
  totalRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  next: { marginTop: 10, backgroundColor: '#fff', borderWidth: BORDER, borderColor: C.ink, borderRadius: 14, padding: 10, gap: 6 },
  nextBar: { height: 10, borderWidth: 2, borderColor: C.ink, borderRadius: 999, overflow: 'hidden', backgroundColor: C.track },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { width: '50%', padding: 6 },
  medal: {
    backgroundColor: '#fff', borderWidth: BORDER, borderColor: C.ink, borderRadius: RADIUS,
    paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 2, minHeight: 132,
    boxShadow: `4px 4px 0 ${C.ink}`,
  },
  off: { backgroundColor: '#f3eff6', borderStyle: 'dashed', boxShadow: 'none' },
  meter: { width: '100%', height: 10, marginTop: 4, borderWidth: 2, borderColor: C.ink, borderRadius: 999, overflow: 'hidden', backgroundColor: C.track },
});
