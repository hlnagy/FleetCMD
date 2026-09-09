"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'gray' | 'system';
export type ResolvedTheme = 'light' | 'dark' | 'gray';
export type FontSize = 'compact' | 'standard' | 'large';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  fontSize: FontSize;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'light',
  fontSize: 'standard',
  setTheme: () => {},
  setFontSize: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [fontSize, setFontSizeState] = useState<FontSize>('standard');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem('fleetcmd_theme') as Theme | null;
      if (savedTheme && ['light', 'dark', 'gray', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme);
      }

      const savedFontSize = localStorage.getItem('fleetcmd_font_size') as FontSize | null;
      if (savedFontSize && ['compact', 'standard', 'large'].includes(savedFontSize)) {
        setFontSizeState(savedFontSize);
      }
    } catch (e) {
      console.warn('Nu s-a putut citi configurarea de aspect din localStorage:', e);
    }
  }, []);

  // Aplicare mărime font pe html
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute('data-font-size', fontSize);
  }, [fontSize, mounted]);

  // Aplicare temă
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let active: ResolvedTheme = 'light';
      if (theme === 'system') {
        active = mediaQuery.matches ? 'dark' : 'light';
      } else {
        active = theme;
      }
      setResolvedTheme(active);

      const root = document.documentElement;
      root.classList.remove('dark', 'gray');

      if (active === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else if (active === 'gray') {
        root.classList.add('gray');
        root.setAttribute('data-theme', 'gray');
      } else {
        root.setAttribute('data-theme', 'light');
      }
    };

    applyTheme();

    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('fleetcmd_theme', newTheme);
    } catch (e) {}
  };

  const setFontSize = (newSize: FontSize) => {
    setFontSizeState(newSize);
    try {
      localStorage.setItem('fleetcmd_font_size', newSize);
    } catch (e) {}
  };

  const toggleTheme = () => {
    if (resolvedTheme === 'light') setTheme('gray');
    else if (resolvedTheme === 'gray') setTheme('dark');
    else setTheme('light');
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, fontSize, setTheme, setFontSize, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
