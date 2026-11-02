import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('voicedoc_theme_milky');
      if (stored) return stored === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('voicedoc_theme_milky', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('voicedoc_theme_milky', 'milky');
    }
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark((prev) => !prev)}
      className="p-2 rounded-xl bg-[#F4EFE4] dark:bg-slate-800 border border-[#E6DEC8] dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-[#EBE3D3] dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label={isDark ? 'Switch to Milky mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to Milky mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
    </button>
  );
};
