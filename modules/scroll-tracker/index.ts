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
};

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
};

export default requireNativeModule<ScrollTrackerNative>('ScrollTracker');

export function formatCm(cm: number): string {
  if (cm < 100) return `${Math.round(cm)} cm`;
  if (cm < 100_000) return `${(cm / 100).toFixed(1).replace('.', ',')} m`;
  return `${(cm / 100_000).toFixed(2).replace('.', ',')} km`;
}
