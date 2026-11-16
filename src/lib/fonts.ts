import type { ChatFont } from './types';

/** Fonts available in the chat font picker. Web fonts are loaded via @fontsource in main.ts. */
export const CHAT_FONTS: Record<string, string> = {
  'Segoe UI': "'Segoe UI', 'Noto Sans', sans-serif",
  Tahoma: 'Tahoma, Verdana, sans-serif',
  Verdana: 'Verdana, sans-serif',
  'Comic Neue': "'Comic Neue', 'Comic Sans MS', cursive",
  Pacifico: "'Pacifico', cursive",
  Lobster: "'Lobster', cursive",
  Roboto: "'Roboto', sans-serif",
  'Source Code Pro': "'Source Code Pro', monospace",
};

export const FONT_SIZES = [11, 12, 13, 14, 16, 18, 22];

export const DEFAULT_FONT: ChatFont = {
  family: 'Segoe UI',
  size: 13,
  color: '#0b3b4a',
  bold: false,
  italic: false,
};

export function fontStyle(font: ChatFont | undefined): string {
  const f = font ?? DEFAULT_FONT;
  return [
    `font-family:${CHAT_FONTS[f.family] ?? CHAT_FONTS['Segoe UI']}`,
    `font-size:${f.size}px`,
    `color:${f.color}`,
    `font-weight:${f.bold ? 700 : 400}`,
    `font-style:${f.italic ? 'italic' : 'normal'}`,
  ].join(';');
}
