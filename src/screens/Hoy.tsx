import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg';
import type { Stats } from '../../modules/scroll-tracker';
import { Card, Chip, FadeInUp, PressScale, Txt, usePop, useReduceMotion } from '../components/ui';
import { Mascot } from '../components/Mascot';
import { DOPA, appColors, dopaLevel, equivalences, fmtDist, stageOf } from '../lib/content';
import { MASCOTS } from '../lib/mascots';
import { BORDER, C, EASE_OUT, EASE_SINE, STAGE_BG } from '../theme';

const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const today = () => {
  const d = new Date();
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export function Hoy({ stats, onShare, onSettings }: { stats: Stats; onShare: () => void; onSettings: () => void }) {
  const m = stats.totalCm / 100;
  const s = stageOf(m);
  const mk = MASCOTS[stats.mascot];

  return (
    <>
      <FadeInUp index={0}>
        <View style={styles.topbar}>
          <View style={{ gap: 2 }}>
            <Txt w="black" style={{ fontSize: 26, lineHeight: 30 }}>Hoy</Txt>
            <Chip>{today()}</Chip>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PressScale onPress={onShare} style={styles.iconbtn}><Txt style={{ fontSize: 18 }}>📤</Txt></PressScale>
            <PressScale onPress={onSettings} style={styles.iconbtn}><Txt style={{ fontSize: 18 }}>⚙️</Txt></PressScale>
          </View>
        </View>
      </FadeInUp>

      <FadeInUp index={1}>
        <Hero stage={s} mascot={stats.mascot} line={mk.lines[s]} stageName={mk.stages[s]} />
      </FadeInUp>

      <FadeInUp index={2}>
        <Card>
          <Txt w="bold" style={{ color: C.muted, fontSize: 14 }}>Hoy scrolleaste</Txt>
          <CountUp m={m} />
          <EqRotator m={m} />
        </Card>
      </FadeInUp>

      <FadeInUp index={3}>
        <GoalCard m={m} goal={stats.goalM} />
      </FadeInUp>

      <FadeInUp index={4}>
        <DopaCard value={stats.dopamine} />
      </FadeInUp>

      <FadeInUp index={5}>
        <AppsCard stats={stats} />
      </FadeInUp>
    </>
  );
}

// ---------- Mascota + globo ----------
function Hero({ stage, mascot, line, stageName }: { stage: number; mascot: Stats['mascot']; line: string; stageName: string }) {
  const bubblePop = usePop(line, 0.9);
  const chipPop = usePop(stageName, 0.9);
  return (
    <Card style={[styles.hero, { backgroundColor: STAGE_BG[stage] }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        <Mascot k={mascot} stage={stage} size={150} />
        {/* El globo nace desde su colita (hacia la mascota) */}
        <Animated.View style={[styles.bubble, { transform: [{ scale: bubblePop }], transformOrigin: 'left bottom' }]}>
          <View style={styles.bubbleTail} />
          <Txt w="bold" style={{ fontSize: 14, lineHeight: 19 }}>{line}</Txt>
        </Animated.View>
      </View>
      <Animated.View style={[styles.stage, { transform: [{ scale: chipPop }], transformOrigin: 'right' }]}>
        <Txt w="bold" style={{ color: '#fff', fontSize: 12, lineHeight: 18 }}>{stageName}</Txt>
      </Animated.View>
    </Card>
  );
}

// ---------- Total con conteo al abrir ----------
// A nivel de módulo: la pantalla se vuelve a montar al cambiar de pestaña, pero el conteo es una vez por sesión
let countedThisSession = false;

function CountUp({ m }: { m: number }) {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(reduce || countedThisSession ? m : 0);
  useEffect(() => {
    // Solo la primera vez cuenta desde 0; después el valor sube en vivo sin animación (es un dato que se lee)
    if (reduce || countedThisSession) { setShown(m); return; }
    countedThisSession = true;
    const t0 = Date.now(), dur = 900;
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - t0) / dur);
      setShown(m * (1 - Math.pow(1 - t, 5)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m]);
  return <Txt w="black" style={{ fontSize: 58, lineHeight: 64, letterSpacing: -1 }}>{fmtDist(shown)}</Txt>;
}

// ---------- Equivalencia que rota: sale hacia arriba, entra desde abajo ----------
function EqRotator({ m }: { m: number }) {
  const reduce = useReduceMotion();
  const [idx, setIdx] = useState(0);
  const v = useRef(new Animated.Value(1)).current; // 1 visible, 0 oculta
  const dir = useRef(new Animated.Value(0)).current; // -6 arriba, +6 abajo
  useEffect(() => {
    const id = setInterval(() => {
      if (reduce) { setIdx((i) => i + 1); return; }
      Animated.parallel([
        Animated.timing(v, { toValue: 0, duration: 200, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(dir, { toValue: -6, duration: 200, easing: EASE_OUT, useNativeDriver: true }),
      ]).start(() => {
        setIdx((i) => i + 1);
        dir.setValue(6);
        Animated.parallel([
          Animated.timing(v, { toValue: 1, duration: 200, easing: EASE_OUT, useNativeDriver: true }),
          Animated.timing(dir, { toValue: 0, duration: 200, easing: EASE_OUT, useNativeDriver: true }),
        ]).start();
      });
    }, 3500);
    return () => clearInterval(id);
  }, [reduce, v, dir]);
  const list = equivalences(m);
  return (
    <View style={styles.eq}>
      <Animated.View style={{ opacity: v, transform: [{ translateY: dir }] }}>
        <Txt w="bold" style={{ fontSize: 15, lineHeight: 21 }}>{list[idx % list.length]}</Txt>
      </Animated.View>
    </View>
  );
}

// ---------- Meta diaria (franjas que avanzan al pasarse) ----------
function GoalCard({ m, goal }: { m: number; goal: number }) {
  const reduce = useReduceMotion();
  const over = m > goal;
  const pct = Math.min(100, (m / goal) * 100);
  const shift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!over || reduce) return;
    const a = Animated.loop(Animated.timing(shift, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [over, reduce, shift]);
  return (
    <Card>
      <View style={styles.lbl}>
        <Txt w="bold" style={{ fontSize: 13 }}>Meta diaria: {fmtDist(goal)}</Txt>
        <Txt w="bold" style={{ fontSize: 13, color: C.muted }}>
          {over ? `te pasaste por ${fmtDist(m - goal)} 🙈` : `te quedan ${fmtDist(goal - m)}`}
        </Txt>
      </View>
      <View style={styles.meter}>
        <View style={[styles.goalFill, { width: `${pct}%`, backgroundColor: over ? C.tomato : C.lime }]}>
          {over && (
            <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: -29, width: 600, transform: [{ translateX: shift.interpolate({ inputRange: [0, 1], outputRange: [0, 28.28] }) }] }}>
              <Svg width={600} height={20}>
                <Defs>
                  <Pattern id="stripes" width={28.28} height={20} patternUnits="userSpaceOnUse">
                    <Rect width={28.28} height={20} fill={C.tomato} />
                    <Rect x={0} y={-10} width={10} height={40} fill="#ff8e7d" transform="rotate(45 5 10)" />
                    <Rect x={14.14} y={-10} width={10} height={40} fill="#ff8e7d" transform="rotate(45 19.14 10)" />
                  </Pattern>
                </Defs>
                <Rect width={600} height={20} fill="url(#stripes)" />
              </Svg>
            </Animated.View>
          )}
        </View>
      </View>
    </Card>
  );
}

// ---------- Barra de dopamina ----------
function DopaCard({ value }: { value: number }) {
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const level = dopaLevel(value);
  const [, face, label] = DOPA[level];
  const pos = useRef(new Animated.Value(0)).current;
  const loop = useRef(new Animated.Value(0)).current;
  const labelPop = usePop(label, 0.9);

  useEffect(() => {
    Animated.timing(pos, { toValue: value, duration: reduce ? 0 : 350, easing: EASE_OUT, useNativeDriver: true }).start();
  }, [value, reduce, pos]);

  // La carita se mueve según el nivel: respira, se menea, gira, chisporrotea
  useEffect(() => {
    loop.setValue(0);
    if (reduce || level === 0) return;
    const one = (dur: number, easing = EASE_SINE) => Animated.timing(loop, { toValue: 1, duration: dur, easing, useNativeDriver: true });
    const back = (dur: number) => Animated.timing(loop, { toValue: 0, duration: dur, easing: EASE_SINE, useNativeDriver: true });
    const a =
      level === 3 ? Animated.loop(one(1400, Easing.linear))
      : level === 4 ? Animated.loop(one(180, Easing.linear))
      : Animated.loop(Animated.sequence([one(level === 1 ? 1200 : 450), back(level === 1 ? 1200 : 450)]));
    a.start();
    return () => a.stop();
  }, [level, reduce, loop]);

  const faceMove =
    level === 1 ? [{ translateY: loop.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }]
    : level === 2 ? [{ rotate: loop.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '10deg'] }) }]
    : level === 3 ? [{ rotate: loop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }]
    : level === 4 ? [{ translateX: loop.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -1.5, 1, 1.5, 0] }) },
                     { translateY: loop.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 1, -1.5, 1, 0] }) }]
    : [];

  return (
    <Card>
      <View style={styles.lbl}>
        <Txt w="bold" style={{ fontSize: 13 }}>Barra de dopamina</Txt>
        <Txt w="bold" style={{ fontSize: 13, color: C.muted }}>últimos 10 min</Txt>
      </View>
      <View>
      <View style={[styles.meter, { height: 22 }]} onLayout={(e) => setW(e.nativeEvent.layout.width - BORDER * 2)}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="dopa" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={C.lime} />
              <Stop offset="0.5" stopColor={C.sun} />
              <Stop offset="1" stopColor={C.tomato} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#dopa)" />
        </Svg>
        {/* La tapa gris se corre hacia la derecha y destapa el degradado */}
        <Animated.View
          style={[styles.cover, { width: w, transform: [{ translateX: pos.interpolate({ inputRange: [0, 100], outputRange: [0, w] }) }] }]}
        />
      </View>
      {w > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.face, { transform: [{ translateX: pos.interpolate({ inputRange: [0, 8, 92, 100], outputRange: [w * 0.08, w * 0.08, w * 0.92, w * 0.92] }) }] }]}
        >
          <Animated.View style={{ transform: faceMove }}>
            <Txt style={{ fontSize: 24, lineHeight: 30 }}>{face}</Txt>
          </Animated.View>
        </Animated.View>
      )}
      </View>
      <Animated.View style={{ transform: [{ scale: labelPop }], transformOrigin: 'left' }}>
        <Txt w="black" style={{ fontSize: 20, lineHeight: 26, marginTop: 6 }}>{face} {label}</Txt>
      </Animated.View>
      <Txt w="medium" style={{ fontSize: 12, lineHeight: 16, color: C.muted }}>
        *Medición 100% científica de broma: se calcula con tu ritmo de scroll.
      </Txt>
    </Card>
  );
}

