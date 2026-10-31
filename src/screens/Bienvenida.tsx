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

// Pasos con los textos tal como los muestra Android (pueden variar un poco según la marca)
const SETUP_STEPS: [string, string][] = [
  ['1', 'Toca «Activar». Se abre Accesibilidad: entra a «Apps instaladas» (o «Servicios descargados») → Scrollómetro.'],
  ['2', 'Activa el interruptor y acepta el aviso de Android.'],
  ['3', 'Si sale «Controlado por la configuración restringida», toca Aceptar y luego «Info de la app» (aquí abajo).'],
  ['4', 'En Info de la app toca el menú ⋮ (arriba a la derecha) → «Permitir ajustes restringidos» y confirma con tu huella o PIN.'],
  ['5', 'Vuelve a Accesibilidad y repite el paso 2. Al volver aquí, esta pantalla se va sola. 🎉'],
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
          <>
            <FadeInUp index={3}>
              <Card>
                <Txt w="black" style={styles.h}>Cómo activarlo</Txt>
                {SETUP_STEPS.map(([n, text]) => (
                  <View key={n} style={styles.step}>
                    <View style={styles.num}><Txt w="black" style={{ fontSize: 14, lineHeight: 18 }}>{n}</Txt></View>
                    <Txt w="medium" style={[styles.p, { flex: 1 }]}>{text}</Txt>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  <Btn label="Activar" kind="lime" onPress={() => ScrollTracker.openAccessibilitySettings()} />
                  <Btn label="Info de la app" kind="ghost" onPress={() => ScrollTracker.openAppDetails()} />
                </View>
              </Card>
            </FadeInUp>

            <FadeInUp index={4}>
              <Card>
                <Txt w="black" style={styles.h}>¿Play Protect te avisó al instalar? 🛡️</Txt>
                <Txt w="medium" style={styles.p}>
                  Es normal: Google revisa con lupa toda app que pide Accesibilidad, porque es el mismo permiso que usan las
                  apps peligrosas. Por eso arriba te contamos exactamente qué hace y qué no.
                </Txt>
                <Txt w="medium" style={[styles.p, { marginTop: 6 }]}>
                  Si lo apagaste para instalar, vuelve a encenderlo: Play Store → tu foto → Play Protect → ⚙️ → «Analizar
                  apps con Play Protect».
                </Txt>
              </Card>
              <PressScale onPress={onClose} style={styles.skip}>
                <Txt w="bold" style={{ color: C.muted }}>Ver la app primero</Txt>
              </PressScale>
            </FadeInUp>
          </>
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
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 4 },
  num: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.ink, backgroundColor: C.sun,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  skip: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16 },
});
