import { Easing } from 'react-native';

/** Paleta y tokens de la maqueta aprobada (maqueta/index.html). */
export const C = {
  bg: '#fff4e4',
  ink: '#23192e',
  card: '#ffffff',
  lime: '#c6f45e',
  tomato: '#ff6b57',
  tomatoInk: '#c4311d',
  sky: '#8fd3ff',
  grape: '#a88bff',
  sun: '#ffd24a',
  pink: '#ff9ec7',
  muted: '#5f5570',
  track: '#f1ecf5',
  dash: '#e4dcea',
};

/** Fondo del héroe según el estado de la mascota. */
export const STAGE_BG = [C.sky, C.sun, '#ffb38a', '#b9e39b'];

export const F = {
  medium: 'Baloo2_500Medium',
  semibold: 'Baloo2_600SemiBold',
  bold: 'Baloo2_700Bold',
  black: 'Baloo2_800ExtraBold',
};

export const BORDER = 2.5;
export const RADIUS = 22;

/** Curvas de la maqueta: ease-out fuerte para UI, seno para loops de respiración. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_SINE = Easing.bezier(0.37, 0, 0.63, 1);
