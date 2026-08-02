'use client'

import { useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

import { Segmented } from '@/components/ui/segmented'

export type Theme = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'hadid.theme'

/**
 * Applies the theme by stamping `data-theme` on <html>. `system` removes the
 * attribute entirely so the CSS media query takes over — that is why the
 * token blocks in globals.css are written as "media query, unless overridden"
 * rather than as three mutually exclusive classes.
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

/**
 * Inlined in <head> before paint. Without this the page renders in the OS
 * theme for one frame and then snaps to the stored preference — a white flash
 * on every cold load for anyone using dark mode.
 */
export const themeScript = `
(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();
`

/**
 * The theme lives in the DOM, not in React state — `themeScript` already set
 * it before React existed. So this reads through `useSyncExternalStore` rather
 * than mirroring it into state inside an effect, which would mean rendering
 * once with the wrong value and then correcting it.
 *
 * `getServerSnapshot` returns 'system' because the server cannot know the
 * preference; React swaps in the client value immediately after hydration.
 */
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

function getSnapshot(): Theme {
  const attr = document.documentElement.getAttribute('data-theme')
  return attr === 'dark' || attr === 'light' ? attr : 'system'
}

const getServerSnapshot = (): Theme => 'system'

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private browsing and storage-blocked contexts. The theme still applies
      // for this session; it just will not survive a reload.
    }
    applyTheme(next)
    for (const listener of listeners) listener()
  }

  return { theme, setTheme }
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <Segmented
      value={theme}
      onChange={setTheme}
      options={[
        { value: 'system', label: 'System' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ]}
    />
  )
}

export const themeIcons = { system: Monitor, light: Sun, dark: Moon } as const
