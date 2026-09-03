export interface ColorTheme {
  name: string;
  bgLight: string;
  bgMedium: string;
  bgDark: string;
  text: string;
  border: string;
  borderHover: string;
  ring: string;
  badgeBg: string;
  badgeText: string;
  stroke: string;
  glow: string;
}

export const THEME_COLORS: Record<string, ColorTheme> = {
  indigo: {
    name: 'Indigo',
    bgLight: 'bg-indigo-50/80',
    bgMedium: 'bg-indigo-100',
    bgDark: 'bg-indigo-600',
    text: 'text-indigo-900',
    border: 'border-indigo-200',
    borderHover: 'hover:border-indigo-400',
    ring: 'focus:ring-indigo-400',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700',
    stroke: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.25)',
  },
  emerald: {
    name: 'Emerald',
    bgLight: 'bg-emerald-50/80',
    bgMedium: 'bg-emerald-100',
    bgDark: 'bg-emerald-600',
    text: 'text-emerald-900',
    border: 'border-emerald-200',
    borderHover: 'hover:border-emerald-400',
    ring: 'focus:ring-emerald-400',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    stroke: '#10b981',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  amber: {
    name: 'Amber',
    bgLight: 'bg-amber-50/80',
    bgMedium: 'bg-amber-100',
    bgDark: 'bg-amber-600',
    text: 'text-amber-900',
    border: 'border-amber-200',
    borderHover: 'hover:border-amber-400',
    ring: 'focus:ring-amber-400',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    stroke: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.25)',
  },
  rose: {
    name: 'Rose',
    bgLight: 'bg-rose-50/80',
    bgMedium: 'bg-rose-100',
    bgDark: 'bg-rose-600',
    text: 'text-rose-900',
    border: 'border-rose-200',
    borderHover: 'hover:border-rose-400',
    ring: 'focus:ring-rose-400',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    stroke: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.25)',
  },
  cyan: {
    name: 'Cyan',
    bgLight: 'bg-cyan-50/80',
    bgMedium: 'bg-cyan-100',
    bgDark: 'bg-cyan-600',
    text: 'text-cyan-900',
    border: 'border-cyan-200',
    borderHover: 'hover:border-cyan-400',
    ring: 'focus:ring-cyan-400',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-700',
    stroke: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.25)',
  },
  violet: {
    name: 'Violet',
    bgLight: 'bg-violet-50/80',
    bgMedium: 'bg-violet-100',
    bgDark: 'bg-violet-600',
    text: 'text-violet-900',
    border: 'border-violet-200',
    borderHover: 'hover:border-violet-400',
    ring: 'focus:ring-violet-400',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-700',
    stroke: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.25)',
  },
  orange: {
    name: 'Orange',
    bgLight: 'bg-orange-50/80',
    bgMedium: 'bg-orange-100',
    bgDark: 'bg-orange-600',
    text: 'text-orange-900',
    border: 'border-orange-200',
    borderHover: 'hover:border-orange-400',
    ring: 'focus:ring-orange-400',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    stroke: '#f97316',
    glow: 'rgba(249, 115, 22, 0.25)',
  },
  teal: {
    name: 'Teal',
    bgLight: 'bg-teal-50/80',
    bgMedium: 'bg-teal-100',
    bgDark: 'bg-teal-600',
    text: 'text-teal-900',
    border: 'border-teal-200',
    borderHover: 'hover:border-teal-400',
    ring: 'focus:ring-teal-400',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-700',
    stroke: '#14b8a6',
    glow: 'rgba(20, 184, 166, 0.25)',
  },
  blue: {
    name: 'Blue',
    bgLight: 'bg-blue-50/80',
    bgMedium: 'bg-blue-100',
    bgDark: 'bg-blue-600',
    text: 'text-blue-900',
    border: 'border-blue-200',
    borderHover: 'hover:border-blue-400',
    ring: 'focus:ring-blue-400',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    stroke: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.25)',
  },
};

export function getThemeColor(colorKey?: string): ColorTheme {
  if (!colorKey) return THEME_COLORS.indigo;
  const normalized = colorKey.toLowerCase().trim();
  return THEME_COLORS[normalized] || THEME_COLORS.indigo;
}