// ---------- Por app ----------
function AppsCard({ stats }: { stats: Stats }) {
  const apps = stats.apps.filter((a) => a.cm >= 1).slice(0, 6);
  const max = apps[0]?.cm ?? 1;
  return (
    <Card>
      {apps.length === 0 && <Txt style={{ color: C.muted }}>Todavía nada. Abre TikTok o Instagram y haz scroll.</Txt>}
      {apps.map((a, i) => {
        const col = appColors(a.pkg);
        return (
          <View key={a.pkg} style={[styles.app, i > 0 && styles.appSep]}>
            <View style={[styles.ico, { backgroundColor: col.icon }]}>
              <Txt w="black" style={{ color: '#fff', fontSize: 15 }}>{a.label.charAt(0).toUpperCase()}</Txt>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt w="bold" style={{ fontSize: 15, lineHeight: 18 }} numberOfLines={1}>{a.label}</Txt>
              <View style={styles.bar}><View style={{ width: `${(a.cm / max) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: col.bar }} /></View>
            </View>
            <Txt w="black" style={{ fontSize: 15 }}>{fmtDist(a.cm / 100)}</Txt>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconbtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: BORDER, borderColor: C.ink, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', boxShadow: `2px 2px 0 ${C.ink}`,
  },
  hero: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 0, overflow: 'hidden' },
  bubble: {
    flex: 1, alignSelf: 'flex-start', marginTop: 10, backgroundColor: '#fff', borderWidth: BORDER, borderColor: C.ink,
    borderRadius: 16, paddingVertical: 7, paddingHorizontal: 11,
  },
  bubbleTail: {
    position: 'absolute', left: -9, bottom: 12, width: 14, height: 14, backgroundColor: '#fff',
    borderLeftWidth: BORDER, borderBottomWidth: BORDER, borderColor: C.ink, transform: [{ rotate: '45deg' }],
  },
  stage: { position: 'absolute', right: 10, bottom: 10, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 10 },
  eq: { marginTop: 6, backgroundColor: C.bg, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, minHeight: 34, overflow: 'hidden' },
  lbl: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  meter: { height: 20, borderWidth: BORDER, borderColor: C.ink, borderRadius: 999, overflow: 'hidden', backgroundColor: C.track },
  goalFill: { height: '100%', borderRightWidth: BORDER, borderColor: C.ink, borderRadius: 999, overflow: 'hidden' },
  cover: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: C.track, borderLeftWidth: BORDER, borderColor: C.ink },
  // Superpuesta a la barra (22 px de alto) y centrada en su posición: emoji de ~28 px de ancho
  face: { position: 'absolute', left: BORDER - 14, top: -4 },
  app: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  appSep: { borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.dash },
  ico: { width: 34, height: 34, borderRadius: 10, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 7, borderRadius: 4, backgroundColor: '#efe8f3', overflow: 'hidden' },
});
