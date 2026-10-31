import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScrollTracker from '../../modules/scroll-tracker';
import { Mascot } from '../components/Mascot';
import { Btn, Card, FadeInUp, PressScale, Txt } from '../components/ui';
import { BORDER, C } from '../theme';

const PRIVACY: [string, string][] = [
  ['✅', 'Solo recibe cuántos píxeles se movió la pantalla y en qué app.'],
  ['🚫', 'No lee textos, fotos, videos, mensajes ni lo que escribes.'],
  ['🚫', 'No toma capturas ni guarda nada de lo que ves.'],
  ['🚫', 'No tiene permiso de internet: nada sale de tu teléfono.'],
  ['🚫', 'Sin cuentas, sin anuncios, sin rastreo.'],
  ['✅', 'Lo apagas cuando quieras en Accesibilidad.'],
];

/**
 * Bienvenida: explica por qué se necesita Accesibilidad y qué NO hace la app con tus datos.
 * mode "setup": al abrir sin el servicio activado (desaparece sola al activarlo).
 * mode "info": desde Ajustes → Privacidad.
 */
export function Bienvenida({ mode, onClose }: { mode: 'setup' | 'info'; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
        <FadeInUp index={0}>
          <View style={styles.hero}>
            <Mascot k="pulgar" stage={0} size={120} />
            <View style={styles.bubble}>
              <View style={styles.bubbleTail} />
              <Txt w="black" style={{ fontSize: 18, lineHeight: 24 }}>¡Hola! Voy a medir cuánto scrolleas 📏</Txt>
            </View>
          </View>
        </FadeInUp>

        <FadeInUp index={1}>
          <Card>
            <Txt w="black" style={styles.h}>¿Por qué Accesibilidad?</Txt>
            <Txt w="medium" style={styles.p}>
              Android solo avisa que hubo scroll en otras apps a través del servicio de accesibilidad. Lo usamos únicamente para
              eso: sumar centímetros cada vez que la pantalla se mueve.
            </Txt>
          </Card>
        </FadeInUp>

        <FadeInUp index={2}>
          <Card>
            <Txt w="black" style={styles.h}>Tu privacidad</Txt>
            {PRIVACY.map(([icon, text]) => (
              <View key={text} style={styles.row}>
                <Txt style={{ fontSize: 16, lineHeight: 22 }}>{icon}</Txt>
                <Txt w="semibold" style={[styles.p, { flex: 1 }]}>{text}</Txt>
              </View>
            ))}
          </Card>
        </FadeInUp>

        {mode === 'setup' ? (
          <FadeInUp index={3}>
            <Card>
              <Txt w="black" style={styles.h}>Cómo activarlo</Txt>
              <Txt w="medium" style={styles.p}>1. Toca «Activar» → Apps instaladas → Scrollómetro → activar.</Txt>
              <Txt w="medium" style={styles.p}>
                2. Si el interruptor sale bloqueado: toca «Info de la app» → menú ⋮ → «Permitir ajustes restringidos» y repite el paso 1.
              </Txt>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <Btn label="Activar" kind="lime" onPress={() => ScrollTracker.openAccessibilitySettings()} />
                <Btn label="Info de la app" kind="ghost" onPress={() => ScrollTracker.openAppDetails()} />
              </View>
            </Card>
            <PressScale onPress={onClose} style={styles.skip}>
              <Txt w="bold" style={{ color: C.muted }}>Ver la app primero</Txt>
            </PressScale>
          </FadeInUp>
        ) : (
          <FadeInUp index={3}>
            <Btn label="Entendido" kind="lime" onPress={onClose} />
          </FadeInUp>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 14, gap: 14 },
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubble: {
    flex: 1, alignSelf: 'center', backgroundColor: '#fff', borderWidth: BORDER, borderColor: C.ink,
    borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12,
  },
  bubbleTail: {
    position: 'absolute', left: -9, bottom: 14, width: 14, height: 14, backgroundColor: '#fff',
    borderLeftWidth: BORDER, borderBottomWidth: BORDER, borderColor: C.ink, transform: [{ rotate: '45deg' }],
  },
  h: { fontSize: 19, lineHeight: 25, marginBottom: 4 },
  p: { fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 2 },
  skip: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16 },
});
