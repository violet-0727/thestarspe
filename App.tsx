import React, { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useAppState } from './src/store/AppContext';
import { ThemeProvider, darkTheme, lightTheme, type Theme } from './src/theme';
import AppNavigation from './src/navigation';

function AppContent() {
  const { settings } = useAppState();
  const targetTheme = settings.theme === 'light' ? lightTheme : darkTheme;

  const [activeTheme, setActiveTheme] = useState<Theme>(targetTheme);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setActiveTheme(targetTheme);
      return;
    }

    // Animate: fade out -> switch theme -> fade in
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveTheme(targetTheme);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [targetTheme]);

  return (
    <ThemeProvider theme={activeTheme}>
      <StatusBar style={activeTheme.dark ? 'light' : 'dark'} />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <AppNavigation />
      </Animated.View>
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
