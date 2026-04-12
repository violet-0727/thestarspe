import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useAppState } from './src/store/AppContext';
import { ThemeProvider, darkTheme, lightTheme } from './src/theme';
import AppNavigation from './src/navigation';

function AppContent() {
  const { settings } = useAppState();
  const theme = settings.theme === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeProvider theme={theme}>
      <StatusBar style={settings.theme === 'light' ? 'dark' : 'light'} />
      <AppNavigation />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}
