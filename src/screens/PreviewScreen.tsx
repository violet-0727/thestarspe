import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
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

type PlaybackState = 'idle' | 'playing' | 'paused';

export default function PreviewScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const state = useAppState();
  const dispatch = useAppDispatch();

  const { activeContactId, projectData, settings } = state;
  const contact: Contact | undefined = useMemo(
    () => projectData.contacts.find((ct) => ct.id === activeContactId),
    [projectData.contacts, activeContactId],
  );
  const allMessages: ChatMessage[] = useMemo(
    () => (activeContactId ? projectData.chats[activeContactId] ?? [] : []),
    [projectData.chats, activeContactId],
  );

  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [visibleCount, setVisibleCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const visibleMessages = useMemo(
    () => allMessages.slice(0, visibleCount),
    [allMessages, visibleCount],
  );

  const progress =
    allMessages.length > 0 ? visibleCount / allMessages.length : 0;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPlayback = useCallback(() => {
    clearTimer();
    if (visibleCount >= allMessages.length) {
      setVisibleCount(0);
    }
    setPlaybackState('playing');
  }, [clearTimer, visibleCount, allMessages.length]);

  const pausePlayback = useCallback(() => {
    clearTimer();
    setPlaybackState('paused');
  }, [clearTimer]);

  const stopPlayback = useCallback(() => {
    clearTimer();
    setVisibleCount(0);
    setPlaybackState('idle');
  }, [clearTimer]);

  // Advance messages while playing
  useEffect(() => {
    if (playbackState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= allMessages.length) {
          clearTimer();
          setPlaybackState('idle');
          return prev;
        }
        return prev + 1;
      });
    }, settings.previewInterval);

    return clearTimer;
  }, [playbackState, allMessages.length, settings.previewInterval, clearTimer]);

  // Scroll to bottom when new messages appear
  useEffect(() => {
    if (visibleCount > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [visibleCount]);

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

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.type === 'system') {
      return (
        <View style={styles.systemRow}>
          <Text style={[styles.systemText, { color: c.textMuted }]}>
            {item.content}
          </Text>
        </View>
      );
    }

    if (item.type === 'choice') {
      return (
        <View style={[styles.choiceCard, { backgroundColor: c.bgModal, borderColor: c.borderColor }]}>
          <Text style={[styles.choiceTitle, { color: c.accentOrange }]}>
            {item.title}
          </Text>
          {item.options?.map((opt, i) => (
            <View key={i} style={[styles.choiceOption, { borderColor: c.borderColor }]}>
              <Text style={[styles.choiceOptionText, { color: c.textPrimary }]}>
                {opt}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    const isSelf = item.sender === 'self';

    return (
      <View style={[styles.messageRow, isSelf && styles.messageRowSelf]}>
        {!isSelf && (
          <Image
            source={item.avatar ? resolveAvatarSource(item.avatar) : contactAvatar}
            style={styles.msgAvatar}
          />
        )}
        <View
          style={[
            styles.bubble,
            isSelf
              ? { backgroundColor: c.bubbleSelf }
              : { backgroundColor: c.bubbleOther },
          ]}
        >
          {!isSelf && item.senderName && (
            <Text style={[styles.senderName, { color: c.accentTeal }]}>
              {item.senderName}
            </Text>
          )}
          {renderContentWithEmoji(item.content, [styles.msgText, { color: c.textPrimary }])}
          {settings.showTimestamp && item.time && (
            <Text style={[styles.timeText, { color: c.textMuted }]}>
              {item.time}
            </Text>
          )}
        </View>
      </View>
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
              {visibleCount}/{allMessages.length} 条消息
            </Text>
          </View>
        </View>
        <View style={styles.controls}>
          {playbackState === 'playing' ? (
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: c.accentOrange }]}
              onPress={pausePlayback}
            >
              <Text style={styles.controlText}>暂停</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: c.accentTeal }]}
              onPress={startPlayback}
            >
              <Text style={styles.controlText}>
                {playbackState === 'paused' ? '继续' : '播放'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: c.accentPink }]}
            onPress={stopPlayback}
          >
            <Text style={styles.controlText}>停止</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: c.inputBg }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: c.accentTeal, width: `${progress * 100}%` },
          ]}
        />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={visibleMessages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: c.textMuted }]}>
              点击播放开始预览
            </Text>
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
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  controlText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 3,
  },
  progressFill: {
    height: 3,
  },
  messageList: {
    padding: 12,
    paddingBottom: 24,
  },
  systemRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  systemText: {
    fontSize: 12,
  },
  choiceCard: {
    marginVertical: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  choiceOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 4,
  },
  choiceOptionText: {
    fontSize: 14,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  messageRowSelf: {
    flexDirection: 'row-reverse',
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  bubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 12,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
});
