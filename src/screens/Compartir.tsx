import { useRef, useState, type ComponentRef } from 'react';
import { Alert, Modal, StyleSheet, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import type { Stats } from '../../modules/scroll-tracker';
import { Mascot } from '../components/Mascot';
import { Btn, Txt } from '../components/ui';
import { DOPA, bestEq, dopaLevel, fmtDist, stageOf } from '../lib/content';
import { MASCOTS } from '../lib/mascots';
import { C, F } from '../theme';

/** Tarjeta 9:16 para historias. Se captura como PNG 1080×1920 y se abre el menú de compartir. */
export function Compartir({ visible, stats, onClose }: { visible: boolean; stats: Stats; onClose: () => void }) {
  const card = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  const m = stats.totalCm / 100;
  const [, face, label] = DOPA[dopaLevel(stats.dopamine)];

  const share = async () => {
    if (!card.current || busy) return; // evita abrir dos menús de compartir con doble toque
    setBusy(true);
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, width: 1080, height: 1920 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir mi scroll' });
    } catch (e) {
      Alert.alert('No se pudo compartir', String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View ref={card} collapsable={false} style={styles.card}>
          <View style={[styles.blob, { top: 20, left: 0, width: 120, height: 120 }]} />
          <View style={[styles.blob, { top: 300, right: -60, width: 180, height: 180 }]} />
          <View style={styles.kick}><Txt w="black" style={{ fontSize: 18 }}>{MASCOTS[stats.mascot].shareKick}</Txt></View>
          <Txt style={styles.num}>{fmtDist(m)}</Txt>
          <View style={styles.sq}><Txt w="bold" style={{ fontSize: 17, lineHeight: 22 }}>{bestEq(m)}</Txt></View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Mascot k={stats.mascot} stage={stageOf(m)} size={190} still />
          </View>
          <View style={styles.dl}><Txt w="black" style={{ color: '#fff', fontSize: 15, textAlign: 'center' }}>Nivel de dopamina: {label} {face}</Txt></View>
          <Txt w="bold" style={{ fontSize: 12, textAlign: 'center', marginTop: 6, opacity: 0.8 }}>📏 scrollómetro · ¿y tu pulgar?</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
          <Btn label={busy ? 'Preparando…' : 'Compartir'} kind="lime" onPress={share} />
          <Btn label="Cerrar" kind="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(35,25,46,.75)', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: 300, height: 533, borderRadius: 28, borderWidth: 3, borderColor: C.ink, backgroundColor: C.grape,
    overflow: 'hidden', paddingVertical: 22, paddingHorizontal: 20,
  },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,.28)' },
  kick: {
    alignSelf: 'flex-start', backgroundColor: C.sun, borderWidth: 2.5, borderColor: C.ink, borderRadius: 10,
    paddingHorizontal: 10, transform: [{ rotate: '-3deg' }],
  },
  num: {
    fontFamily: F.black, fontSize: 64, lineHeight: 74, marginTop: 10, color: '#fff',
    // Android no dibuja la sombra con radio 0: 1 la deja casi dura, como en la maqueta
    textShadowColor: C.ink, textShadowOffset: { width: 4, height: 4 }, textShadowRadius: 1,
  },
  sq: { marginTop: 6, backgroundColor: '#fff', borderWidth: 2.5, borderColor: C.ink, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 10 },
  dl: { backgroundColor: C.ink, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, marginTop: 8 },
});
