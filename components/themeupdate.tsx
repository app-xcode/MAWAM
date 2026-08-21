import { useEffect } from 'react';

export default function ThemeMetaUpdater({ setTheme }: any) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const setThemeMeta = (theme: 'dark' | 'light') => {
      const body = document.querySelector('body');
      const themeColor = document.querySelector('meta[name="theme-color"]');
      const statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');

      if (themeColor) themeColor.setAttribute('content', theme === 'dark' ? '#151718' : '#ffffff');
      if (statusBar) statusBar.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default');
      if (body) body.style.backgroundColor = theme === 'dark' ? '#151718' : '#ffffff';
      if (body) body.dataset.theme = theme;
    };

    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => setThemeMeta(setTheme || (darkQuery.matches ? 'dark' : 'light'));

    applyTheme();
    darkQuery.addEventListener('change', applyTheme);

    return () => {
      darkQuery.removeEventListener('change', applyTheme);
    };
  }, [setTheme]);

  return null;
}
