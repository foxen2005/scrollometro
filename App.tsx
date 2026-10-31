import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ScrollTracker, { formatCm, type ScrollEvent, type Stats } from './modules/scroll-tracker';

const METHOD_LABEL: Record<string, string> = {
  DELTA: 'delta',
  SCROLL_Y: 'posición',
  INDEX: 'índice',
  NONE: 'sin datos',
};

export default function App() {
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<ScrollEvent[]>([]);
  const [showLog, setShowLog] = useState(false);

  const refresh = useCallback(() => {
    setEnabled(ScrollTracker.isServiceEnabled());
    setStats(ScrollTracker.getStats());
    setEvents(ScrollTracker.getEvents());
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    refresh();
    const timer = setInterval(refresh, 1000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);

  const confirmReset = () =>
    Alert.alert('Reiniciar', '¿Borrar la distancia de hoy?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => { ScrollTracker.reset(); refresh(); } },
    ]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Scrollómetro</Text>

        {!enabled && (
          <View style={[styles.card, styles.warn]}>
            <Text style={styles.cardTitle}>Activa el servicio</Text>
            <Text style={styles.muted}>
              Ajustes → Accesibilidad → Apps instaladas → Scrollómetro → activar.{'\n'}
              Si el interruptor sale bloqueado: Info de la app → menú ⋮ → «Permitir ajustes restringidos».
            </Text>
            <View style={styles.row}>
              <Btn label="Abrir accesibilidad" onPress={ScrollTracker.openAccessibilitySettings} />
              <Btn label="Info de la app" onPress={ScrollTracker.openAppDetails} ghost />
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.muted}>Hoy scrolleaste</Text>
          <Text style={styles.big}>{formatCm(stats?.totalCm ?? 0)}</Text>
          <Text style={styles.small}>
            {enabled ? '● midiendo' : '○ servicio apagado'} · {stats?.day}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Por app</Text>
          {(stats?.apps.length ?? 0) === 0 && (
            <Text style={styles.muted}>Todavía nada. Abre TikTok o Instagram y haz scroll.</Text>
          )}
          {stats?.apps.map((a) => (
            <View key={a.pkg} style={styles.appRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.appName}>{a.label}</Text>
                <Text style={styles.small}>
                  delta {a.delta} · posición {a.scrollY} · índice {a.index} · sin datos {a.none}
                </Text>
              </View>
              <Text style={styles.appCm}>{formatCm(a.cm)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Pressable onPress={() => setShowLog((v) => !v)}>
            <Text style={styles.cardTitle}>
              {showLog ? '▾' : '▸'} Eventos crudos ({events.length})
            </Text>
          </Pressable>
          {showLog &&
            events.map((e, i) => (
              <Text key={`${e.time}-${i}`} style={styles.log}>
                {new Date(e.time).toLocaleTimeString()} {e.label} [{e.cls}] {METHOD_LABEL[e.method]}{' '}
                dy={e.dy} y={e.scrollY} idx={e.fromIndex}-{e.toIndex}/{e.itemCount} → {e.cm.toFixed(1)} cm
              </Text>
            ))}
        </View>

        {stats && (
          <Text style={styles.small}>
            Calibración: ydpi {stats.ydpi.toFixed(0)} · usado {stats.usedDpi.toFixed(0)} dpi · alto{' '}
            {stats.screenHeightPx}px ({formatCm((stats.screenHeightPx / stats.usedDpi) * 2.54)})
          </Text>
        )}

        <Btn label="Reiniciar hoy" onPress={confirmReset} ghost />
      </ScrollView>
    </View>
  );
}

function Btn({ label, onPress, ghost }: { label: string; onPress: () => void; ghost?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, ghost && styles.btnGhost, pressed && { opacity: 0.6 }]}>
      <Text style={[styles.btnText, ghost && styles.btnGhostText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1115' },
  content: { padding: 20, paddingTop: 56, gap: 14 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  card: { backgroundColor: '#1a1d24', borderRadius: 16, padding: 16, gap: 8 },
  warn: { borderWidth: 1, borderColor: '#f5a524' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  muted: { color: '#a3a9b6', fontSize: 14, lineHeight: 20 },
  small: { color: '#6b7280', fontSize: 12 },
  big: { color: '#7cf29c', fontSize: 52, fontWeight: '900' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  appName: { color: '#e5e7eb', fontSize: 15, fontWeight: '600' },
  appCm: { color: '#7cf29c', fontSize: 17, fontWeight: '800' },
  log: { color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' },
  btn: { backgroundColor: '#7cf29c', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3a3f4b' },
  btnText: { color: '#0f1115', fontWeight: '700' },
  btnGhostText: { color: '#e5e7eb' },
});
