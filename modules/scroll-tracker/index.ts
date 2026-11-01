import { NativeModule, requireNativeModule } from 'expo';

export type Method = 'DELTA' | 'SCROLL_Y' | 'INDEX' | 'NONE';

export type AppStat = {
  pkg: string;
  label: string;
  cm: number;
  /** Cantidad de eventos medidos con cada método */
  delta: number;
  scrollY: number;
  index: number;
  none: number;
};

export type Stats = {
  day: string;
  totalCm: number;
  apps: AppStat[];
  ydpi: number;
  usedDpi: number;
  screenHeightPx: number;
  serviceRunning: boolean;
  /** Acumulado de toda la vida, para los logros */
  histCm: number;
  /** 0–100, ritmo de scroll de los últimos 10 min (lúdico) */
  dopamine: number;
  goalM: number;
  notifEnabled: boolean;
  phrases: boolean;
  mascot: MascotKey;
};

export type MascotKey = 'pulgar' | 'caracol' | 'cerebro';

export type ScrollEvent = {
  time: number;
  pkg: string;
  label: string;
  cls: string;
  dy: number;
  scrollY: number;
  fromIndex: number;
  toIndex: number;
  itemCount: number;
  method: Method;
  cm: number;
};

export type UpdateProgress = { received: number; total: number };

export type InstallStatus = { status: 'pending' | 'success' | 'failure'; message: string | null };

type Events = {
  onUpdateProgress: (p: UpdateProgress) => void;
  onInstallStatus: (s: InstallStatus) => void;
};

declare class ScrollTrackerNative extends NativeModule<Events> {
  isServiceEnabled(): boolean;
  openAccessibilitySettings(): void;
  openAppDetails(): void;
  getStats(): Stats;
  getEvents(): ScrollEvent[];
  reset(): void;
  setPrefs(goalM: number, notifEnabled: boolean, phrases: boolean, mascot: MascotKey): void;
  // Actualizaciones desde GitHub Releases
  getVersion(): { versionName: string; versionCode: number };
  canInstallUpdates(): boolean;
  openInstallPermission(): void;
  getInstallError(): string | null;
  downloadAndInstall(url: string): Promise<void>;
  /** Abre el diálogo de Android "¿Actualizar esta app?" si quedó pendiente. Devuelve si había uno. */
  showInstallConfirm(): boolean;
}

export default requireNativeModule<ScrollTrackerNative>('ScrollTracker');
