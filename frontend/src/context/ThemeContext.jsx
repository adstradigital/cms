'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light'); // light | dark
  const [colorTheme, setColorTheme] = useState('slate'); // slate | green | blue | red | purple | orange

  // Apply themes to body
  useEffect(() => {
    const body = document.body;
    
    // Theme (Light/Dark)
    body.setAttribute('data-theme', theme);
    
    // Color Theme — slate is the default in variables.css, others override
    const colorClasses = ['theme-green', 'theme-blue', 'theme-red', 'theme-purple', 'theme-orange'];
    body.classList.remove(...colorClasses);
    
    if (colorTheme !== 'slate') {
      body.classList.add(`theme-${colorTheme}`);
    }
  }, [theme, colorTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
