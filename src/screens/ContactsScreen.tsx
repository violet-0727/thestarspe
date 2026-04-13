import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppState, useAppDispatch } from '../store/AppContext';
import { useTheme } from '../theme';
import { resolveAvatarSource, AVAILABLE_AVATAR_NAMES, getAvatarSource } from '../constants/avatars';
import type { RootStackParamList } from '../navigation';
import type { Contact, ChatMessage } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabKey = 'groups' | 'messages' | 'channels';

const TAB_CONFIG: { key: TabKey; label: string }[] = [
  { key: 'groups', label: '消息' },
  { key: 'messages', label: '邀约' },
  { key: 'channels', label: '频道' },
];

export default function ContactsScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const state = useAppState();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [searchVal, setSearchVal] = useState('');

  // Add contact modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addModalName, setAddModalName] = useState('');
  const [addModalAvatarName, setAddModalAvatarName] = useState('琥珀');

  // Long press menu modal state
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [menuContact, setMenuContact] = useState<Contact | null>(null);

  // Delete confirmation modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);

  const currentTab = state.currentTab;

  const switchTab = useCallback(
    (tab: TabKey) => {
      dispatch({ type: 'SET_CURRENT_TAB', payload: tab });
    },
    [dispatch],
  );

  const filteredContacts = useMemo(() => {
    let list = [...state.projectData.contacts];

    // Filter by search
    if (searchVal) {
      const q = searchVal.toLowerCase();
      list = list.filter((ct) => ct.name.toLowerCase().includes(q));
    }

    // Filter by tab
    if (currentTab === 'messages') {
      list = list.filter((ct) => (ct.type || 'message') === 'message');
    } else if (currentTab === 'groups') {
      list = list.filter((ct) => (ct.type || 'message') === 'group');
    } else if (currentTab === 'channels') {
      list = list.filter((ct) => (ct.type || 'message') === 'channel');
    }

    // Sort pinned first
    list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    return list;
  }, [state.projectData.contacts, searchVal, currentTab]);

  const getLastMessage = useCallback(
    (contactId: string): { preview: string; time: string } => {
      const chat: ChatMessage[] = state.projectData.chats[contactId] ?? [];
      const msgs = chat.filter((m) => m.type === 'message');
      const lastMsg = msgs[msgs.length - 1];
      if (!lastMsg) return { preview: '暂无消息', time: '' };

      const content = lastMsg.content ?? '';
      const isEmoji = /^\[emoji:.+?\]$/.test(content);
      const isImage = /^\[image:.+?\]$/.test(content);
      const preview = isEmoji ? '【表情】' : isImage ? '【图片】' : content;
      return { preview, time: lastMsg.time ?? '' };
    },
    [state.projectData.chats],
  );

  const statusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return '#4ADE80';
      case 'away':
        return c.accentOrange;
      case 'busy':
        return c.accentPink;
      default:
        return c.textMuted;
    }
  };

  const handlePress = useCallback(
    (contact: Contact) => {
      dispatch({ type: 'SET_ACTIVE_CONTACT', payload: contact.id });
      navigation.navigate('Chat', { contactId: contact.id });
    },
    [dispatch, navigation],
  );

  // ── Long press → open custom menu modal ──
  const handleLongPress = useCallback(
    (contact: Contact) => {
      setMenuContact(contact);
      setMenuModalVisible(true);
    },
    [],
  );

  const handleMenuTogglePin = useCallback(() => {
    if (menuContact) {
      dispatch({ type: 'TOGGLE_PIN', payload: menuContact.id });
    }
    setMenuModalVisible(false);
    setMenuContact(null);
  }, [dispatch, menuContact]);

  const handleMenuDeleteRequest = useCallback(() => {
    // Close menu, open delete confirmation
    setMenuModalVisible(false);
    setDeleteContact(menuContact);
    setDeleteModalVisible(true);
  }, [menuContact]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteContact) {
      dispatch({ type: 'DELETE_CONTACT', payload: deleteContact.id });
    }
    setDeleteModalVisible(false);
    setDeleteContact(null);
    setMenuContact(null);
  }, [dispatch, deleteContact]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalVisible(false);
    setDeleteContact(null);
  }, []);

  const handleMenuCancel = useCallback(() => {
    setMenuModalVisible(false);
    setMenuContact(null);
  }, []);

  // ── Add contact → open custom modal ──
  const handleAddContact = useCallback(() => {
    setAddModalName('');
    setAddModalAvatarName('琥珀');
    setAddModalVisible(true);
  }, []);

  const handleAddConfirm = useCallback(() => {
    const typeLabel = currentTab === 'groups' ? '消息组' : '角色对话';
    const contactType: Contact['type'] = currentTab === 'groups' ? 'group' : 'message';
    const name = addModalName.trim() || `新${typeLabel}`;

    const newId = `contact_${Date.now()}`;
    const newContact: Contact = {
      id: newId,
      name,
      avatar: `/avatars/${addModalAvatarName}.png`,
      avatarName: addModalAvatarName,
      type: contactType,
      pinned: false,
      status: 'online',
      isDefault: false,
    };
    dispatch({ type: 'ADD_CONTACT', payload: newContact });
    dispatch({ type: 'SET_ACTIVE_CONTACT', payload: newId });
    setAddModalVisible(false);
    navigation.navigate('Chat', { contactId: newId });
  }, [currentTab, addModalName, addModalAvatarName, dispatch, navigation]);

  const handleAddCancel = useCallback(() => {
    setAddModalVisible(false);
  }, []);

  // ── Render contact item ──
  const renderItem = useCallback(
    ({ item }: { item: Contact }) => {
      const avatarSrc = resolveAvatarSource(item.avatar);
      const { preview, time } = getLastMessage(item.id);
      const isActive = item.id === state.activeContactId;

      return (
        <TouchableOpacity
          style={[
            styles.contactItem,
            {
              backgroundColor: isActive ? c.itemHover : 'transparent',
              borderColor: isActive ? c.borderColor : 'transparent',
            },
          ]}
          activeOpacity={0.6}
          onPress={() => handlePress(item)}
          onLongPress={() => handleLongPress(item)}
        >
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {avatarSrc ? (
              <Image
                source={avatarSrc}
                style={[styles.avatar, { borderColor: c.borderColor }]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  {
                    borderColor: c.borderColor,
                    backgroundColor: c.accentTeal,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                  {item.name.charAt(0)}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColor(item.status), borderColor: c.bgDark },
              ]}
            />
          </View>

          {/* Info */}
          <View style={styles.contactInfo}>
            <View style={styles.contactNameRow}>
              <Text
                style={[styles.contactName, { color: c.textPrimary }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {item.pinned && (
                <View style={[styles.pinBadge, { backgroundColor: c.accentOrange }]}>
                  <Text style={styles.pinBadgeText}>置</Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.contactPreview, { color: c.textSecondary }]}
              numberOfLines={1}
            >
              {preview}
            </Text>
          </View>

          {/* Time */}
          <View style={styles.contactMeta}>
            <Text style={[styles.contactTime, { color: c.textMuted }]}>{time}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [
      c,
      getLastMessage,
      handleLongPress,
      handlePress,
      state.activeContactId,
    ],
  );

  const keyExtractor = useCallback((item: Contact) => item.id, []);

  const addTypeLabel = currentTab === 'groups' ? '消息组' : '角色对话';

  return (
    <View style={[styles.container, { backgroundColor: c.bgDark }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.bgDark, paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>信笺</Text>
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: c.inputBg, borderColor: c.inputBorder },
          ]}
        >
          <Text style={[styles.searchIcon, { color: c.textMuted }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: c.textPrimary }]}
            placeholder="搜索联系人..."
            placeholderTextColor={c.textMuted}
            value={searchVal}
            onChangeText={setSearchVal}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: c.borderColor }]}>
        {TAB_CONFIG.map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                isActive && { borderBottomColor: c.accentTeal, borderBottomWidth: 2 },
              ]}
              activeOpacity={0.7}
              onPress={() => switchTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? c.accentTeal : c.textMuted },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Contact List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: c.textMuted }]}>
              暂无联系人
            </Text>
          </View>
        }
      />

      {/* Add Button */}
      {currentTab !== 'channels' && (
        <View style={{ paddingBottom: insets.bottom }}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: c.primary }]}
            activeOpacity={0.7}
            onPress={handleAddContact}
          >
            <Text style={styles.addButtonText}>
              + {currentTab === 'groups' ? '添加消息组' : '添加角色对话'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ═══════════════════ Add Contact Modal ═══════════════════ */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleAddCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgModal, borderColor: c.borderColor }]}>
            {/* Title */}
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>
              添加{addTypeLabel}
            </Text>

            {/* Name Input */}
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: c.inputBg,
                  borderColor: c.inputBorder,
                  color: c.textPrimary,
                },
              ]}
              placeholder="输入名称..."
              placeholderTextColor={c.textMuted}
              value={addModalName}
              onChangeText={setAddModalName}
              autoFocus
            />

            {/* Avatar Grid Label */}
            <Text style={[styles.modalSubtitle, { color: c.textSecondary }]}>
              选择头像
            </Text>

            {/* Avatar Grid */}
            <ScrollView
              style={styles.avatarGridScroll}
              contentContainerStyle={styles.avatarGridContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.avatarGrid}>
                {AVAILABLE_AVATAR_NAMES.map((name) => {
                  const src = getAvatarSource(name);
                  const isSelected = addModalAvatarName === name;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[
                        styles.avatarGridItem,
                        {
                          borderColor: isSelected ? c.accentTeal : c.borderColor,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => setAddModalAvatarName(name)}
                    >
                      {src ? (
                        <Image
                          source={src}
                          style={styles.avatarGridImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.avatarGridImage,
                            { backgroundColor: c.accentTeal, alignItems: 'center', justifyContent: 'center' },
                          ]}
                        >
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                            {name.charAt(0)}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.avatarGridName,
                          { color: isSelected ? c.accentTeal : c.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Buttons */}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: c.inputBg, borderColor: c.borderColor, borderWidth: 1 }]}
                activeOpacity={0.7}
                onPress={handleAddCancel}
              >
                <Text style={[styles.modalButtonText, { color: c.textSecondary }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: c.primary }]}
                activeOpacity={0.7}
                onPress={handleAddConfirm}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════ Long Press Menu Modal ═══════════════════ */}
      <Modal
        visible={menuModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleMenuCancel}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={handleMenuCancel}
        >
          <View
            style={[
              styles.menuSheet,
              {
                backgroundColor: c.bgModal,
                borderColor: c.borderColor,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {/* Contact name as title */}
            {menuContact && (
              <Text style={[styles.menuTitle, { color: c.textPrimary }]}>
                {menuContact.name}
              </Text>
            )}

            {/* Toggle pin */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: c.borderColor }]}
              activeOpacity={0.6}
              onPress={handleMenuTogglePin}
            >
              <Text style={[styles.menuItemIcon]}>📌</Text>
              <Text style={[styles.menuItemText, { color: c.textPrimary }]}>
                {menuContact?.pinned ? '取消置顶' : '置顶'}
              </Text>
            </TouchableOpacity>

            {/* Delete (not for channels) */}
            {menuContact && menuContact.type !== 'channel' && (
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: c.borderColor }]}
                activeOpacity={0.6}
                onPress={handleMenuDeleteRequest}
              >
                <Text style={[styles.menuItemIcon]}>🗑️</Text>
                <Text style={[styles.menuItemText, { color: c.accentPink }]}>删除</Text>
              </TouchableOpacity>
            )}

            {/* Cancel */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              activeOpacity={0.6}
              onPress={handleMenuCancel}
            >
              <Text style={[styles.menuItemIcon]}>✕</Text>
              <Text style={[styles.menuItemText, { color: c.textMuted }]}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══════════════════ Delete Confirmation Modal ═══════════════════ */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDeleteCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteModalContent, { backgroundColor: c.bgModal, borderColor: c.borderColor }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>确认删除</Text>
            <Text style={[styles.deleteModalMessage, { color: c.textSecondary }]}>
              确定要删除「{deleteContact?.name}」吗？聊天记录也将被清除。
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: c.inputBg, borderColor: c.borderColor, borderWidth: 1 }]}
                activeOpacity={0.7}
                onPress={handleDeleteCancel}
              >
                <Text style={[styles.modalButtonText, { color: c.textSecondary }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: c.accentPink }]}
                activeOpacity={0.7}
                onPress={handleDeleteConfirm}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>删除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Contact list
  list: {
    paddingVertical: 6,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },

  // Avatar
  avatarContainer: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },
  statusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },

  // Contact info
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
  },
  pinBadge: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  contactPreview: {
    fontSize: 13,
    marginTop: 3,
  },

  // Meta
  contactMeta: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  contactTime: {
    fontSize: 11,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 14,
  },

  // Add button
  addButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // ─── Shared Modal Styles ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
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
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalButtonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // ─── Avatar Grid (Add Modal) ───
  avatarGridScroll: {
    maxHeight: 260,
  },
  avatarGridContent: {
    paddingBottom: 4,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  avatarGridItem: {
    width: '18.4%',
    marginHorizontal: '0.8%',
    marginVertical: 4,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  avatarGridImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarGridName: {
    fontSize: 10,
    marginTop: 3,
    textAlign: 'center',
  },

  // ─── Long Press Menu (Bottom Sheet) ───
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemIcon: {
    fontSize: 18,
    width: 32,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },

  // ─── Delete Confirmation Modal ───
  deleteModalContent: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  deleteModalMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
});
