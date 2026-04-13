import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppState, useAppDispatch } from '../store/AppContext';
import { useTheme } from '../theme';
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

const PROJECTS_DIR = `${FileSystem.documentDirectory}projects/`;

interface SavedProject {
  name: string;
  uri: string;
  date: string;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const state = useAppState();
  const dispatch = useAppDispatch();

  const { settings } = state;

  const [loadModalVisible, setLoadModalVisible] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      dispatch({ type: 'SET_SETTINGS', payload: { ...settings, [key]: value } });
    },
    [dispatch, settings],
  );

  // ── Ensure projects directory exists ──
  const ensureProjectsDir = useCallback(async () => {
    const info = await FileSystem.getInfoAsync(PROJECTS_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(PROJECTS_DIR, { intermediates: true });
    }
  }, []);

  // ── Save project to app directory ──
  const handleSaveProject = useCallback(async () => {
    try {
      await ensureProjectsDir();
      const data = {
        projectData: state.projectData,
        settings: state.settings,
        exportedAt: new Date().toISOString(),
      };
      const json = JSON.stringify(data, null, 2);
      const now = new Date();
      const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
      const fileName = `project_${dateStr}.json`;
      const filePath = `${PROJECTS_DIR}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      dispatch({ type: 'MARK_SAVED' });
      Alert.alert('保存成功', `项目已保存为 ${fileName}`);
    } catch (err: any) {
      Alert.alert('保存失败', err.message ?? '未知错误');
    }
  }, [state.projectData, state.settings, dispatch, ensureProjectsDir]);

  // ── List saved projects ──
  const loadProjectList = useCallback(async () => {
    setLoadingProjects(true);
    try {
      await ensureProjectsDir();
      const files = await FileSystem.readDirectoryAsync(PROJECTS_DIR);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      const projects: SavedProject[] = [];
      for (const file of jsonFiles) {
        const uri = `${PROJECTS_DIR}${file}`;
        try {
          const info = await FileSystem.getInfoAsync(uri);
          const modTime = (info as any).modificationTime;
          const date = modTime
            ? new Date(modTime * 1000).toLocaleString('zh-CN')
            : '';
          projects.push({ name: file, uri, date });
        } catch {
          projects.push({ name: file, uri, date: '' });
        }
      }

      // Sort by name descending (newest first since names contain timestamps)
      projects.sort((a, b) => b.name.localeCompare(a.name));
      setSavedProjects(projects);
    } catch (err: any) {
      Alert.alert('读取失败', err.message ?? '无法读取项目列表');
    } finally {
      setLoadingProjects(false);
    }
  }, [ensureProjectsDir]);

  // ── Open load modal ──
  const handleOpenLoadModal = useCallback(async () => {
    setLoadModalVisible(true);
    await loadProjectList();
  }, [loadProjectList]);

  // ── Load a specific project ──
  const handleLoadProject = useCallback(async (project: SavedProject) => {
    try {
      const content = await FileSystem.readAsStringAsync(project.uri, {
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
      setLoadModalVisible(false);
      Alert.alert('成功', `已加载 ${project.name}`);
    } catch (err: any) {
      Alert.alert('加载失败', err.message ?? '文件格式错误');
    }
  }, [dispatch]);

  // ── Delete a saved project ──
  const handleDeleteProject = useCallback((project: SavedProject) => {
    Alert.alert(
      '删除项目',
      `确定要删除 ${project.name} 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(project.uri, { idempotent: true });
              await loadProjectList();
            } catch (err: any) {
              Alert.alert('删除失败', err.message ?? '未知错误');
            }
          },
        },
      ],
    );
  }, [loadProjectList]);

  // ── Format file name for display ──
  const formatProjectName = (name: string): string => {
    // project_20260413_143025.json -> 2026-04-13 14:30:25
    const match = name.match(/project_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.json/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
    }
    return name.replace('.json', '');
  };

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
                onPress={handleOpenLoadModal}
              >
                <Text style={styles.projectBtnText}>加载项目</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.projectHint, { color: c.textMuted }]}>
              项目自动保存在应用目录中，无需手动操作
            </Text>
            {state.hasUnsavedChanges && (
              <Text style={[styles.unsavedHint, { color: c.accentOrange }]}>
                有未保存的更改
              </Text>
            )}
          </>
        ))}
      </ScrollView>

      {/* ═══════════════════ Load Project Modal ═══════════════════ */}
      <Modal
        visible={loadModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLoadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgModal, borderColor: c.borderColor }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>
              加载项目
            </Text>

            {loadingProjects ? (
              <View style={styles.modalLoading}>
                <Text style={[styles.modalLoadingText, { color: c.textMuted }]}>
                  读取中...
                </Text>
              </View>
            ) : savedProjects.length === 0 ? (
              <View style={styles.modalLoading}>
                <Text style={[styles.modalLoadingText, { color: c.textMuted }]}>
                  暂无已保存的项目
                </Text>
              </View>
            ) : (
              <FlatList
                data={savedProjects}
                keyExtractor={(item) => item.uri}
                style={styles.projectList}
                renderItem={({ item }) => (
                  <View style={[styles.projectItem, { borderBottomColor: c.borderColor }]}>
                    <TouchableOpacity
                      style={styles.projectItemInfo}
                      activeOpacity={0.6}
                      onPress={() => handleLoadProject(item)}
                    >
                      <Text style={[styles.projectItemName, { color: c.textPrimary }]}>
                        {formatProjectName(item.name)}
                      </Text>
                      <Text style={[styles.projectItemFile, { color: c.textMuted }]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.projectDeleteBtn, { backgroundColor: c.accentPink + '20' }]}
                      onPress={() => handleDeleteProject(item)}
                    >
                      <Text style={[styles.projectDeleteText, { color: c.accentPink }]}>
                        删除
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: c.inputBg, borderColor: c.borderColor }]}
              activeOpacity={0.7}
              onPress={() => setLoadModalVisible(false)}
            >
              <Text style={[styles.modalCloseBtnText, { color: c.textSecondary }]}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 8,
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
  projectHint: {
    textAlign: 'center',
    fontSize: 11,
    paddingBottom: 6,
  },
  unsavedHint: {
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: 10,
  },

  // ─── Load Project Modal ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    fontSize: 14,
  },
  projectList: {
    maxHeight: 360,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  projectItemInfo: {
    flex: 1,
  },
  projectItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  projectItemFile: {
    fontSize: 11,
    marginTop: 2,
  },
  projectDeleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  projectDeleteText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
