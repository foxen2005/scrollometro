// Ranking mundial (Top 25) sobre dreamlo. Opcional: solo se envía algo si el usuario se une.
import { useCallback, useEffect, useRef, useState } from 'react';
import ScrollTracker, { type MascotKey } from '../../modules/scroll-tracker';

export type RankEntry = { name: string; nick: string; tag: string; meters: number; mascot: MascotKey; position: number };

const SUBMIT_EVERY_MS = 60 * 60 * 1000; // como máximo un envío por hora
const MASCOT_KEYS: MascotKey[] = ['pulgar', 'caracol', 'cerebro'];

/** "Jean_4821" → { nick: "Jean", tag: "4821" } */
export function splitName(name: string) {
  const i = name.lastIndexOf('_');
  return i > 0 ? { nick: name.slice(0, i), tag: name.slice(i + 1) } : { nick: name, tag: '' };
}

/** dreamlo devuelve "entry" como arreglo, como objeto suelto si hay uno solo, o leaderboard null si está vacío. */
export function parseBoard(raw: string): RankEntry[] {
  const json = JSON.parse(raw);
  const entry = json?.dreamlo?.leaderboard?.entry;
  const list: { name: string; score: string | number; text?: string }[] = !entry ? [] : Array.isArray(entry) ? entry : [entry];
  return list
    .map((e) => ({
      name: String(e.name),
      ...splitName(String(e.name)),
      meters: Number(e.score) || 0,
      mascot: (MASCOT_KEYS.includes(e.text as MascotKey) ? e.text : 'pulgar') as MascotKey,
    }))
    .sort((a, b) => b.meters - a.meters)
    .slice(0, 25)
    .map((e, i) => ({ ...e, position: i + 1 }));
}

export function useRanking() {
  // Fijo al compilar (BuildConfig): se lee una sola vez, no en cada render
  const [available] = useState(() => ScrollTracker.rankingAvailable());
  const [me, setMe] = useState<string | null>(() => ScrollTracker.getRankingProfile().name);
  const [board, setBoard] = useState<RankEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  // Errores separados: un fallo al traer el tablero no debe aparecer como error al unirse
  const [boardError, setBoardError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Si ya hay una consulta del tablero en curso se reutiliza: dreamlo rechaza la misma URL dos veces en un segundo
  const inFlight = useRef<Promise<void> | null>(null);
  const refresh = useCallback(() => {
    if (!available) return Promise.resolve();
    if (inFlight.current) return inFlight.current;
    setLoading(true);
    setBoardError(null);
    inFlight.current = (async () => {
      try {
        setBoard(parseBoard(await ScrollTracker.fetchRanking()));
      } catch (e) {
        setBoardError(String((e as Error).message ?? e));
      } finally {
        setLoading(false);
        inFlight.current = null;
      }
    })();
    return inFlight.current;
  }, [available]);

  /** Envía el total si estás unido y pasó una hora desde el último envío (o si se fuerza). */
  const submitIfDue = useCallback(async (force = false) => {
    const p = ScrollTracker.getRankingProfile();
    if (!available || !p.name) return;
    if (!force && Date.now() - p.lastSubmit < SUBMIT_EVERY_MS) return;
    try {
      await ScrollTracker.submitRanking();
    } catch {
      // sin señal: se reintenta en la próxima apertura
    }
  }, [available]);

  const join = useCallback(async (nick: string) => {
    setActionError(null);
    if (nick.length < 2) {
      setActionError('El apodo necesita al menos 2 letras o números');
      return false;
    }
    try {
      const name = await ScrollTracker.joinRanking(nick); // ya envía tu total
      setMe(name);
      await refresh();
      return true;
    } catch (e) {
      setActionError(String((e as Error).message ?? e));
      return false;
    }
  }, [refresh]);

  /** Devuelve si salió de verdad (si falla, por ejemplo sin señal, sigues en el ranking y se muestra el error). */
  const leave = useCallback(async () => {
    setActionError(null);
    try {
      await ScrollTracker.leaveRanking();
      setMe(null);
      setBoard(null);
      return true;
    } catch (e) {
      setActionError(`No se pudo salir del ranking: ${String((e as Error).message ?? e)}`);
      return false;
    }
  }, []);

  // Al abrir la app: SOLO si estás unido se contacta a dreamlo (enviar si toca y traer el tablero).
  // Si no te uniste, no se conecta a nada hasta que abras el ranking.
  useEffect(() => {
    if (!available || !me) return;
    submitIfDue().then(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  const myEntry = board?.find((e) => e.name === me) ?? null;
  return { available, me, board, myEntry, loading, boardError, actionError, refresh, submitIfDue, join, leave };
}

export type Ranking = ReturnType<typeof useRanking>;
