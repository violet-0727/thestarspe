import React, { createContext, useContext } from 'react';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;

  accentTeal: string;
  accentOrange: string;
  accentPink: string;

  bgDark: string;
  bgPanel: string;
  bgChat: string;
  bgHeader: string;
  bgModal: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  borderColor: string;

  bubbleSelf: string;
  bubbleOther: string;

  inputBg: string;
  inputBorder: string;

  itemHover: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

const sharedColors = {
  primary: '#4B73D3',
  primaryDark: '#3A5CB8',
  primaryLight: '#6B8FE8',

  accentTeal: '#3ECDC6',
  accentOrange: '#F5A623',
  accentPink: '#E84C88',

  bubbleSelf: '#4B73D3',
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    ...sharedColors,

    bgDark: '#1A1E2E',
    bgPanel: 'rgba(20, 25, 45, 0.85)',
    bgChat: 'rgba(15, 20, 38, 0.75)',
    bgHeader: 'rgba(15, 20, 40, 0.5)',
    bgModal: '#1E2440',

    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.4)',

    borderColor: 'rgba(75, 115, 211, 0.3)',

    bubbleOther: 'rgba(255, 255, 255, 0.1)',

    inputBg: 'rgba(255, 255, 255, 0.06)',
    inputBorder: 'rgba(255, 255, 255, 0.1)',

    itemHover: 'rgba(255, 255, 255, 0.06)',
  },
};

export const lightTheme: Theme = {
  dark: false,
  colors: {
    ...sharedColors,

    bgDark: '#E8EBF0',
    bgPanel: 'rgba(235, 238, 245, 0.95)',
    bgChat: 'rgba(240, 242, 248, 0.92)',
    bgHeader: 'rgba(240, 242, 250, 0.8)',
    bgModal: '#F0F2F8',

    textPrimary: '#1A1E2E',
    textSecondary: 'rgba(26, 30, 46, 0.7)',
    textMuted: 'rgba(26, 30, 46, 0.4)',

    borderColor: 'rgba(75, 115, 211, 0.2)',

    bubbleOther: 'rgba(0, 0, 0, 0.06)',

    inputBg: 'rgba(0, 0, 0, 0.04)',
    inputBorder: 'rgba(0, 0, 0, 0.1)',

    itemHover: 'rgba(0, 0, 0, 0.04)',
  },
};

export const ThemeContext = createContext<Theme>(darkTheme);

export interface ThemeProviderProps {
  theme?: Theme;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  theme = darkTheme,
  children,
}) => {
  return React.createElement(ThemeContext.Provider, { value: theme }, children);
};

export const useTheme = (): Theme => {
  return useContext(ThemeContext);
};
