import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import ScrollTracker, { type ScrollEvent, type Stats } from './modules/scroll-tracker';
import { PressScale, ReduceMotionProvider, Txt } from './src/components/ui';
import { Hoy } from './src/screens/Hoy';
import { Logros } from './src/screens/Logros';
import { Ajustes, type Prefs, type PrefsUpdate } from './src/screens/Ajustes';
import { Compartir } from './src/screens/Compartir';
import { Bienvenida } from './src/screens/Bienvenida';
import { useUpdates } from './src/lib/updates';
import { BORDER, C } from './src/theme';

type Tab = 'hoy' | 'logros' | 'ajustes';
const TABS: [Tab, string, string][] = [
  ['hoy', '🏠', 'Hoy'],
  ['logros', '🏆', 'Logros'],
  ['ajustes', '⚙️', 'Ajustes'],
];

export default function App() {
  const [fontsLoaded] = useFonts({ Baloo2_500Medium, Baloo2_600SemiBold, Baloo2_700Bold, Baloo2_800ExtraBold });
  return (
    <SafeAreaProvider>
      <ReduceMotionProvider>
        <StatusBar style="dark" />
        {fontsLoaded ? <Main /> : <View style={{ flex: 1, backgroundColor: C.bg }} />}
      </ReduceMotionProvider>
    </SafeAreaProvider>
  );
}

function Main() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('hoy');
  const [stats, setStats] = useState<Stats | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<ScrollEvent[]>([]);
  const [sharing, setSharing] = useState(false);
  const [skipSetup, setSkipSetup] = useState(false); // "Ver la app primero" (solo esta sesión)
  const [showPrivacy, setShowPrivacy] = useState(false);
  const updates = useUpdates(); // busca versión nueva en GitHub al abrir la app

  const tabRef = useRef<Tab>('hoy');
  tabRef.current = tab;
  const prefsRef = useRef<Prefs | null>(null);

  const refresh = useCallback(() => {
    const s = ScrollTracker.getStats();
    prefsRef.current = { goalM: s.goalM, notifEnabled: s.notifEnabled, phrases: s.phrases, mascot: s.mascot };
    setStats(s);
    setEnabled(ScrollTracker.isServiceEnabled());
    // El log crudo solo se muestra en Ajustes: no traer 60 eventos por segundo en las otras pestañas
    if (tabRef.current === 'ajustes') setEvents(ScrollTracker.getEvents());
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

  // Al entrar a Ajustes, traer el log de inmediato (no esperar al siguiente segundo)
  useEffect(() => {
    if (tab === 'ajustes') refresh();
  }, [tab, refresh]);

  const setPrefs = (update: PrefsUpdate) => {
    const cur = prefsRef.current;
    if (!cur) return;
    const next = { ...cur, ...update(cur) };
    prefsRef.current = next;
    ScrollTracker.setPrefs(next.goalM, next.notifEnabled, next.phrases, next.mascot);
    refresh();
  };
  const reset = () => {
    ScrollTracker.reset();
    refresh();
  };

  if (!stats) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  // Bienvenida mientras el servicio no esté activado (se va sola al activarlo) o desde Ajustes → Privacidad
  if (showPrivacy) return <Bienvenida mode="info" onClose={() => setShowPrivacy(false)} />;
  if (!enabled && !skipSetup) return <Bienvenida mode="setup" onClose={() => setSkipSetup(true)} />;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* key por pestaña: cada pantalla entra con su cascada al abrirla */}
      <ScrollView key={tab} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'hoy' && <Hoy stats={stats} updates={updates} onShare={() => setSharing(true)} onSettings={() => setTab('ajustes')} />}
        {tab === 'logros' && <Logros histCm={stats.histCm} />}
        {tab === 'ajustes' && (
          <Ajustes
            stats={stats}
            enabled={enabled}
            events={events}
            updates={updates}
            onPrefs={setPrefs}
            onReset={reset}
            onPrivacy={() => setShowPrivacy(true)}
          />
        )}
      </ScrollView>

      {/* Pestañas siempre por encima de la barra de gestos de Android */}
      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        {TABS.map(([k, icon, label]) => (
          <PressScale key={k} onPress={() => setTab(k)} style={styles.tab}>
            <Txt style={{ fontSize: 20, lineHeight: 26, opacity: tab === k ? 1 : 0.45 }}>{icon}</Txt>
            <Txt w="bold" style={{ fontSize: 12, lineHeight: 16, color: tab === k ? C.ink : C.muted }}>{label}</Txt>
          </PressScale>
        ))}
      </View>

      <Compartir visible={sharing} stats={stats} onClose={() => setSharing(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 10, gap: 14 },
  tabs: {
    flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, paddingHorizontal: 14,
    borderTopWidth: BORDER, borderColor: C.ink, backgroundColor: '#fff',
  },
  tab: { alignItems: 'center', paddingHorizontal: 18 },
});
