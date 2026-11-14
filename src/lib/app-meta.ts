/**
 * This app's identity, in ONE place — the installable manifest and the share card
 * (Open Graph) read it (App Excellence Standard E11). The tab title stays in layout.tsx.
 */
export const APP_META = {
  name:        'TEC Analytics',
  shortName:   'Analytics',
  description: 'TEC Analytics — Economic Intelligence for the Pi Network ecosystem',
  /** The page background — the design token `--tec-bg` (C-83 layer 1); also the browser chrome and splash colour. */
  themeColor:  '#050816',
} as const;
