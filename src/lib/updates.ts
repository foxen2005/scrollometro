// Busca versiones nuevas en GitHub Releases. Es la ÚNICA conexión a internet de la app:
// solo lee el último release público; no envía ningún dato del usuario.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import ScrollTracker from '../../modules/scroll-tracker';

export const REPO = 'foxen2005/scrollometro';
const ASSET = 'Scrollometro.apk';

export type Release = { version: string; notes: string; url: string; size: number };

export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'latest' }
  | { kind: 'available'; release: Release }
  | { kind: 'needsPermission'; release: Release }
  | { kind: 'downloading'; release: Release; progress: number }
  | { kind: 'confirming'; release: Release }
  | { kind: 'error'; message: string; release?: Release };

/** "0.10.2" > "0.9.9" */
export function isNewer(remote: string, local: string): boolean {
  const a = remote.split('.').map((n) => parseInt(n, 10) || 0);
  const b = local.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

async function fetchLatest(): Promise<Release | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (res.status === 404) return null; // todavía no hay releases
  if (!res.ok) throw new Error(`GitHub respondió ${res.status}`);
  const json = await res.json();
  const asset = (json.assets ?? []).find((a: { name: string }) => a.name === ASSET);
  if (!asset) return null;
  return {
    version: String(json.tag_name ?? '').replace(/^v/, ''),
    notes: String(json.body ?? '').trim(),
    url: asset.browser_download_url,
    size: asset.size ?? 0,
  };
}

/** Estado del actualizador: busca al abrir la app y expone acciones para la UI. */
export function useUpdates() {
  const [state, setStateRaw] = useState<UpdateState>({ kind: 'idle' });
  // Inicializador perezoso: la llamada nativa se hace una sola vez, no en cada render
  const [current] = useState(() => ScrollTracker.getVersion().versionName);
  const stateRef = useRef(state);
  const setState = useCallback((s: UpdateState | ((prev: UpdateState) => UpdateState)) => {
    setStateRaw((prev) => {
      const next = typeof s === 'function' ? s(prev) : s;
      stateRef.current = next;
      return next;
    });
  }, []);

  const check = useCallback(async (manual = false) => {
    // Durante una descarga o confirmación no se vuelve a buscar (evita dos descargas al mismo archivo)
    if (['downloading', 'confirming', 'checking'].includes(stateRef.current.kind)) return;
    setState({ kind: 'checking' });
    try {
      const rel = await fetchLatest();
      setState(rel && isNewer(rel.version, current) ? { kind: 'available', release: rel } : { kind: manual ? 'latest' : 'idle' });
    } catch (e) {
      // Una revisión automática que falla (sin señal) no molesta; solo se muestra si la pediste tú
      setState(manual ? { kind: 'error', message: String((e as Error).message ?? e) } : { kind: 'idle' });
    }
  }, [current, setState]);

  const install = useCallback(async (release: Release) => {
    if (['downloading', 'confirming'].includes(stateRef.current.kind)) return;
    if (!ScrollTracker.canInstallUpdates()) {
      setState({ kind: 'needsPermission', release });
      ScrollTracker.openInstallPermission();
      return;
    }
    setState({ kind: 'downloading', release, progress: 0 });
    const sub = ScrollTracker.addListener('onUpdateProgress', ({ received, total }) => {
      setState({ kind: 'downloading', release, progress: total > 0 ? received / total : 0 });
    });
    try {
      await ScrollTracker.downloadAndInstall(release.url);
      setState({ kind: 'confirming', release }); // el instalador avisa por onInstallStatus
    } catch (e) {
      setState({ kind: 'error', message: String((e as Error).message ?? e), release });
    } finally {
      sub.remove();
    }
  }, [setState]);

  // Resultado del instalador: abrir el diálogo de Android (si la app está al frente) o mostrar el error.
  // Llega por evento, así que también se entera si cancelas el diálogo después de volver a la app.
  useEffect(() => {
    const sub = ScrollTracker.addListener('onInstallStatus', ({ status, message }) => {
      if (status === 'pending') {
        if (AppState.currentState === 'active') ScrollTracker.showInstallConfirm();
      } else if (status === 'failure') {
        setState((prev) => ({ kind: 'error', message: message ?? 'La instalación falló', release: 'release' in prev ? prev.release : undefined }));
      }
    });
    return () => sub.remove();
  }, [setState]);

  // Al volver a la app: retomar tras dar el permiso, o abrir el diálogo que quedó pendiente en segundo plano
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      const prev = stateRef.current;
      if (prev.kind === 'needsPermission' && ScrollTracker.canInstallUpdates()) setState({ kind: 'available', release: prev.release });
      if (prev.kind === 'confirming') {
        const err = ScrollTracker.getInstallError();
        if (err) setState({ kind: 'error', message: err, release: prev.release });
        else ScrollTracker.showInstallConfirm();
      }
    });
    return () => sub.remove();
  }, [setState]);

  useEffect(() => {
    check(false);
  }, [check]);

  const dismiss = useCallback(() => setState({ kind: 'idle' }), [setState]);
  return { state, current, check, install, dismiss };
}

export type Updates = ReturnType<typeof useUpdates>;
