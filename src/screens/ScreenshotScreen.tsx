import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAppState, useAppDispatch } from '../store/AppContext';
import { useTheme } from '../theme';
import { resolveAvatarSource } from '../constants/avatars';
import type { ChatMessage, Contact } from '../types';

export default function ScreenshotScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const state = useAppState();
  const dispatch = useAppDispatch();

  const { activeContactId, projectData, settings } = state;
  const contact: Contact | undefined = useMemo(
    () => projectData.contacts.find((ct) => ct.id === activeContactId),
    [projectData.contacts, activeContactId],
  );
  const messages: ChatMessage[] = useMemo(
    () => (activeContactId ? projectData.chats[activeContactId] ?? [] : []),
    [projectData.chats, activeContactId],
  );

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeStart, setRangeStart] = useState<number | null>(null);

  const toggleItem = useCallback(
    (index: number) => {
      // Range selection mode
      if (rangeStart !== null) {
        const lo = Math.min(rangeStart, index);
        const hi = Math.max(rangeStart, index);
        setSelected((prev) => {
          const next = new Set(prev);
          for (let i = lo; i <= hi; i++) next.add(i);
          return next;
        });
        setRangeStart(null);
        return;
      }
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
    },
    [rangeStart],
  );

  const selectAll = useCallback(() => {
    setSelected(new Set(messages.map((_, i) => i)));
  }, [messages]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setRangeStart(null);
  }, []);

  const startRange = useCallback(() => {
    if (selected.size === 0) {
      Alert.alert('提示', '请先选中起始消息');
      return;
    }
    const sorted = Array.from(selected).sort((a, b) => a - b);
    setRangeStart(sorted[sorted.length - 1]);
    Alert.alert('范围选择', '点击结束位置的消息来完成范围选择');
  }, [selected]);

  const handleSave = useCallback(async () => {
    if (selected.size === 0) {
      Alert.alert('提示', '请先选择要导出的消息');
      return;
    }

    const sorted = Array.from(selected).sort((a, b) => a - b);
    const exported = sorted.map((i) => messages[i]);
    const json = JSON.stringify(
      {
        contact: contact
          ? { id: contact.id, name: contact.name }
          : null,
        messages: exported,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );

    try {
      const fileName = `chat_export_${Date.now()}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: '导出聊天记录',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('完成', '文件已保存到缓存目录');
      }
    } catch (err: any) {
      Alert.alert('导出失败', err.message ?? '未知错误');
    }
  }, [selected, messages, contact]);

  // ── No active contact ──
  if (!activeContactId || !contact) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bgDark }]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            请先选择一个对话
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const contactAvatar = resolveAvatarSource(contact.avatar);

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isSelected = selected.has(index);

    let content: React.ReactNode;

    if (item.type === 'system') {
      content = (
        <Text style={[styles.systemText, { color: c.textMuted }]}>
          {item.content}
        </Text>
      );
    } else if (item.type === 'choice') {
      content = (
        <View>
          <Text style={[styles.choiceLabel, { color: c.accentOrange }]}>
            [选项] {item.title}
          </Text>
          {item.options?.map((opt, i) => (
            <Text key={i} style={[styles.choiceOpt, { color: c.textSecondary }]}>
              {'\u2022'} {opt}
            </Text>
          ))}
        </View>
      );
    } else {
      const isSelf = item.sender === 'self';
      content = (
        <View style={styles.msgContent}>
          {!isSelf && (
            <Image
              source={item.avatar ? resolveAvatarSource(item.avatar) : contactAvatar}
              style={styles.msgAvatar}
            />
          )}
          <View style={{ flex: 1 }}>
            {!isSelf && item.senderName && (
              <Text style={[styles.senderName, { color: c.accentTeal }]}>
                {item.senderName}
              </Text>
            )}
            <Text
              style={[
                styles.msgText,
                { color: c.textPrimary },
                isSelf && styles.msgTextSelf,
              ]}
            >
              {item.content}
            </Text>
            {item.time && (
              <Text
                style={[
                  styles.timeText,
                  { color: c.textMuted },
                  isSelf && styles.timeTextSelf,
                ]}
              >
                {item.time}
              </Text>
            )}
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.row,
          { borderBottomColor: c.borderColor },
          isSelected && { backgroundColor: c.primary + '18' },
        ]}
        activeOpacity={0.6}
        onPress={() => toggleItem(index)}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: isSelected ? c.accentTeal : c.textMuted,
              backgroundColor: isSelected ? c.accentTeal : 'transparent',
            },
          ]}
        >
          {isSelected && <Text style={styles.checkmark}>{'\u2713'}</Text>}
        </View>
        <View style={styles.rowContent}>{content}</View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgDark }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.bgHeader, borderBottomColor: c.borderColor }]}>
        <View style={styles.headerInfo}>
          <Image source={contactAvatar} style={styles.headerAvatar} />
          <View>
            <Text style={[styles.headerName, { color: c.textPrimary }]}>
              {contact.name}
            </Text>
            <Text style={[styles.headerSub, { color: c.textMuted }]}>
              已选 {selected.size}/{messages.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: c.bgPanel, borderBottomColor: c.borderColor }]}>
        <TouchableOpacity style={[styles.toolBtn, { backgroundColor: c.primary }]} onPress={selectAll}>
          <Text style={styles.toolBtnText}>全选</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolBtn, { backgroundColor: c.inputBg, borderColor: c.inputBorder, borderWidth: 1 }]} onPress={clearSelection}>
          <Text style={[styles.toolBtnText, { color: c.textSecondary }]}>清除</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toolBtn,
            {
              backgroundColor: rangeStart !== null ? c.accentOrange : c.inputBg,
              borderColor: c.inputBorder,
              borderWidth: rangeStart !== null ? 0 : 1,
            },
          ]}
          onPress={startRange}
        >
          <Text
            style={[
              styles.toolBtnText,
              { color: rangeStart !== null ? '#fff' : c.textSecondary },
            ]}
          >
            范围
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolBtn, { backgroundColor: c.accentTeal }]} onPress={handleSave}>
          <Text style={styles.toolBtnText}>保存</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: c.textMuted }]}>暂无消息</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 11,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  toolBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  toolBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  rowContent: {
    flex: 1,
  },
  systemText: {
    fontSize: 12,
    textAlign: 'center',
  },
  choiceLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  choiceOpt: {
    fontSize: 13,
    marginLeft: 8,
    marginTop: 2,
  },
  msgContent: {
    flexDirection: 'row',
    gap: 8,
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgTextSelf: {
    textAlign: 'right',
  },
  timeText: {
    fontSize: 10,
    marginTop: 2,
  },
  timeTextSelf: {
    textAlign: 'right',
  },
});
