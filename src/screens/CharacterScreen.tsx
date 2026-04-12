import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppState, useAppDispatch } from '../store/AppContext';
import { useTheme } from '../theme';
import { AVAILABLE_AVATAR_NAMES, resolveAvatarSource } from '../constants/avatars';
import type { RootStackParamList } from '../navigation';
import type { Contact } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CharacterRow {
  id: string;
  name: string;
  avatar: string;
  avatarName?: string;
  status?: string;
  isDefault?: boolean;
  aliases?: string[];
  messageCount: number;
  isVirtual: boolean;
}

export default function CharacterScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const state = useAppState();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();

  const characters = useMemo<CharacterRow[]>(() => {
    const { contacts, chats } = state.projectData;

    // Existing contacts (only type 'message' are characters)
    const existing: CharacterRow[] = contacts
      .filter((ct) => ct.type === 'message')
      .map((ct) => ({
        id: ct.id,
        name: ct.name,
        avatar: ct.avatar,
        avatarName: ct.avatarName,
        status: ct.status,
        isDefault: ct.isDefault,
        aliases: ct.aliases,
        messageCount: (chats[ct.id] ?? []).length,
        isVirtual: false,
      }));

    const existingNames = new Set(contacts.map((ct) => ct.avatarName ?? ct.name));

    // Virtual built-in characters not yet added
    const virtual: CharacterRow[] = AVAILABLE_AVATAR_NAMES.filter(
      (name) => !existingNames.has(name),
    ).map((name) => ({
      id: `__virtual__${name}`,
      name,
      avatar: `/avatars/${name}.png`,
      avatarName: name,
      status: undefined,
      isDefault: true,
      aliases: undefined,
      messageCount: 0,
      isVirtual: true,
    }));

    return [...existing, ...virtual];
  }, [state.projectData]);

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

  const handlePress = (row: CharacterRow) => {
    navigation.navigate('CharacterEdit', { characterId: row.id });
  };

  const handleCreate = () => {
    const newId = `custom_${Date.now()}`;
    const newContact: Contact = {
      id: newId,
      name: '新角色',
      avatar: '/avatars/琥珀.png',
      avatarName: '琥珀',
      type: 'message',
      pinned: false,
      status: 'online',
      isDefault: false,
      aliases: [],
    };
    dispatch({ type: 'ADD_CONTACT', payload: newContact });
    navigation.navigate('CharacterEdit', { characterId: newId });
  };

  const renderItem = ({ item }: { item: CharacterRow }) => {
    const avatarSrc = resolveAvatarSource(item.avatar);

    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: c.borderColor }]}
        activeOpacity={0.6}
        onPress={() => handlePress(item)}
      >
        <View style={styles.avatarContainer}>
          <Image source={avatarSrc} style={styles.avatar} />
          {!item.isVirtual && (
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColor(item.status) },
              ]}
            />
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: c.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isDefault && !item.isVirtual && (
              <View style={[styles.badge, { backgroundColor: c.primary }]}>
                <Text style={styles.badgeText}>默认</Text>
              </View>
            )}
          </View>

          {item.isVirtual ? (
            <Text style={[styles.virtualLabel, { color: c.accentOrange }]}>
              未加入邀约
            </Text>
          ) : (
            <View style={styles.metaRow}>
              {item.aliases && item.aliases.length > 0 && (
                <View style={styles.aliasRow}>
                  {item.aliases.map((alias, i) => (
                    <View
                      key={i}
                      style={[styles.aliasTag, { backgroundColor: c.itemHover, borderColor: c.borderColor }]}
                    >
                      <Text style={[styles.aliasText, { color: c.textSecondary }]}>
                        {alias}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={[styles.messageCount, { color: c.textMuted }]}>
                {item.messageCount} 条消息
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgDark }]}>
      <View style={[styles.header, { backgroundColor: c.bgHeader, borderBottomColor: c.borderColor }]}>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>角色管理</Text>
        <Text style={[styles.headerSubtitle, { color: c.textMuted }]}>
          {characters.filter((ch) => !ch.isVirtual).length} 位角色已加入
        </Text>
      </View>

      <FlatList
        data={characters}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: c.primary }]}
            activeOpacity={0.7}
            onPress={handleCreate}
          >
            <Text style={styles.createButtonText}>+ 新建联系人</Text>
          </TouchableOpacity>
        }
      />
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
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  list: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  statusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1A1E2E',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  virtualLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    marginTop: 2,
  },
  aliasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 2,
  },
  aliasTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  aliasText: {
    fontSize: 11,
  },
  messageCount: {
    fontSize: 12,
  },
  createButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
