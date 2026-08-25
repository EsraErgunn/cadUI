import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'starcad.theme'
const DARK_CLASS = 'dark'
const DEFAULT_THEME: Theme = 'light'

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : DEFAULT_THEME
  } catch {
    // Gizli sekmede / depolama izni kapalıyken localStorage erişimi hata atar;
    // tema yine çalışsın, sadece kalıcı olmasın.
    return DEFAULT_THEME
  }
}

/* Tema tek bir modül durumunda yaşıyor: birden çok bileşen useTheme çağırsa da
   hepsi aynı değeri görür (her biri kendi useState'ini tutsaydı ayrışırlardı).
   Kalıcı proje verisi olmadığı için cadStore'a da girmez. */
let currentTheme: Theme = readStoredTheme()
const listeners = new Set<() => void>()

function applyThemeClass(theme: Theme): void {
  document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark')
}

/** React ağacı kurulmadan çağrılır — ilk boyamada yanlış tema görünmesin. */
export function initTheme(): void {
  applyThemeClass(currentTheme)
}

export function setTheme(theme: Theme): void {
  if (theme === currentTheme) return

  currentTheme = theme
  applyThemeClass(theme)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Bkz. readStoredTheme: depolama yoksa tema oturum içinde çalışmaya devam eder.
  }
  for (const listener of listeners) listener()
}

export function toggleTheme(): void {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark')
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): Theme {
  return currentTheme
}

export function useTheme(): { theme: Theme; toggleTheme: () => void; setTheme: (theme: Theme) => void } {
  const theme = useSyncExternalStore(subscribe, getSnapshot)
  return { theme, toggleTheme, setTheme }
}
