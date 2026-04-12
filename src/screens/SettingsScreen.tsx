import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useAppState, useAppDispatch } from '../store/AppContext';
import { useTheme } from '../theme';
import { resolveAvatarSource } from '../constants/avatars';
import type { AppSettings, ProjectData } from '../types';
import { defaultSettings } from '../types';

const INTERVAL_OPTIONS = [
  { label: '0.5 秒', value: 500 },
  { label: '1 秒', value: 1000 },
  { label: '1.5 秒', value: 1500 },
  { label: '2 秒', value: 2000 },
  { label: '3 秒', value: 3000 },
  { label: '5 秒', value: 5000 },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const state = useAppState();
  const dispatch = useAppDispatch();

  const { settings } = state;

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      dispatch({ type: 'SET_SETTINGS', payload: { ...settings, [key]: value } });
    },
    [dispatch, settings],
  );

  // ── Save project ──
  const handleSaveProject = useCallback(async () => {
    try {
      const data = {
        projectData: state.projectData,
        settings: state.settings,
        exportedAt: new Date().toISOString(),
      };
      const json = JSON.stringify(data, null, 2);
      const fileName = `thestars_project_${Date.now()}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: '保存项目',
          UTI: 'public.json',
        });
      }
      dispatch({ type: 'MARK_SAVED' });
    } catch (err: any) {
      Alert.alert('保存失败', err.message ?? '未知错误');
    }
  }, [state.projectData, state.settings, dispatch]);

  // ── Load project ──
  const handleLoadProject = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const parsed = JSON.parse(content);

      if (parsed.projectData) {
        dispatch({ type: 'SET_PROJECT_DATA', payload: parsed.projectData as ProjectData });
      }
      if (parsed.settings) {
        dispatch({ type: 'SET_SETTINGS', payload: parsed.settings as AppSettings });
      }
      dispatch({ type: 'MARK_SAVED' });
      Alert.alert('成功', '项目已加载');
    } catch (err: any) {
      Alert.alert('加载失败', err.message ?? '文件格式错误');
    }
  }, [dispatch]);

  // ── Section renderer ──
  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.accentTeal }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: c.bgPanel, borderColor: c.borderColor }]}>
        {children}
      </View>
    </View>
  );

  const renderRow = (
    label: string,
    control: React.ReactNode,
    isLast = false,
  ) => (
    <View
      style={[
        styles.settingRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderColor },
      ]}
    >
      <Text style={[styles.settingLabel, { color: c.textPrimary }]}>{label}</Text>
      <View style={styles.settingControl}>{control}</View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgDark }]}>
      <View style={[styles.header, { backgroundColor: c.bgHeader, borderBottomColor: c.borderColor }]}>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>设置</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 外观 */}
        {renderSection('外观', (
          <>
            {renderRow(
              '深色模式',
              <Switch
                value={settings.theme === 'dark'}
                onValueChange={(val) => updateSetting('theme', val ? 'dark' : 'light')}
                trackColor={{ false: c.inputBorder, true: c.primary }}
                thumbColor={settings.theme === 'dark' ? c.accentTeal : '#ccc'}
              />,
            )}
            {renderRow(
              `对比度 (${settings.contrast.toFixed(1)})`,
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                value={settings.contrast}
                onSlidingComplete={(val) => updateSetting('contrast', Math.round(val * 10) / 10)}
                minimumTrackTintColor={c.primary}
                maximumTrackTintColor={c.inputBorder}
                thumbTintColor={c.accentTeal}
              />,
              true,
            )}
          </>
        ))}

        {/* 聊天 */}
        {renderSection('聊天', (
          <>
            {renderRow(
              '显示时间戳',
              <Switch
                value={settings.showTimestamp}
                onValueChange={(val) => updateSetting('showTimestamp', val)}
                trackColor={{ false: c.inputBorder, true: c.primary }}
                thumbColor={settings.showTimestamp ? c.accentTeal : '#ccc'}
              />,
              true,
            )}
          </>
        ))}

        {/* 播放 */}
        {renderSection('播放', (
          <>
            {renderRow(
              '预览间隔',
              <View style={styles.pickerRow}>
                {INTERVAL_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pickerChip,
                      {
                        backgroundColor:
                          settings.previewInterval === opt.value
                            ? c.primary
                            : c.inputBg,
                        borderColor:
                          settings.previewInterval === opt.value
                            ? c.primary
                            : c.inputBorder,
                      },
                    ]}
                    onPress={() => updateSetting('previewInterval', opt.value)}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        {
                          color:
                            settings.previewInterval === opt.value
                              ? '#fff'
                              : c.textSecondary,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>,
              true,
            )}
          </>
        ))}

        {/* 字体 */}
        {renderSection('字体', (
          <>
            {renderRow(
              `字号 (${settings.fontSize}px)`,
              <Slider
                style={styles.slider}
                minimumValue={10}
                maximumValue={24}
                step={1}
                value={settings.fontSize}
                onSlidingComplete={(val) => updateSetting('fontSize', Math.round(val))}
                minimumTrackTintColor={c.primary}
                maximumTrackTintColor={c.inputBorder}
                thumbTintColor={c.accentTeal}
              />,
              true,
            )}
          </>
        ))}

        {/* Project save/load */}
        {renderSection('项目', (
          <>
            <View style={styles.projectRow}>
              <TouchableOpacity
                style={[styles.projectBtn, { backgroundColor: c.primary }]}
                onPress={handleSaveProject}
              >
                <Text style={styles.projectBtnText}>保存项目</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.projectBtn, { backgroundColor: c.accentTeal }]}
                onPress={handleLoadProject}
              >
                <Text style={styles.projectBtnText}>加载项目</Text>
              </TouchableOpacity>
            </View>
            {state.hasUnsavedChanges && (
              <Text style={[styles.unsavedHint, { color: c.accentOrange }]}>
                有未保存的更改
              </Text>
            )}
          </>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
    marginRight: 12,
  },
  settingControl: {
    alignItems: 'flex-end',
  },
  slider: {
    width: 160,
    height: 32,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
  },
  pickerChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  pickerChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  projectBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  projectBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  unsavedHint: {
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: 10,
  },
});
