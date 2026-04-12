import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Circle, Polyline, Line, Rect } from 'react-native-svg';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { useAppState, useAppDispatch } from '../store/AppContext';
import { useTheme } from '../theme';
import { resolveAvatarSource, AVAILABLE_AVATAR_NAMES, getAvatarSource } from '../constants/avatars';
import { EMOJI_LIST, getEmojiSource } from '../constants/emojis';
import { ANNOUNCEMENTS } from '../constants/announcements';
import type { Contact, ChatMessage } from '../types';
import type { RootStackParamList } from '../navigation';

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatNavProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

const EMOJI_REGEX = /^\[emoji:(.+?)\]$/;
const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Icon helpers ────────────────────────────────────────────────────────────

function IconBack({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Polyline points="15,18 9,12 15,6" />
    </Svg>
  );
}

function IconPlus({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Line x1={5} y1={12} x2={19} y2={12} />
    </Svg>
  );
}

function IconTrash({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Polyline points="3,6 5,6 21,6" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Svg>
  );
}

function IconSettings({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

function IconImage({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
      <Circle cx={8.5} cy={8.5} r={1.5} />
      <Polyline points="21,15 16,10 5,21" />
    </Svg>
  );
}

function IconClock({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Circle cx={12} cy={12} r={10} />
      <Polyline points="12,6 12,12 16,14" />
    </Svg>
  );
}

function IconSmile({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <Line x1={9} y1={9} x2={9.01} y2={9} />
      <Line x1={15} y1={9} x2={15.01} y2={9} />
    </Svg>
  );
}

function IconSend({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <Path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </Svg>
  );
}

function IconMessageSquare({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

function IconBranch({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Line x1={6} y1={3} x2={6} y2={15} />
      <Circle cx={18} cy={6} r={3} />
      <Circle cx={6} cy={18} r={3} />
      <Path d="M18 9a9 9 0 0 1-9 9" />
    </Svg>
  );
}

function IconX({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Line x1={18} y1={6} x2={6} y2={18} />
      <Line x1={6} y1={6} x2={18} y2={18} />
    </Svg>
  );
}

function IconMinus({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Line x1={5} y1={12} x2={19} y2={12} />
    </Svg>
  );
}

function IconChevronDown({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Polyline points="6,9 12,15 18,9" />
    </Svg>
  );
}

function IconChevronUp({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Polyline points="6,15 12,9 18,15" />
    </Svg>
  );
}

function IconExport({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Polyline points="7,10 12,15 17,10" />
      <Line x1={12} y1={15} x2={12} y2={3} />
    </Svg>
  );
}

function IconCheck({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Polyline points="20,6 9,17 4,12" />
    </Svg>
  );
}

function IconSquare({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    </Svg>
  );
}

function IconCheckSquare({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Polyline points="9,11 12,14 22,4" />
      <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </Svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isEmojiContent(content: string | undefined): string | null {
  if (!content) return null;
  const match = content.match(EMOJI_REGEX);
  return match ? match[1] : null;
}

function getCurrentTimeString(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ChatScreen() {
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation<ChatNavProp>();
  const { contactId } = route.params;

  const state = useAppState();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const contact = state.projectData.contacts.find((ct) => ct.id === contactId);
  const messages = state.projectData.chats[contactId] ?? [];
  const allContacts = state.projectData.contacts;
  const settings = state.settings;

  const isGroup = contact?.type === 'group';
  const isChannel = contact?.type === 'channel';

  // ── State ────────────────────────────────────────────────────────────────

  const [inputText, setInputText] = useState('');
  const [selectedSender, setSelectedSender] = useState('self');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showSenderPicker, setShowSenderPicker] = useState(false);

  // Long press action sheet modal
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [actionSheetIndex, setActionSheetIndex] = useState(-1);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState(-1);

  // Image URL input modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Clear chat confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [editIndex, setEditIndex] = useState(-1);
  const [editText, setEditText] = useState('');
  const [editSender, setEditSender] = useState('self');

  const [systemText, setSystemText] = useState('');

  // Choice modal state
  const [choiceTitle, setChoiceTitle] = useState('');
  const [choiceOptions, setChoiceOptions] = useState<string[]>(['', '']);

  // Group settings state
  const [groupName, setGroupName] = useState(contact?.name ?? '');
  const [groupAvatarName, setGroupAvatarName] = useState(contact?.avatarName ?? '');
  const [groupMembers, setGroupMembers] = useState<string[]>(contact?.members ?? []);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showMemberSelector, setShowMemberSelector] = useState(false);

  // Screenshot / export selection mode
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [selectedMsgIndices, setSelectedMsgIndices] = useState<Set<number>>(new Set());

  const flatListRef = useRef<FlatList>(null);

  // ── Derived data ─────────────────────────────────────────────────────────

  const senderOptions = useMemo(() => {
    const options: { label: string; value: string }[] = [{ label: '自己', value: 'self' }];
    if (isGroup && contact?.members) {
      contact.members.forEach((memberId) => {
        const member = allContacts.find((ct) => ct.id === memberId);
        if (member) {
          options.push({ label: member.name, value: member.id });
        }
      });
    } else if (contact) {
      options.push({ label: contact.name, value: contact.id });
    }
    return options;
  }, [contact, allContacts, isGroup]);

  const memberCandidates = useMemo(() => {
    return allContacts.filter(
      (ct) => ct.type === 'message' && !groupMembers.includes(ct.id),
    );
  }, [allContacts, groupMembers]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || !contact) return;

    const isSelf = selectedSender === 'self';
    let senderContact: Contact | undefined;
    if (!isSelf) {
      senderContact = allContacts.find((ct) => ct.id === selectedSender);
    }

    const msg: ChatMessage = {
      type: 'message',
      sender: isSelf ? 'self' : selectedSender,
      senderName: isSelf ? undefined : senderContact?.name,
      content: inputText.trim(),
      time: getCurrentTimeString(),
      avatar: isSelf ? undefined : senderContact?.avatar,
    };

    dispatch({ type: 'ADD_MESSAGE', payload: { contactId, message: msg } });
    setInputText('');
    scrollToEnd();
  }, [inputText, selectedSender, contact, allContacts, contactId, dispatch, scrollToEnd]);

  const handleSendEmoji = useCallback(
    (emojiFile: string) => {
      if (!contact) return;
      const isSelf = selectedSender === 'self';
      let senderContact: Contact | undefined;
      if (!isSelf) {
        senderContact = allContacts.find((ct) => ct.id === selectedSender);
      }

      const msg: ChatMessage = {
        type: 'message',
        sender: isSelf ? 'self' : selectedSender,
        senderName: isSelf ? undefined : senderContact?.name,
        content: `[emoji:${emojiFile}]`,
        time: getCurrentTimeString(),
        avatar: isSelf ? undefined : senderContact?.avatar,
      };

      dispatch({ type: 'ADD_MESSAGE', payload: { contactId, message: msg } });
      setShowEmojiPicker(false);
      scrollToEnd();
    },
    [selectedSender, contact, allContacts, contactId, dispatch, scrollToEnd],
  );

  // Long press opens custom action sheet modal
  const handleLongPressMessage = useCallback(
    (index: number) => {
      if (screenshotMode) return; // disable long press in screenshot mode
      setActionSheetIndex(index);
      setDeleteConfirmIndex(-1);
      setShowActionSheet(true);
    },
    [screenshotMode],
  );

  const handleSaveEdit = useCallback(() => {
    if (editIndex >= 0) {
      // Save content
      dispatch({
        type: 'EDIT_MESSAGE',
        payload: { contactId, index: editIndex, content: editText },
      });
      // Also update sender if it's a message type
      const msg = messages[editIndex];
      if (msg?.type === 'message' && editSender !== msg.sender) {
        const isSelf = editSender === 'self';
        const senderContact = isSelf ? undefined : allContacts.find((ct) => ct.id === editSender);
        // We need to update the full message - use SET_PROJECT_DATA approach
        const updatedChats = { ...state.projectData.chats };
        const chatMsgs = [...(updatedChats[contactId] || [])];
        chatMsgs[editIndex] = {
          ...chatMsgs[editIndex],
          content: editText,
          sender: isSelf ? 'self' : editSender,
          senderName: isSelf ? undefined : senderContact?.name,
          avatar: isSelf ? undefined : senderContact?.avatar,
        };
        updatedChats[contactId] = chatMsgs;
        dispatch({
          type: 'SET_PROJECT_DATA',
          payload: { ...state.projectData, chats: updatedChats },
        });
      }
    }
    setShowEditModal(false);
    setEditIndex(-1);
    setEditText('');
    setEditSender('self');
  }, [editIndex, editText, editSender, contactId, messages, allContacts, state.projectData, dispatch]);

  const handleSendSystem = useCallback(() => {
    if (!systemText.trim()) return;
    const msg: ChatMessage = { type: 'system', content: systemText.trim() };
    dispatch({ type: 'ADD_MESSAGE', payload: { contactId, message: msg } });
    setSystemText('');
    setShowSystemModal(false);
    scrollToEnd();
  }, [systemText, contactId, dispatch, scrollToEnd]);

  const handleInsertDelay = useCallback(() => {
    const msg: ChatMessage = { type: 'system', content: '[ 延迟 ]' };
    dispatch({ type: 'ADD_MESSAGE', payload: { contactId, message: msg } });
    scrollToEnd();
  }, [contactId, dispatch, scrollToEnd]);

  // Image insert - open custom modal instead of Alert.prompt
  const handleInsertImage = useCallback(() => {
    setImageUrl('');
    setShowImageModal(true);
  }, []);

  const handleConfirmInsertImage = useCallback(() => {
    if (!imageUrl.trim()) return;
    const isSelf = selectedSender === 'self';
    let senderContact: Contact | undefined;
    if (!isSelf) {
      senderContact = allContacts.find((ct) => ct.id === selectedSender);
    }
    const msg: ChatMessage = {
      type: 'message',
      sender: isSelf ? 'self' : selectedSender,
      senderName: isSelf ? undefined : senderContact?.name,
      content: `[image:${imageUrl.trim()}]`,
      time: getCurrentTimeString(),
      avatar: isSelf ? undefined : senderContact?.avatar,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: { contactId, message: msg } });
    setImageUrl('');
    setShowImageModal(false);
    scrollToEnd();
  }, [imageUrl, selectedSender, allContacts, contactId, dispatch, scrollToEnd]);

  // Clear chat - open custom confirmation modal
  const handleClearChat = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const handleConfirmClear = useCallback(() => {
    dispatch({ type: 'CLEAR_CHAT', payload: { contactId } });
    setShowClearConfirm(false);
  }, [contactId, dispatch]);

  const handleSaveChoice = useCallback(() => {
    const filteredOptions = choiceOptions.filter((opt) => opt.trim() !== '');
    if (!choiceTitle.trim() || filteredOptions.length < 2) {
      // Instead of Alert.alert we just return - the button being disabled handles this
      return;
    }
    const msg: ChatMessage = {
      type: 'choice',
      title: choiceTitle.trim(),
      options: filteredOptions,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: { contactId, message: msg } });
    setChoiceTitle('');
    setChoiceOptions(['', '']);
    setShowChoiceModal(false);
    scrollToEnd();
  }, [choiceTitle, choiceOptions, contactId, dispatch, scrollToEnd]);

  const handleSaveGroupSettings = useCallback(() => {
    if (!contact) return;
    const updates: Partial<Contact> = {};
    if (groupName.trim() && groupName !== contact.name) {
      updates.name = groupName.trim();
    }
    if (groupAvatarName && groupAvatarName !== contact.avatarName) {
      updates.avatarName = groupAvatarName;
      updates.avatar = `/avatars/${groupAvatarName}.png`;
    }
    if (JSON.stringify(groupMembers) !== JSON.stringify(contact.members)) {
      updates.members = groupMembers;
    }
    if (Object.keys(updates).length > 0) {
      dispatch({ type: 'UPDATE_CONTACT', payload: { id: contactId, updates } });
    }
    setShowGroupSettings(false);
  }, [contact, groupName, groupAvatarName, groupMembers, contactId, dispatch]);

  const openGroupSettings = useCallback(() => {
    if (!contact) return;
    setGroupName(contact.name);
    setGroupAvatarName(contact.avatarName ?? '');
    setGroupMembers(contact.members ?? []);
    setShowGroupSettings(true);
  }, [contact]);

  // ── Screenshot / Export handlers ─────────────────────────────────────────

  const toggleScreenshotMode = useCallback(() => {
    if (screenshotMode) {
      setScreenshotMode(false);
      setSelectedMsgIndices(new Set());
    } else {
      setScreenshotMode(true);
      setSelectedMsgIndices(new Set());
    }
  }, [screenshotMode]);

  const toggleMessageSelection = useCallback((index: number) => {
    setSelectedMsgIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIndices = new Set<number>();
    for (let i = 0; i < messages.length; i++) {
      allIndices.add(i);
    }
    setSelectedMsgIndices(allIndices);
  }, [messages.length]);

  const handleClearSelection = useCallback(() => {
    setSelectedMsgIndices(new Set());
  }, []);

  const handleExportSelected = useCallback(async () => {
    const selected = Array.from(selectedMsgIndices).sort((a, b) => a - b);
    if (selected.length === 0) return;

    // Resolve emoji and image references to readable export format
    const exportMessages = selected.map((idx) => {
      const msg = messages[idx];
      if (!msg) return null;
      const resolved = { ...msg };

      if (resolved.content) {
        // Convert [emoji:filename] to descriptive text with embedded info
        const emojiMatch = resolved.content.match(/^\[emoji:(.+?)\]$/);
        if (emojiMatch) {
          const emojiFile = emojiMatch[1];
          const emojiItem = EMOJI_LIST.find((e) => e.file === emojiFile);
          resolved.content = `[表情: ${emojiItem?.name ?? emojiFile}]`;
          (resolved as any).emojiFile = emojiFile;
          (resolved as any).contentType = 'emoji';
        }

        // Convert [image:url] to structured format
        const imgMatch = resolved.content.match(/^\[image:(.+?)\]$/);
        if (imgMatch) {
          (resolved as any).imageUrl = imgMatch[1];
          resolved.content = `[图片: ${imgMatch[1]}]`;
          (resolved as any).contentType = 'image';
        }
      }

      // Resolve avatar path to avatar name for portability
      if (resolved.avatar) {
        const avatarNameMatch = resolved.avatar.match(/\/avatars\/(.+)\.png$/);
        if (avatarNameMatch) {
          (resolved as any).avatarName = avatarNameMatch[1];
        }
      }

      return resolved;
    }).filter(Boolean);

    const jsonStr = JSON.stringify(
      {
        contactName: contact?.name ?? '',
        contactAvatar: contact?.avatarName ?? '',
        contactId,
        exportedAt: new Date().toISOString(),
        messageCount: exportMessages.length,
        messages: exportMessages,
      },
      null,
      2,
    );

    try {
      const fileUri = FileSystem.documentDirectory + `chat_export_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: '导出聊天记录',
        });
      }
    } catch (_e) {
      // silently fail
    }

    setScreenshotMode(false);
    setSelectedMsgIndices(new Set());
  }, [selectedMsgIndices, messages, contact, contactId]);

  // ── Guard ────────────────────────────────────────────────────────────────

  if (!contact) {
    return (
      <View style={[styles.container, { backgroundColor: c.bgDark }]}>
        <Text style={[styles.emptyText, { color: c.textMuted }]}>联系人不存在</Text>
      </View>
    );
  }

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderMessageContent = (content: string | undefined) => {
    if (!content) return null;
    const emojiFile = isEmojiContent(content);
    if (emojiFile) {
      const src = getEmojiSource(emojiFile);
      if (src) {
        return <Image source={src} style={styles.emojiImage} resizeMode="contain" />;
      }
    }
    // Check for image URL pattern
    const imgMatch = content.match(/^\[image:(.+?)\]$/);
    if (imgMatch) {
      return (
        <Image
          source={{ uri: imgMatch[1] }}
          style={styles.chatImage}
          resizeMode="cover"
        />
      );
    }
    return (
      <Text style={[styles.msgText, { color: c.textPrimary, fontSize: settings.fontSize }]}>
        {content}
      </Text>
    );
  };

  const renderSelectionCheckbox = (index: number) => {
    if (!screenshotMode) return null;
    const isSelected = selectedMsgIndices.has(index);
    return (
      <TouchableOpacity
        onPress={() => toggleMessageSelection(index)}
        style={styles.checkboxBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isSelected ? (
          <IconCheckSquare color={c.accentTeal} size={22} />
        ) : (
          <IconSquare color={c.textMuted} size={22} />
        )}
      </TouchableOpacity>
    );
  };

  const renderSystemMessage = (msg: ChatMessage, index: number) => (
    <View key={`msg-${index}`} style={styles.msgRowWrapper}>
      {renderSelectionCheckbox(index)}
      <TouchableOpacity
        onPress={screenshotMode ? () => toggleMessageSelection(index) : undefined}
        onLongPress={screenshotMode ? undefined : () => handleLongPressMessage(index)}
        activeOpacity={0.7}
        style={[styles.systemRow, screenshotMode && styles.msgRowFlex]}
      >
        <View style={[styles.systemBubble, { backgroundColor: `${c.accentTeal}22` }]}>
          <Text style={[styles.systemText, { color: c.accentTeal, fontSize: settings.fontSize - 1 }]}>
            {msg.content}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderChoiceMessage = (msg: ChatMessage, index: number) => (
    <View key={`msg-${index}`} style={styles.msgRowWrapper}>
      {renderSelectionCheckbox(index)}
      <TouchableOpacity
        onPress={screenshotMode ? () => toggleMessageSelection(index) : undefined}
        onLongPress={screenshotMode ? undefined : () => handleLongPressMessage(index)}
        activeOpacity={0.7}
        style={[styles.choiceRow, screenshotMode && styles.msgRowFlex]}
      >
        <View style={[styles.choiceCard, { borderColor: c.accentTeal, backgroundColor: `${c.bgPanel}` }]}>
          <Text style={[styles.choiceTitle, { color: c.accentTeal }]}>{msg.title}</Text>
          {msg.options?.map((opt, optIdx) => (
            <View
              key={optIdx}
              style={[styles.choiceOption, { borderColor: `${c.accentTeal}66`, backgroundColor: `${c.accentTeal}15` }]}
            >
              <Text style={[styles.choiceOptionText, { color: c.textPrimary }]}>{opt}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderSelfMessage = (msg: ChatMessage, index: number) => (
    <View key={`msg-${index}`} style={styles.msgRowWrapper}>
      {renderSelectionCheckbox(index)}
      <TouchableOpacity
        onPress={screenshotMode ? () => toggleMessageSelection(index) : undefined}
        onLongPress={screenshotMode ? undefined : () => handleLongPressMessage(index)}
        activeOpacity={0.7}
        style={[styles.selfRow, screenshotMode && styles.msgRowFlex]}
      >
        <View style={{ alignItems: 'flex-end', maxWidth: '75%' }}>
          <View style={[styles.bubbleSelf, { backgroundColor: c.bubbleSelf }]}>
            {renderMessageContent(msg.content)}
          </View>
          {settings.showTimestamp && msg.time ? (
            <Text style={[styles.timestamp, { color: c.textMuted }]}>{msg.time}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderOtherMessage = (msg: ChatMessage, index: number) => {
    const avatarSrc = msg.avatar ? resolveAvatarSource(msg.avatar) : null;
    return (
      <View key={`msg-${index}`} style={styles.msgRowWrapper}>
        {renderSelectionCheckbox(index)}
        <TouchableOpacity
          onPress={screenshotMode ? () => toggleMessageSelection(index) : undefined}
          onLongPress={screenshotMode ? undefined : () => handleLongPressMessage(index)}
          activeOpacity={0.7}
          style={[styles.otherRow, screenshotMode && styles.msgRowFlex]}
        >
          {avatarSrc ? (
            <Image source={avatarSrc} style={styles.msgAvatar} resizeMode="cover" />
          ) : (
            <View style={[styles.msgAvatar, { backgroundColor: c.bubbleOther }]} />
          )}
          <View style={{ maxWidth: '70%' }}>
            {msg.senderName ? (
              <Text style={[styles.senderName, { color: c.textSecondary }]}>{msg.senderName}</Text>
            ) : null}
            <View style={[styles.bubbleOther, { backgroundColor: c.bubbleOther }]}>
              {renderMessageContent(msg.content)}
            </View>
            {settings.showTimestamp && msg.time ? (
              <Text style={[styles.timestamp, { color: c.textMuted }]}>{msg.time}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    if (item.type === 'system') return renderSystemMessage(item, index);
    if (item.type === 'choice') return renderChoiceMessage(item, index);
    if (item.sender === 'self') return renderSelfMessage(item, index);
    return renderOtherMessage(item, index);
  };

  // ── Channel mode (announcements) ────────────────────────────────────────

  const renderAnnouncementCard = (ann: typeof ANNOUNCEMENTS[number]) => {
    const annAvatarSrc = resolveAvatarSource(ann.avatar);
    return (
      <View
        key={ann.id}
        style={[styles.announcementCard, { backgroundColor: c.bgPanel, borderColor: c.borderColor }]}
      >
        <View style={styles.announcementHeader}>
          {annAvatarSrc ? (
            <Image source={annAvatarSrc} style={styles.announcementAvatar} resizeMode="cover" />
          ) : (
            <View style={[styles.announcementAvatar, { backgroundColor: c.bubbleOther }]} />
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.announcementTitle, { color: c.accentTeal }]}>{ann.title}</Text>
            <Text style={[styles.announcementAuthor, { color: c.textSecondary }]}>{ann.avatarName}</Text>
          </View>
          {ann.pinned && (
            <View style={[styles.pinnedBadge, { backgroundColor: `${c.accentOrange}22` }]}>
              <Text style={{ color: c.accentOrange, fontSize: 11 }}>置顶</Text>
            </View>
          )}
        </View>
        <Text style={[styles.announcementContent, { color: c.textPrimary }]}>{ann.content}</Text>
      </View>
    );
  };

  // ── Sender picker label ─────────────────────────────────────────────────

  const selectedSenderLabel = senderOptions.find((o) => o.value === selectedSender)?.label ?? '自己';

  // ── Get message type label for edit modal ───────────────────────────────

  const getEditMessageTypeLabel = (): string => {
    if (editIndex < 0 || editIndex >= messages.length) return '';
    const msg = messages[editIndex];
    if (msg.type === 'system') return '系统消息';
    if (msg.type === 'choice') return '选择分支';
    return '普通消息';
  };

  // ── Header avatar source ────────────────────────────────────────────────

  const headerAvatarSrc = resolveAvatarSource(contact.avatar);

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bgDark }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: c.bgHeader, paddingTop: insets.top }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <IconBack color={c.textPrimary} />
          </TouchableOpacity>
          {headerAvatarSrc ? (
            <Image source={headerAvatarSrc} style={styles.headerAvatar} resizeMode="cover" />
          ) : (
            <View style={[styles.headerAvatar, { backgroundColor: c.bubbleOther }]} />
          )}
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.headerName, { color: c.textPrimary }]} numberOfLines={1}>
              {contact.name}
            </Text>
            <Text style={[styles.headerSub, { color: c.textMuted }]}>
              {isChannel ? '公告频道' : `${messages.length} 条消息`}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {!isChannel && (
            <>
              <TouchableOpacity onPress={() => setShowChoiceModal(true)} style={styles.headerBtn}>
                <IconBranch color={c.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearChat} style={styles.headerBtn}>
                <IconTrash color={c.textSecondary} />
              </TouchableOpacity>
            </>
          )}
          {isGroup && (
            <TouchableOpacity onPress={openGroupSettings} style={styles.headerBtn}>
              <IconSettings color={c.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Messages / Announcements ────────────────────────────────────── */}
      {isChannel ? (
        <ScrollView
          style={[styles.chatArea, { backgroundColor: c.bgChat }]}
          contentContainerStyle={styles.chatContent}
        >
          {ANNOUNCEMENTS.map(renderAnnouncementCard)}
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(_, index) => `msg-${index}`}
          style={[styles.chatArea, { backgroundColor: c.bgChat }]}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          extraData={screenshotMode ? selectedMsgIndices : undefined}
        />
      )}

      {/* ── Screenshot mode bottom bar ──────────────────────────────────── */}
      {screenshotMode && !isChannel && (
        <View style={[styles.screenshotBar, { backgroundColor: c.bgHeader, paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TouchableOpacity onPress={handleSelectAll} style={[styles.screenshotBarBtn, { borderColor: c.borderColor }]}>
            <Text style={{ color: c.textPrimary, fontSize: 13, fontWeight: '600' }}>全选</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearSelection} style={[styles.screenshotBarBtn, { borderColor: c.borderColor }]}>
            <Text style={{ color: c.textPrimary, fontSize: 13, fontWeight: '600' }}>清除</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleExportSelected}
            style={[
              styles.screenshotBarBtn,
              {
                backgroundColor: selectedMsgIndices.size > 0 ? c.primary : `${c.primary}44`,
                borderColor: 'transparent',
              },
            ]}
            disabled={selectedMsgIndices.size === 0}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
              保存 ({selectedMsgIndices.size})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleScreenshotMode} style={[styles.screenshotBarBtn, { borderColor: c.accentPink }]}>
            <Text style={{ color: c.accentPink, fontSize: 13, fontWeight: '600' }}>取消</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Input area (not shown for channels or screenshot mode) ───────── */}
      {!isChannel && !screenshotMode && (
        <View style={[styles.inputArea, { backgroundColor: c.bgHeader, paddingBottom: Math.max(insets.bottom, 8) }]}>
          {/* Tool row */}
          <View style={styles.toolRow}>
            <TouchableOpacity onPress={handleInsertImage} style={styles.toolBtn}>
              <IconImage color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSystemModal(true)} style={styles.toolBtn}>
              <IconMessageSquare color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleInsertDelay} style={styles.toolBtn}>
              <IconClock color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEmojiPicker(true)} style={styles.toolBtn}>
              <IconSmile color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleScreenshotMode} style={styles.toolBtn}>
              <IconExport color={c.textSecondary} />
            </TouchableOpacity>

            {/* Sender picker button */}
            <TouchableOpacity
              onPress={() => setShowSenderPicker(true)}
              style={[styles.senderPickerBtn, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}
            >
              <Text style={[styles.senderPickerText, { color: c.textPrimary }]} numberOfLines={1}>
                {selectedSenderLabel}
              </Text>
              <IconChevronDown color={c.textMuted} size={14} />
            </TouchableOpacity>
          </View>

          {/* Input + send row */}
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: c.inputBg,
                  borderColor: c.inputBorder,
                  color: c.textPrimary,
                  fontSize: settings.fontSize,
                },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="输入消息..."
              placeholderTextColor={c.textMuted}
              multiline
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendBtn, { backgroundColor: c.primary }]}
              disabled={!inputText.trim()}
            >
              <IconSend color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Emoji Picker Modal ──────────────────────────────────────────── */}
      <Modal visible={showEmojiPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.emojiModal, { backgroundColor: c.bgModal, paddingBottom: insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>表情</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <IconX color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={EMOJI_LIST}
              numColumns={4}
              keyExtractor={(item) => item.file}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const src = getEmojiSource(item.file);
                return (
                  <TouchableOpacity
                    onPress={() => handleSendEmoji(item.file)}
                    style={styles.emojiGridItem}
                  >
                    {src ? (
                      <Image source={src} style={styles.emojiGridImage} resizeMode="contain" />
                    ) : (
                      <Text style={{ color: c.textMuted, fontSize: 10 }}>{item.name}</Text>
                    )}
                    <Text style={[styles.emojiName, { color: c.textMuted }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Long Press Action Sheet Modal ───────────────────────────────── */}
      <Modal visible={showActionSheet} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}
        >
          <View
            style={[styles.actionSheetCard, { backgroundColor: c.bgModal, paddingBottom: Math.max(insets.bottom, 16) }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.actionSheetHandle, { backgroundColor: `${c.textMuted}44` }]} />

            {/* 编辑内容 */}
            <TouchableOpacity
              onPress={() => {
                setShowActionSheet(false);
                setEditIndex(actionSheetIndex);
                setEditText(messages[actionSheetIndex]?.content ?? '');
                setEditSender(messages[actionSheetIndex]?.sender ?? 'self');
                setShowEditModal(true);
              }}
              style={[styles.actionSheetItem, { borderBottomColor: `${c.borderColor}66` }]}
            >
              <Text style={[styles.actionSheetItemText, { color: c.textPrimary }]}>编辑内容</Text>
            </TouchableOpacity>

            {/* 向上移动 */}
            <TouchableOpacity
              onPress={() => {
                if (actionSheetIndex > 0) {
                  dispatch({
                    type: 'SWAP_MESSAGES',
                    payload: { contactId, indexA: actionSheetIndex, indexB: actionSheetIndex - 1 },
                  });
                }
                setShowActionSheet(false);
              }}
              disabled={actionSheetIndex <= 0}
              style={[styles.actionSheetItem, { borderBottomColor: `${c.borderColor}66` }]}
            >
              <View style={styles.actionSheetItemRow}>
                <IconChevronUp color={actionSheetIndex > 0 ? c.textPrimary : c.textMuted} size={18} />
                <Text
                  style={[
                    styles.actionSheetItemText,
                    { color: actionSheetIndex > 0 ? c.textPrimary : c.textMuted, marginLeft: 8 },
                  ]}
                >
                  向上移动
                </Text>
              </View>
            </TouchableOpacity>

            {/* 向下移动 */}
            <TouchableOpacity
              onPress={() => {
                if (actionSheetIndex < messages.length - 1) {
                  dispatch({
                    type: 'SWAP_MESSAGES',
                    payload: { contactId, indexA: actionSheetIndex, indexB: actionSheetIndex + 1 },
                  });
                }
                setShowActionSheet(false);
              }}
              disabled={actionSheetIndex >= messages.length - 1}
              style={[styles.actionSheetItem, { borderBottomColor: `${c.borderColor}66` }]}
            >
              <View style={styles.actionSheetItemRow}>
                <IconChevronDown
                  color={actionSheetIndex < messages.length - 1 ? c.textPrimary : c.textMuted}
                  size={18}
                />
                <Text
                  style={[
                    styles.actionSheetItemText,
                    {
                      color: actionSheetIndex < messages.length - 1 ? c.textPrimary : c.textMuted,
                      marginLeft: 8,
                    },
                  ]}
                >
                  向下移动
                </Text>
              </View>
            </TouchableOpacity>

            {/* 删除消息 with inline confirmation */}
            {deleteConfirmIndex === actionSheetIndex ? (
              <TouchableOpacity
                onPress={() => {
                  dispatch({ type: 'DELETE_MESSAGE', payload: { contactId, index: actionSheetIndex } });
                  setDeleteConfirmIndex(-1);
                  setShowActionSheet(false);
                }}
                style={[styles.actionSheetItem, { borderBottomColor: `${c.borderColor}66`, backgroundColor: `${c.accentPink}15` }]}
              >
                <Text style={[styles.actionSheetItemText, { color: c.accentPink, fontWeight: '700' }]}>
                  确认删除？再次点击删除
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setDeleteConfirmIndex(actionSheetIndex)}
                style={[styles.actionSheetItem, { borderBottomColor: `${c.borderColor}66` }]}
              >
                <Text style={[styles.actionSheetItemText, { color: c.accentPink }]}>删除消息</Text>
              </TouchableOpacity>
            )}

            {/* 取消 */}
            <TouchableOpacity
              onPress={() => {
                setDeleteConfirmIndex(-1);
                setShowActionSheet(false);
              }}
              style={[styles.actionSheetItem, { borderBottomWidth: 0 }]}
            >
              <Text style={[styles.actionSheetItemText, { color: c.textSecondary }]}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Edit Message Modal ──────────────────────────────────────────── */}
      <Modal visible={showEditModal} animationType="fade" transparent>
        <View style={styles.modalCenterOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.bgModal }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary, marginBottom: 4 }]}>
              编辑消息
            </Text>
            {/* Message type indicator */}
            <View style={[styles.msgTypeBadge, { backgroundColor: `${c.accentTeal}22` }]}>
              <Text style={{ color: c.accentTeal, fontSize: 11, fontWeight: '600' }}>
                {getEditMessageTypeLabel()}
              </Text>
            </View>

            {/* Sender change for message type */}
            {editIndex >= 0 && messages[editIndex]?.type === 'message' && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>发送者</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  {senderOptions.map((opt) => {
                    const isSelected = editSender === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setEditSender(opt.value)}
                        style={[
                          styles.senderChip,
                          {
                            backgroundColor: isSelected ? `${c.primary}22` : c.inputBg,
                            borderColor: isSelected ? c.primary : c.inputBorder,
                          },
                        ]}
                      >
                        <Text style={{ color: isSelected ? c.primary : c.textPrimary, fontSize: 13, fontWeight: isSelected ? '600' : '400' }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary, marginTop: 12 },
              ]}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setEditIndex(-1);
                }}
                style={[styles.modalBtnSecondary, { borderColor: c.borderColor }]}
              >
                <Text style={{ color: c.textSecondary }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={[styles.modalBtnPrimary, { backgroundColor: c.primary }]}
              >
                <Text style={{ color: '#fff' }}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── System Message Modal ────────────────────────────────────────── */}
      <Modal visible={showSystemModal} animationType="fade" transparent>
        <View style={styles.modalCenterOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.bgModal }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary, marginBottom: 12 }]}>
              系统消息 / 旁白
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary },
              ]}
              value={systemText}
              onChangeText={setSystemText}
              placeholder="输入旁白/系统消息..."
              placeholderTextColor={c.textMuted}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowSystemModal(false);
                  setSystemText('');
                }}
                style={[styles.modalBtnSecondary, { borderColor: c.borderColor }]}
              >
                <Text style={{ color: c.textSecondary }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendSystem}
                style={[styles.modalBtnPrimary, { backgroundColor: c.primary }]}
              >
                <Text style={{ color: '#fff' }}>插入</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Image URL Input Modal ───────────────────────────────────────── */}
      <Modal visible={showImageModal} animationType="fade" transparent>
        <View style={styles.modalCenterOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.bgModal }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary, marginBottom: 12 }]}>
              插入图片
            </Text>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>请输入图片URL</Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary },
              ]}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://..."
              placeholderTextColor={c.textMuted}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowImageModal(false);
                  setImageUrl('');
                }}
                style={[styles.modalBtnSecondary, { borderColor: c.borderColor }]}
              >
                <Text style={{ color: c.textSecondary }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmInsertImage}
                style={[
                  styles.modalBtnPrimary,
                  { backgroundColor: imageUrl.trim() ? c.primary : `${c.primary}44` },
                ]}
                disabled={!imageUrl.trim()}
              >
                <Text style={{ color: '#fff' }}>发送</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Clear Chat Confirmation Modal ───────────────────────────────── */}
      <Modal visible={showClearConfirm} animationType="fade" transparent>
        <View style={styles.modalCenterOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.bgModal }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary, marginBottom: 8 }]}>
              清空聊天
            </Text>
            <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
              确认清空所有消息？此操作不可撤销。
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowClearConfirm(false)}
                style={[styles.modalBtnSecondary, { borderColor: c.borderColor }]}
              >
                <Text style={{ color: c.textSecondary }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmClear}
                style={[styles.modalBtnPrimary, { backgroundColor: c.accentPink }]}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>清空</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Choice Branch Modal ─────────────────────────────────────────── */}
      <Modal visible={showChoiceModal} animationType="fade" transparent>
        <View style={styles.modalCenterOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.bgModal }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary, marginBottom: 12 }]}>
              添加选择分支
            </Text>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>标题</Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary, marginBottom: 12 },
              ]}
              value={choiceTitle}
              onChangeText={setChoiceTitle}
              placeholder="选择标题..."
              placeholderTextColor={c.textMuted}
            />
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>选项</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {choiceOptions.map((opt, idx) => (
                <View key={idx} style={styles.choiceInputRow}>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        flex: 1,
                        backgroundColor: c.inputBg,
                        borderColor: c.inputBorder,
                        color: c.textPrimary,
                        marginBottom: 8,
                      },
                    ]}
                    value={opt}
                    onChangeText={(text) => {
                      const updated = [...choiceOptions];
                      updated[idx] = text;
                      setChoiceOptions(updated);
                    }}
                    placeholder={`选项 ${idx + 1}`}
                    placeholderTextColor={c.textMuted}
                  />
                  {choiceOptions.length > 2 && (
                    <TouchableOpacity
                      onPress={() => setChoiceOptions(choiceOptions.filter((_, i) => i !== idx))}
                      style={styles.removeOptionBtn}
                    >
                      <IconMinus color={c.accentPink} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setChoiceOptions([...choiceOptions, ''])}
              style={[styles.addOptionBtn, { borderColor: c.accentTeal }]}
            >
              <IconPlus color={c.accentTeal} size={16} />
              <Text style={{ color: c.accentTeal, marginLeft: 6 }}>添加选项</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowChoiceModal(false);
                  setChoiceTitle('');
                  setChoiceOptions(['', '']);
                }}
                style={[styles.modalBtnSecondary, { borderColor: c.borderColor }]}
              >
                <Text style={{ color: c.textSecondary }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveChoice}
                style={[styles.modalBtnPrimary, { backgroundColor: c.primary }]}
              >
                <Text style={{ color: '#fff' }}>插入</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Group Settings Modal ────────────────────────────────────────── */}
      <Modal visible={showGroupSettings} animationType="fade" transparent>
        <View style={styles.modalCenterOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.bgModal, maxHeight: '85%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: c.textPrimary, marginBottom: 16 }]}>
                群组设置
              </Text>

              {/* Group name */}
              <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>群组名称</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary, marginBottom: 12 },
                ]}
                value={groupName}
                onChangeText={setGroupName}
              />

              {/* Group avatar */}
              <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>群组头像</Text>
              <TouchableOpacity
                onPress={() => setShowAvatarSelector(!showAvatarSelector)}
                style={[styles.avatarPickerRow, { borderColor: c.inputBorder }]}
              >
                {groupAvatarName ? (
                  (() => {
                    const avatarSrc = getAvatarSource(groupAvatarName);
                    return avatarSrc ? (
                      <Image source={avatarSrc} style={styles.avatarPickerThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.avatarPickerThumb, { backgroundColor: c.inputBg }]} />
                    );
                  })()
                ) : (
                  <View style={[styles.avatarPickerThumb, { backgroundColor: c.inputBg }]} />
                )}
                <Text style={[{ color: c.textPrimary, flex: 1, marginLeft: 10 }]}>
                  {groupAvatarName || '选择头像'}
                </Text>
                <IconChevronDown color={c.textMuted} />
              </TouchableOpacity>
              {showAvatarSelector && (
                <ScrollView horizontal style={styles.avatarSelectorRow}>
                  {AVAILABLE_AVATAR_NAMES.map((name) => {
                    const avatarSrc = getAvatarSource(name);
                    return (
                      <TouchableOpacity
                        key={name}
                        onPress={() => {
                          setGroupAvatarName(name);
                          setShowAvatarSelector(false);
                        }}
                        style={[
                          styles.avatarSelectorItem,
                          groupAvatarName === name && { borderColor: c.accentTeal, borderWidth: 2 },
                        ]}
                      >
                        {avatarSrc ? (
                          <Image source={avatarSrc} style={styles.avatarSelectorImg} resizeMode="cover" />
                        ) : (
                          <View style={[styles.avatarSelectorImg, { backgroundColor: c.inputBg }]} />
                        )}
                        <Text style={{ color: c.textMuted, fontSize: 9, marginTop: 2 }} numberOfLines={1}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Members */}
              <Text style={[styles.fieldLabel, { color: c.textSecondary, marginTop: 12 }]}>
                成员 ({groupMembers.length})
              </Text>
              {groupMembers.map((memberId) => {
                const member = allContacts.find((ct) => ct.id === memberId);
                if (!member) return null;
                const memberAvatarSrc = resolveAvatarSource(member.avatar);
                return (
                  <View
                    key={memberId}
                    style={[styles.memberRow, { borderColor: c.inputBorder }]}
                  >
                    {memberAvatarSrc ? (
                      <Image source={memberAvatarSrc} style={styles.memberAvatar} resizeMode="cover" />
                    ) : (
                      <View style={[styles.memberAvatar, { backgroundColor: c.bubbleOther }]} />
                    )}
                    <Text style={[{ color: c.textPrimary, flex: 1, marginLeft: 8 }]}>{member.name}</Text>
                    <TouchableOpacity
                      onPress={() => setGroupMembers(groupMembers.filter((id) => id !== memberId))}
                    >
                      <IconX color={c.accentPink} size={18} />
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Add member */}
              <TouchableOpacity
                onPress={() => setShowMemberSelector(!showMemberSelector)}
                style={[styles.addOptionBtn, { borderColor: c.accentTeal, marginTop: 8 }]}
              >
                <IconPlus color={c.accentTeal} size={16} />
                <Text style={{ color: c.accentTeal, marginLeft: 6 }}>添加成员</Text>
              </TouchableOpacity>
              {showMemberSelector && memberCandidates.length > 0 && (
                <View style={[styles.memberCandidateList, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                  <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                    {memberCandidates.map((ct) => {
                      const candidateAvatarSrc = resolveAvatarSource(ct.avatar);
                      return (
                        <TouchableOpacity
                          key={ct.id}
                          onPress={() => {
                            setGroupMembers([...groupMembers, ct.id]);
                            setShowMemberSelector(false);
                          }}
                          style={[styles.memberCandidateRow, { borderColor: c.inputBorder }]}
                        >
                          {candidateAvatarSrc ? (
                            <Image source={candidateAvatarSrc} style={styles.memberAvatar} resizeMode="cover" />
                          ) : (
                            <View style={[styles.memberAvatar, { backgroundColor: c.bubbleOther }]} />
                          )}
                          <Text style={[{ color: c.textPrimary, marginLeft: 8 }]}>{ct.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
              {showMemberSelector && memberCandidates.length === 0 && (
                <Text style={[{ color: c.textMuted, fontSize: 12, marginTop: 4 }]}>没有可添加的联系人</Text>
              )}

              {/* Actions */}
              <View style={[styles.modalActions, { marginTop: 16 }]}>
                <TouchableOpacity
                  onPress={() => {
                    setShowGroupSettings(false);
                    setShowAvatarSelector(false);
                    setShowMemberSelector(false);
                  }}
                  style={[styles.modalBtnSecondary, { borderColor: c.borderColor }]}
                >
                  <Text style={{ color: c.textSecondary }}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveGroupSettings}
                  style={[styles.modalBtnPrimary, { backgroundColor: c.primary }]}
                >
                  <Text style={{ color: '#fff' }}>保存</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Sender Picker Modal ─────────────────────────────────────────── */}
      <Modal visible={showSenderPicker} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalCenterOverlay}
          activeOpacity={1}
          onPress={() => setShowSenderPicker(false)}
        >
          <View style={[styles.senderPickerModal, { backgroundColor: c.bgModal }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary, marginBottom: 8 }]}>
              选择发送者
            </Text>
            {senderOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setSelectedSender(option.value);
                  setShowSenderPicker(false);
                }}
                style={[
                  styles.senderPickerOption,
                  {
                    backgroundColor:
                      selectedSender === option.value ? `${c.primary}22` : 'transparent',
                    borderColor: selectedSender === option.value ? c.primary : c.inputBorder,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selectedSender === option.value ? c.primary : c.textPrimary,
                    fontWeight: selectedSender === option.value ? '600' : '400',
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    padding: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 4,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    maxWidth: 160,
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },

  // Chat area
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 12,
    paddingBottom: 20,
  },

  // Messages
  msgRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  msgRowFlex: {
    flex: 1,
  },
  checkboxBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginRight: 2,
  },
  systemRow: {
    alignItems: 'center',
    marginVertical: 6,
    flex: 1,
  },
  systemBubble: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: '85%',
  },
  systemText: {
    textAlign: 'center',
  },

  choiceRow: {
    alignItems: 'center',
    marginVertical: 8,
    flex: 1,
  },
  choiceCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    width: '85%',
  },
  choiceTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  choiceOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    alignItems: 'center',
  },
  choiceOptionText: {
    fontSize: 14,
  },

  selfRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 4,
    paddingLeft: 50,
    flex: 1,
  },
  bubbleSelf: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderTopRightRadius: 4,
    maxWidth: '100%',
  },

  otherRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
    paddingRight: 50,
    flex: 1,
  },
  msgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    marginTop: 2,
  },
  senderName: {
    fontSize: 11,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubbleOther: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    maxWidth: '100%',
  },

  msgText: {
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    marginHorizontal: 4,
  },

  emojiImage: {
    width: 80,
    height: 80,
  },
  chatImage: {
    width: 180,
    height: 140,
    borderRadius: 8,
  },

  // Announcements
  announcementCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  announcementAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  announcementAuthor: {
    fontSize: 12,
    marginTop: 2,
  },
  pinnedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  announcementContent: {
    fontSize: 13,
    lineHeight: 20,
  },

  // Input area
  inputArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolBtn: {
    padding: 8,
    marginRight: 4,
  },
  senderPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 'auto',
    maxWidth: 120,
  },
  senderPickerText: {
    fontSize: 13,
    marginRight: 4,
    maxWidth: 80,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    minHeight: 42,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Screenshot mode bar
  screenshotBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  screenshotBarBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },

  // Modals (shared)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCenterOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 18,
    padding: 22,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 42,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 10,
  },
  modalBtnSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalBtnPrimary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },

  // Message type badge in edit modal
  msgTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  senderChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },

  // Action sheet (long press)
  actionSheetCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 0,
    paddingTop: 10,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  actionSheetItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionSheetItemText: {
    fontSize: 15,
    textAlign: 'center',
  },
  actionSheetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Emoji picker
  emojiModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 16,
    maxHeight: '60%',
  },
  emojiGridItem: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    maxWidth: '25%',
  },
  emojiGridImage: {
    width: 48,
    height: 48,
  },
  emojiName: {
    fontSize: 10,
    marginTop: 4,
  },

  // Choice modal
  choiceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeOptionBtn: {
    padding: 8,
    marginLeft: 4,
    marginBottom: 8,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },

  // Group settings
  avatarPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  avatarPickerThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarSelectorRow: {
    maxHeight: 80,
    marginBottom: 8,
  },
  avatarSelectorItem: {
    alignItems: 'center',
    padding: 4,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatarSelectorImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  memberCandidateList: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  memberCandidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Sender picker modal
  senderPickerModal: {
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  senderPickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
});
