export const themeIds = ['cyprus', 'plum', 'alabaster', 'mint', 'persia', 'kiwi', 'caramel'] as const

export type ThemeId = typeof themeIds[number]

export const themes: Record<ThemeId, { paper: string, accent: string, accent2: string, line: string }> = {
  cyprus: { paper: '#F0EDE5', accent: '#004643', accent2: '#003532', line: '#e4dfd4' },
  plum: { paper: '#FFF3E6', accent: '#381932', accent2: '#2a1226', line: '#f0e0cc' },
  alabaster: { paper: '#F2EFE7', accent: '#8B004A', accent2: '#6e003b', line: '#e6e1d6' },
  mint: { paper: '#E4DDD3', accent: '#00A19B', accent2: '#007f7a', line: '#d8d0c4' },
  persia: { paper: '#F7F7FF', accent: '#27187E', accent2: '#1a0f59', line: '#e0e0f0' },
  kiwi: { paper: '#222222', accent: '#89E900', accent2: '#71D130', line: '#3a3a3a' },
  caramel: { paper: '#2E1F26', accent: '#C87740', accent2: '#b56a36', line: '#1a1216' },
}
