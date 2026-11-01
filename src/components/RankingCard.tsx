import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { Ranking } from '../lib/ranking';
import { splitName } from '../lib/ranking';
import { BORDER, C, F } from '../theme';
import { Btn, Card, Txt } from './ui';

/** Tarjeta en Logros: unirse al ranking (opcional) o ver tu puesto y abrir la pantalla del Top 25. */
export function RankingCard({ ranking, onOpen }: { ranking: Ranking; onOpen: () => void }) {
  const [nick, setNick] = useState('');
  const [busy, setBusy] = useState(false);
  if (!ranking.available) return null;

  const join = async () => {
    setBusy(true);
    const ok = await ranking.join(nick);
    setBusy(false);
    if (ok) onOpen();
  };

  if (!ranking.me) {
    return (
      <Card style={{ backgroundColor: C.sky }}>
        <Txt w="black" style={styles.h}>🏆 Ranking mundial</Txt>
        <Txt w="medium" style={styles.p}>Compite con otros pulgares: el Top 25 de quienes más han scrolleado en total.</Txt>
        <View style={styles.row}>
          <TextInput
            value={nick}
            onChangeText={(t) => setNick(t.replace(/[^A-Za-z0-9]/g, '').slice(0, 14))}
            placeholder="Tu apodo"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={14}
            style={styles.input}
          />
          <Btn label={busy ? 'Uniendo…' : 'Unirme'} kind="lime" onPress={() => !busy && join()} />
        </View>
        {!!ranking.actionError && <Txt w="medium" style={styles.error}>{ranking.actionError}</Txt>}
        <Txt w="medium" style={styles.fine}>
          Solo letras y números. Al unirte se envía tu apodo, tus metros totales y tu mascota a dreamlo.com (sin cifrar). Puedes salir
          cuando quieras.
        </Txt>
      </Card>
    );
  }

  const { nick: myNick, tag } = splitName(ranking.me);
  const status = ranking.myEntry
    ? `Vas #${ranking.myEntry.position} de 25 ${ranking.myEntry.position <= 3 ? '🔥' : ''}`
    : ranking.board
      ? 'Todavía fuera del Top 25… ¡a scrollear! 👆'
      : ranking.loading ? 'Cargando ranking…' : ranking.boardError ? 'Sin conexión con el ranking' : '…';

  return (
    <Card style={{ backgroundColor: C.sky }}>
      <Txt w="black" style={styles.h}>🏆 Ranking mundial</Txt>
      <Txt w="bold" style={styles.p}>{myNick} <Txt w="medium" style={{ color: C.muted, fontSize: 13 }}>#{tag}</Txt></Txt>
      <Txt w="black" style={{ fontSize: 20, lineHeight: 26 }}>{status}</Txt>
      <View style={[styles.row, { marginTop: 8 }]}>
        <Btn label="Ver ranking" kind="lime" onPress={onOpen} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 20, lineHeight: 26 },
  p: { fontSize: 15, lineHeight: 21, marginTop: 2 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10 },
  input: {
    flex: 1, backgroundColor: '#fff', borderWidth: BORDER, borderColor: C.ink, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6, fontFamily: F.bold, fontSize: 16, color: C.ink,
  },
  error: { color: C.tomatoInk, fontSize: 13, lineHeight: 18, marginTop: 6 },
  fine: { fontSize: 12, lineHeight: 17, color: '#3c3247', marginTop: 8 },
});
