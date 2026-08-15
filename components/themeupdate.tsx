export default function ThemeMetaUpdater({setTheme}:any|null) {
  const setThemeMeta = (theme: 'dark' | 'light') => {
    const body = document.querySelector('body');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const statusBar = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    );

    if (themeColor) themeColor.setAttribute("content", theme === "dark" ? "#151718" : "#ffffff");
    if (statusBar)
      statusBar.setAttribute(
        "content",
        theme === "dark" ? "black-translucent" : "default"
      );
      if(body) body.style.backgroundColor = theme === 'dark' ? '#151718':'#ffffff';
  };

  // cek tema awal
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  setThemeMeta(setTheme || (darkQuery.matches ? "dark" : "light"));

  // listen perubahan tema
  const listener = (e: any) => setThemeMeta(setTheme || (e.matches ? "dark" : "light"));
  darkQuery.addEventListener("change", listener);

  darkQuery.removeEventListener("change", listener)

  return null; // component ini nggak render apa-apa
}