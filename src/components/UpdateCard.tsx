import { StyleSheet, View } from 'react-native';
import type { Updates } from '../lib/updates';
import { BORDER, C } from '../theme';
import { Btn, Card, Txt } from './ui';

/** Tarjeta "Llegó una versión nueva": descarga con progreso e instala con el diálogo de Android. */
export function UpdateCard({ updates }: { updates: Updates }) {
  const { state, install, dismiss } = updates;
  if (!['available', 'needsPermission', 'downloading', 'confirming', 'error'].includes(state.kind)) return null;
  const release = 'release' in state ? state.release : undefined;
  if (state.kind === 'error' && !release) return null; // los errores de "buscar" se muestran en Ajustes

  return (
    <Card style={{ backgroundColor: C.sun }}>
      <Txt w="black" style={{ fontSize: 19, lineHeight: 25 }}>🎉 Llegó la versión {release?.version}</Txt>

      {state.kind === 'available' && (
        <>
          {!!release?.notes && (
            <Txt w="medium" numberOfLines={5} style={styles.notes}>{release.notes}</Txt>
          )}
          <View style={styles.row}>
            <Btn label="Actualizar" kind="lime" onPress={() => install(release!)} />
            <Btn label="Después" kind="ghost" onPress={dismiss} />
          </View>
        </>
      )}

      {state.kind === 'needsPermission' && (
        <>
          <Txt w="medium" style={styles.notes}>
            Android necesita que permitas a Scrollómetro instalar su propia actualización: activa «Permitir de esta fuente»
            y vuelve aquí.
          </Txt>
          <View style={styles.row}>
            <Btn label="Reintentar" kind="lime" onPress={() => install(release!)} />
          </View>
        </>
      )}

      {state.kind === 'downloading' && (
        <>
          <Txt w="medium" style={styles.notes}>Descargando… {Math.round(state.progress * 100)} %</Txt>
          <View style={styles.bar}>
            <View style={{ width: `${Math.max(3, state.progress * 100)}%`, height: '100%', backgroundColor: C.lime }} />
          </View>
        </>
      )}

      {state.kind === 'confirming' && (
        <Txt w="medium" style={styles.notes}>Confirma en el aviso de Android y la app se reinicia actualizada. 🚀</Txt>
      )}

      {state.kind === 'error' && (
        <>
          <Txt w="medium" style={styles.notes}>No se pudo actualizar: {state.message}</Txt>
          <View style={styles.row}>
            <Btn label="Reintentar" kind="lime" onPress={() => install(release!)} />
            <Btn label="Cerrar" kind="ghost" onPress={dismiss} />
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  notes: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  bar: { height: 14, marginTop: 8, borderWidth: BORDER, borderColor: C.ink, borderRadius: 999, overflow: 'hidden', backgroundColor: '#fff' },
});
