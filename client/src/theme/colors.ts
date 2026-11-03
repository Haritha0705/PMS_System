/**
 * PGWCS APPLICATION COLOR THEME
 * Premium enterprise color system
 * Extracted from brand logo: Deep Navy background, Imperial Gold elements, Ruby Red accent
 */

export const pgwcsTheme = {
  // ROYAL NAVY (Primary)
  navy: {
    950: '#050520', // Deepest backgrounds
    900: '#0A0A3E', // Primary background
    800: '#10105C', // Card backgrounds
    700: '#1A1A7A', // Hover states
    600: '#2424A0', // Active elements
    500: '#3333BB', // Links / accents
  },

  // IMPERIAL GOLD (Brand)
  gold: {
    900: '#5C3A0A', // Dark gold text
    800: '#8B5E14', // Borders / outlines
    700: '#B8860B', // Icons / secondary
    600: '#D4A017', // Primary buttons
    500: '#E8B830', // Highlights / badges
    400: '#F0CC5A', // Hover gold
    300: '#F5DC8A', // Light gold accents
    200: '#FAE9B0', // Gold tints
    100: '#FCF3DC', // Very light gold
  },

  // RUBY ACCENT
  ruby: {
    700: '#8B1A2B', // Dark accent
    600: '#B22234', // Error / alerts
    500: '#D4344A', // Primary accent
    400: '#E85A6E', // Hover accent
  },

  // NEUTRALS
  neutral: {
    900: '#1A1A2E', // Body text on light
    700: '#3D3D5C', // Secondary text
    500: '#6B6B8D', // Muted / placeholder
    300: '#A0A0BE', // Borders
    200: '#D0D0E0', // Dividers
    100: '#EAEAF2', // Light backgrounds
    50: '#F5F5FA', // Page background (light)
  },

  // SEMANTIC COLORS
  semantic: {
    success: '#1A8754',
    warning: '#D4A017',
    error: '#B22234',
    info: '#3333BB',
  },

  // PURE
  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * Get theme color by path
 * Usage: getColor('gold.600'), getColor('navy.900')
 */
export function getColor(path: string): string {
  const keys = path.split('.');
  let value: unknown = pgwcsTheme;

  for (const key of keys) {
    if (typeof value !== 'object' || value === null) return '#000000';
    value = (value as Record<string, unknown>)[key];
    if (value === undefined) return '#000000';
  }

  return typeof value === 'string' ? value : '#000000';
}

export default pgwcsTheme;

