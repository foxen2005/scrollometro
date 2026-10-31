import { requireNativeModule } from 'expo';

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

type ScrollTrackerNative = {
  isServiceEnabled(): boolean;
  openAccessibilitySettings(): void;
  openAppDetails(): void;
  getStats(): Stats;
  getEvents(): ScrollEvent[];
  reset(): void;
  setPrefs(goalM: number, notifEnabled: boolean, phrases: boolean, mascot: MascotKey): void;
};

export default requireNativeModule<ScrollTrackerNative>('ScrollTracker');
