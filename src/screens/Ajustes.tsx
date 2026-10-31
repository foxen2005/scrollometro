import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import ScrollTracker, { type MascotKey, type ScrollEvent, type Stats } from '../../modules/scroll-tracker';
import { Mascot } from '../components/Mascot';
import { Btn, Card, FadeInUp, PressScale, Toggle, Txt } from '../components/ui';
import { fmtDist } from '../lib/content';
import { MASCOTS } from '../lib/mascots';
import { BORDER, C } from '../theme';

const GOALS = [100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000];
const METHOD_LABEL: Record<string, string> = { DELTA: 'delta', SCROLL_Y: 'posición', INDEX: 'índice', NONE: 'sin datos' };

export type Prefs = { goalM: number; notifEnabled: boolean; phrases: boolean; mascot: MascotKey };
/** Recibe las preferencias más recientes (no las del último render) para que dos toques seguidos no se pisen. */
export type PrefsUpdate = (cur: Prefs) => Partial<Prefs>;

export function Ajustes({
  stats,
  enabled,
  events,
  onPrefs,
  onReset,
  onPrivacy,
}: {
  stats: Stats;
  enabled: boolean;
  events: ScrollEvent[];
  onPrefs: (update: PrefsUpdate) => void;
  onReset: () => void;
  onPrivacy: () => void;
}) {
  const [showLog, setShowLog] = useState(false);
  const set = (p: Partial<Prefs>) => onPrefs(() => p);
  const step = (d: number) =>
    onPrefs((cur) => {
      const i = GOALS.findIndex((g) => g >= cur.goalM);
      const gi = i < 0 ? GOALS.length - 1 : i;
      return { goalM: GOALS[Math.min(GOALS.length - 1, Math.max(0, gi + d))] };
    });

  // Tres estados: corriendo de verdad / activado en Ajustes pero detenido (p. ej. tras un cierre) / apagado
  const service = stats.serviceRunning
    ? { dot: '● Midiendo', color: '#2f9e44', sub: 'Accesibilidad activa y corriendo' }
    : enabled
      ? { dot: '● Detenido', color: C.tomatoInk, sub: 'Está activado pero no corre: apágalo y vuelve a encenderlo' }
      : { dot: '○ Apagado', color: C.muted, sub: 'Actívalo en Accesibilidad → Scrollómetro' };

  const confirmReset = () =>
    Alert.alert('Reiniciar hoy', '¿Borrar la distancia de hoy? También se descuenta del histórico.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: onReset },
    ]);

  return (
    <>
      <FadeInUp index={0}><Txt w="black" style={{ fontSize: 26, lineHeight: 30 }}>Ajustes</Txt></FadeInUp>

      <FadeInUp index={1}>
        <Group title="Servicio">
          <Card>
            <View style={styles.set}>
              <View style={{ flex: 1 }}>
                <Txt w="bold" style={{ color: service.color }}>{service.dot}</Txt>
                <Txt w="medium" style={styles.small}>{service.sub}</Txt>
              </View>
              <Btn label="Abrir" onPress={() => ScrollTracker.openAccessibilitySettings()} />
            </View>
            <PressScale onPress={onPrivacy} style={[styles.set, styles.sep]}>
              <View style={{ flex: 1 }}>
                <Txt w="bold">🔒 Privacidad</Txt>
                <Txt w="medium" style={styles.small}>Qué mide la app y qué no toca</Txt>
              </View>
              <Txt w="black" style={{ color: C.muted }}>›</Txt>
            </PressScale>
            {!stats.serviceRunning && (
              <View style={[styles.set, styles.sep]}>
                <View style={{ flex: 1 }}>
                  <Txt w="bold">¿Interruptor bloqueado?</Txt>
                  <Txt w="medium" style={styles.small}>Info de la app → ⋮ → Permitir ajustes restringidos</Txt>
                </View>
                <Btn label="Info" kind="ghost" onPress={() => ScrollTracker.openAppDetails()} />
              </View>
            )}
          </Card>
        </Group>
      </FadeInUp>

      <FadeInUp index={2}>
        <Group title="Mascota">
          <Card>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(Object.keys(MASCOTS) as MascotKey[]).map((k) => (
                <PressScale key={k} onPress={() => set({ mascot: k })} style={[styles.pick, k === stats.mascot && styles.pickOn]}>
                  <Mascot k={k} stage={0} size={54} still={k !== stats.mascot} />
                  <Txt w="bold" style={{ fontSize: 12 }}>{MASCOTS[k].name}</Txt>
                </PressScale>
              ))}
            </View>
          </Card>
        </Group>
      </FadeInUp>

      <FadeInUp index={3}>
        <Group title="Preferencias">
          <Card>
            <View style={styles.set}>
              <Txt w="bold">Meta diaria</Txt>
              <View style={styles.stepper}>
                <PressScale onPress={() => step(-1)} style={styles.stepBtn}><Txt w="black">−</Txt></PressScale>
                <Txt w="bold" style={{ minWidth: 56, textAlign: 'center' }}>{fmtDist(stats.goalM)}</Txt>
                <PressScale onPress={() => step(1)} style={styles.stepBtn}><Txt w="black">+</Txt></PressScale>
              </View>
            </View>
            <View style={[styles.set, styles.sep]}>
              <View style={{ flex: 1 }}>
                <Txt w="bold">Notificación fija</Txt>
                <Txt w="medium" style={styles.small}>Total del día en la barra</Txt>
              </View>
              <Toggle value={stats.notifEnabled} onChange={(v) => set({ notifEnabled: v })} />
            </View>
            <View style={[styles.set, styles.sep]}>
              <View style={{ flex: 1 }}>
                <Txt w="bold">Frases cómicas</Txt>
                <Txt w="medium" style={styles.small}>En la notificación</Txt>
              </View>
              <Toggle value={stats.phrases} onChange={(v) => set({ phrases: v })} />
            </View>
          </Card>
        </Group>
      </FadeInUp>

      <FadeInUp index={4}>
        <Group title="Avanzado">
          <Card>
            <PressScale onPress={() => setShowLog((v) => !v)} style={styles.set}>
              <Txt w="bold">{showLog ? '▾' : '▸'} Eventos crudos ({events.length})</Txt>
            </PressScale>
            {showLog && (
              <View style={{ gap: 2, paddingBottom: 6 }}>
                {stats.apps.map((a) => (
                  <Txt key={a.pkg} w="medium" style={styles.mono}>
                    {a.label}: delta {a.delta} · posición {a.scrollY} · índice {a.index} · sin datos {a.none}
                  </Txt>
                ))}
                {events.map((e, i) => (
                  <Txt key={`${e.time}-${i}`} w="medium" style={styles.mono}>
                    {new Date(e.time).toLocaleTimeString()} {e.label} [{e.cls}] {METHOD_LABEL[e.method]} dy={e.dy} → {e.cm.toFixed(1)} cm
                  </Txt>
                ))}
              </View>
            )}
            <View style={[styles.set, styles.sep]}>
              <View>
                <Txt w="bold">Calibración</Txt>
                <Txt w="medium" style={styles.small}>
                  {stats.usedDpi.toFixed(0)} dpi · pantalla {fmtDist((stats.screenHeightPx / stats.usedDpi) * 0.0254)}
                </Txt>
              </View>
            </View>
          </Card>
        </Group>
      </FadeInUp>

      <FadeInUp index={5}>
        <PressScale onPress={confirmReset} style={styles.danger}>
          <Txt w="black" style={{ color: C.tomatoInk }}>Reiniciar hoy</Txt>
        </PressScale>
      </FadeInUp>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Txt w="black" style={styles.groupTitle}>{title.toUpperCase()}</Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: { fontSize: 13, letterSpacing: 0.5, color: C.muted, marginHorizontal: 4, marginBottom: 6 },
  set: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 8 },
  sep: { borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.dash },
  small: { fontSize: 12, lineHeight: 16, color: C.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 30, height: 30, borderRadius: 9, borderWidth: BORDER, borderColor: C.ink, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  pick: { flex: 1, borderWidth: BORDER, borderColor: C.ink, borderRadius: 14, paddingTop: 4, paddingBottom: 2, alignItems: 'center', backgroundColor: '#fff' },
  pickOn: { backgroundColor: C.lime, boxShadow: `2px 2px 0 ${C.ink}` },
  mono: { fontSize: 11, lineHeight: 15, color: C.muted, fontFamily: 'monospace' },
  danger: { borderWidth: BORDER, borderColor: C.tomatoInk, borderRadius: 14, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff' },
});
