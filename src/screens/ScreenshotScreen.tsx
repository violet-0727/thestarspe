import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { useAppState, useAppDispatch } from '../store/AppContext';
import { useTheme } from '../theme';
import { resolveAvatarSource } from '../constants/avatars';
import { getEmojiSource } from '../constants/emojis';
import type { ChatMessage, Contact } from '../types';

const EMOJI_REGEX = /^\[emoji:(.+?)\]$/;

function isEmojiContent(content: string | undefined): string | null {
  if (!content) return null;
  const match = content.match(EMOJI_REGEX);
  return match ? match[1] : null;
}

function renderContentWithEmoji(content: string | undefined, textStyle: any) {
  if (!content) return null;
  const emojiFile = isEmojiContent(content);
  if (emojiFile) {
    const src = getEmojiSource(emojiFile);
    if (src) {
      return <Image source={src} style={{ width: 80, height: 80 }} resizeMode="contain" />;
    }
  }
  const imgMatch = content.match(/^\[image:(.+?)\]$/);
  if (imgMatch) {
    return (
      <Image
        source={{ uri: imgMatch[1] }}
        style={{ width: 180, height: 140, borderRadius: 8 }}
        resizeMode="cover"
      />
    );
  }
  return <Text style={textStyle}>{content}</Text>;
}

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
  const [saving, setSaving] = useState(false);
  const captureViewRef = useRef<View>(null);

  const toggleItem = useCallback(
    (index: number) => {
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

  // ── Selected messages for capture ──
  const selectedMessages = useMemo(() => {
    const sorted = Array.from(selected).sort((a, b) => a - b);
    return sorted.map((i) => messages[i]).filter(Boolean);
  }, [selected, messages]);

  // ── Save as image to photo album ──
  const handleSaveToAlbum = useCallback(async () => {
    if (selected.size === 0) {
      Alert.alert('提示', '请先选择要截取的消息');
      return;
    }

    setSaving(true);

    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相册权限才能保存图片');
        setSaving(false);
        return;
      }

      // Wait a frame for the capture view to render
      await new Promise((r) => setTimeout(r, 300));

      // Capture the preview view as image
      const uri = await captureRef(captureViewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Save to photo album
      const asset = await MediaLibrary.createAssetAsync(uri);
      Alert.alert('保存成功', '聊天截图已保存到相册');
    } catch (err: any) {
      Alert.alert('保存失败', err.message ?? '未知错误');
    } finally {
      setSaving(false);
    }
  }, [selected]);

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

  // ── Render a message for the capture view (no checkboxes) ──
  const renderCaptureMessage = (item: ChatMessage, index: number) => {
    if (item.type === 'system') {
      return (
        <View key={index} style={styles.captureSystemRow}>
          <Text style={[styles.systemText, { color: c.textMuted }]}>
            {item.content}
          </Text>
        </View>
      );
    }

    if (item.type === 'choice') {
      return (
        <View key={index} style={[styles.captureChoiceCard, { backgroundColor: c.bgModal, borderColor: c.borderColor }]}>
          <Text style={[styles.choiceLabel, { color: c.accentOrange }]}>
            {item.title}
          </Text>
          {item.options?.map((opt, i) => (
            <View key={i} style={[styles.captureChoiceOption, { borderColor: c.borderColor }]}>
              <Text style={[styles.choiceOpt, { color: c.textPrimary }]}>{opt}</Text>
            </View>
          ))}
        </View>
      );
    }

    const isSelf = item.sender === 'self';
    return (
      <View key={index} style={[styles.captureMsgRow, isSelf && styles.captureMsgRowSelf]}>
        {!isSelf && (
          <Image
            source={item.avatar ? resolveAvatarSource(item.avatar) : contactAvatar}
            style={styles.captureMsgAvatar}
          />
        )}
        <View style={[styles.captureBubble, isSelf ? { backgroundColor: c.bubbleSelf } : { backgroundColor: c.bubbleOther }]}>
          {!isSelf && item.senderName && (
            <Text style={[styles.captureSenderName, { color: c.accentTeal }]}>
              {item.senderName}
            </Text>
          )}
          {renderContentWithEmoji(item.content, [styles.msgText, { color: c.textPrimary }])}
          {item.time && (
            <Text style={[styles.captureTimeText, { color: c.textMuted }]}>
              {item.time}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // ── Render a selectable item in the list ──
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
            [{'\u9009\u9879'}] {item.title}
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
            {renderContentWithEmoji(item.content, [
              styles.msgText,
              { color: c.textPrimary },
              isSelf && styles.msgTextSelf,
            ])}
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
        <TouchableOpacity
          style={[styles.toolBtn, { backgroundColor: c.accentTeal, opacity: saving ? 0.5 : 1 }]}
          onPress={handleSaveToAlbum}
          disabled={saving}
        >
          <Text style={styles.toolBtnText}>{saving ? '保存中...' : '保存到相册'}</Text>
        </TouchableOpacity>
      </View>

      {/* Messages list for selection */}
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

      {/* Hidden capture view - renders selected messages as chat UI for screenshot */}
      {selected.size > 0 && (
        <View style={styles.captureWrapper}>
          <View
            ref={captureViewRef}
            collapsable={false}
            style={[styles.captureContainer, { backgroundColor: c.bgDark }]}
          >
            {/* Capture header */}
            <View style={[styles.captureHeader, { backgroundColor: c.bgHeader, borderBottomColor: c.borderColor }]}>
              <Image source={contactAvatar} style={styles.captureHeaderAvatar} />
              <Text style={[styles.captureHeaderName, { color: c.textPrimary }]}>
                {contact.name}
              </Text>
            </View>
            {/* Capture messages */}
            <View style={styles.captureMessages}>
              {selectedMessages.map((msg, i) => renderCaptureMessage(msg, i))}
            </View>
            {/* Watermark */}
            <View style={styles.captureFooter}>
              <Text style={[styles.captureFooterText, { color: c.textMuted }]}>
                Heart Link - 星塔旅人
              </Text>
            </View>
          </View>
        </View>
      )}
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

  // ─── Capture view (offscreen) ───
  captureWrapper: {
    position: 'absolute',
    left: -9999,
    top: 0,
  },
  captureContainer: {
    width: 390,
    padding: 0,
  },
  captureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  captureHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  captureHeaderName: {
    fontSize: 16,
    fontWeight: '700',
  },
  captureMessages: {
    padding: 12,
  },
  captureSystemRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  captureChoiceCard: {
    marginVertical: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  captureChoiceOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 4,
  },
  captureMsgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  captureMsgRowSelf: {
    flexDirection: 'row-reverse',
  },
  captureMsgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  captureBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 12,
  },
  captureSenderName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  captureTimeText: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  captureFooter: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 12,
  },
  captureFooterText: {
    fontSize: 10,
  },
});
