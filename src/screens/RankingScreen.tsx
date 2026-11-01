import { useEffect } from 'react';
import { Alert, BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascot } from '../components/Mascot';
import { Btn, Card, FadeInUp, PressScale, Txt } from '../components/ui';
import { fmtDist } from '../lib/content';
import type { Ranking } from '../lib/ranking';
import { splitName } from '../lib/ranking';
import { BORDER, C } from '../theme';

const MEDAL = ['🥇', '🥈', '🥉'];

/** Pantalla del Top 25 (se abre desde Logros). */
export function RankingScreen({ ranking, onClose }: { ranking: Ranking; onClose: () => void }) {
  const insets = useSafeAreaInsets();

  // Botón "atrás" de Android cierra la pantalla en vez de salir de la app
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (onClose(), true));
    return () => sub.remove();
  }, [onClose]);

  // Al entrar: enviar tu total si toca (máx. 1 vez por hora) y traer el tablero
  useEffect(() => {
    ranking.submitIfDue().then(ranking.refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmLeave = () =>
    Alert.alert('Salir del ranking', 'Se borra tu entrada del Top 25. Puedes volver a unirte cuando quieras.', [
      { text: 'Cancelar', style: 'cancel' },
      // Solo se cierra si de verdad salió; si falló, el error queda a la vista en esta pantalla
      { text: 'Salir', style: 'destructive', onPress: () => ranking.leave().then((ok) => ok && onClose()) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <FadeInUp index={0}>
          <View style={styles.top}>
            <PressScale onPress={onClose} style={styles.iconbtn}><Txt w="black" style={{ fontSize: 20 }}>←</Txt></PressScale>
            <Txt w="black" style={{ fontSize: 26, lineHeight: 30, flex: 1 }}>🏆 Top 25</Txt>
            <PressScale onPress={ranking.refresh} style={styles.iconbtn}><Txt style={{ fontSize: 18 }}>🔄</Txt></PressScale>
          </View>
        </FadeInUp>

        {ranking.loading && !ranking.board && <Txt w="bold" style={{ color: C.muted }}>Cargando ranking…</Txt>}
        {!!ranking.boardError && (
          <Card><Txt w="bold">No se pudo cargar el ranking 😵</Txt><Txt w="medium" style={{ color: C.muted }}>{ranking.boardError}</Txt></Card>
        )}
        {!!ranking.actionError && (
          <Card style={{ borderColor: C.tomatoInk }}><Txt w="bold" style={{ color: C.tomatoInk }}>{ranking.actionError}</Txt></Card>
        )}
        {ranking.board?.length === 0 && (
          <Card><Txt w="bold" style={{ fontSize: 17 }}>Nadie todavía. ¡Sé el primer pulgar del ranking! 👆</Txt></Card>
        )}

        {ranking.board?.map((e, i) => {
          const mine = e.name === ranking.me;
          return (
            <FadeInUp key={e.name} index={Math.min(i + 1, 8)}>
              {/* "mine" va al final para que tu fila se vea en lima aunque estés en el podio */}
              <View style={[styles.row, i < 3 && styles.podium, mine && styles.mine]}>
                <Txt w="black" style={styles.pos}>{MEDAL[i] ?? `#${e.position}`}</Txt>
                <Mascot k={e.mascot} stage={0} size={38} still />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt w="bold" numberOfLines={1} style={{ fontSize: 16, lineHeight: 20 }}>
                    {e.nick}{mine ? ' (tú)' : ''}
                  </Txt>
                  <Txt w="medium" style={{ fontSize: 12, color: C.muted }}>#{e.tag}</Txt>
                </View>
                <Txt w="black" style={{ fontSize: 17 }}>{fmtDist(e.meters)}</Txt>
              </View>
            </FadeInUp>
          );
        })}

        {ranking.me && (
          <View style={{ marginTop: 10, gap: 8, alignItems: 'center' }}>
            <Txt w="medium" style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>
              Participas como {splitName(ranking.me).nick} #{splitName(ranking.me).tag}. Tu total se actualiza al abrir la app o el ranking (máx. 1 vez por hora).
            </Txt>
            <Btn label="Salir del ranking" kind="ghost" onPress={confirmLeave} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 10, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  iconbtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: BORDER, borderColor: C.ink, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', boxShadow: `2px 2px 0 ${C.ink}`,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: BORDER, borderColor: C.ink,
    borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, boxShadow: `3px 3px 0 ${C.ink}`,
  },
  podium: { backgroundColor: '#fff7d6' },
  mine: { backgroundColor: C.lime },
  pos: { width: 40, fontSize: 20, textAlign: 'center' },
});
