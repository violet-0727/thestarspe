import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAppState, useAppDispatch } from '../store/AppContext';
import { useTheme } from '../theme';
import { AVAILABLE_AVATAR_NAMES, resolveAvatarSource } from '../constants/avatars';
import type { RootStackParamList } from '../navigation';
import type { Contact } from '../types';

type EditRoute = RouteProp<RootStackParamList, 'CharacterEdit'>;

export default function CharacterEditScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const state = useAppState();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<EditRoute>();
  const { characterId } = route.params;

  const isVirtual = characterId.startsWith('__virtual__');
  const virtualName = isVirtual ? characterId.replace('__virtual__', '') : null;

  const existingContact = useMemo(
    () => state.projectData.contacts.find((ct) => ct.id === characterId) ?? null,
    [state.projectData.contacts, characterId],
  );

  const isDefault = existingContact?.isDefault === true;
  const isCustom = !!existingContact && !isDefault;

  // Editable fields
  const [name, setName] = useState(existingContact?.name ?? virtualName ?? '');
  const [status, setStatus] = useState<string>(existingContact?.status ?? 'online');
  const [aliasInput, setAliasInput] = useState('');
  const [aliases, setAliases] = useState<string[]>(existingContact?.aliases ?? []);
  const [avatarPath, setAvatarPath] = useState(
    existingContact?.avatar ?? `/avatars/${virtualName}.png`,
  );
  const [isCustomAvatar, setIsCustomAvatar] = useState(
    existingContact?.isCustomAvatar ?? false,
  );

  const avatarSource = useMemo(() => resolveAvatarSource(avatarPath), [avatarPath]);

  const statusOptions: { value: string; label: string; color: string }[] = [
    { value: 'online', label: '在线', color: '#4ADE80' },
    { value: 'away', label: '离开', color: c.accentOrange },
    { value: 'busy', label: '忙碌', color: c.accentPink },
    { value: 'offline', label: '离线', color: c.textMuted },
  ];

  const addAlias = useCallback(() => {
    const trimmed = aliasInput.trim();
    if (trimmed && !aliases.includes(trimmed)) {
      setAliases((prev) => [...prev, trimmed]);
      setAliasInput('');
    }
  }, [aliasInput, aliases]);

  const removeAlias = useCallback((index: number) => {
    setAliases((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        const uri = `data:image/jpeg;base64,${asset.base64}`;
        setAvatarPath(uri);
        setIsCustomAvatar(true);
      } else if (asset.uri) {
        setAvatarPath(asset.uri);
        setIsCustomAvatar(true);
      }
    }
  }, []);

  const handleJoin = useCallback(() => {
    if (!virtualName) return;
    const newContact: Contact = {
      id: `contact_${Date.now()}`,
      name: virtualName,
      avatar: `/avatars/${virtualName}.png`,
      avatarName: virtualName,
      type: 'message',
      pinned: false,
      status: 'online',
      isDefault: true,
      aliases: [],
    };
    dispatch({ type: 'ADD_CONTACT', payload: newContact });
    navigation.goBack();
  }, [virtualName, dispatch, navigation]);

  const handleSave = useCallback(() => {
    if (!existingContact) return;
    const updates: Partial<Contact> = {
      status,
      aliases,
    };
    if (isCustom) {
      updates.name = name;
      updates.avatar = avatarPath;
      updates.isCustomAvatar = isCustomAvatar;
    }
    dispatch({ type: 'UPDATE_CONTACT', payload: { id: characterId, updates } });
    navigation.goBack();
  }, [existingContact, isCustom, name, status, aliases, avatarPath, isCustomAvatar, characterId, dispatch, navigation]);

  const handleDelete = useCallback(() => {
    Alert.alert('删除角色', `确定要删除「${name}」吗？此操作不可恢复。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'DELETE_CONTACT', payload: characterId });
          navigation.goBack();
        },
      },
    ]);
  }, [name, characterId, dispatch, navigation]);

  // ── Virtual character: read-only info + join button ──
  if (isVirtual) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bgDark }]}>
        <View style={[styles.header, { backgroundColor: c.bgHeader, borderBottomColor: c.borderColor }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: c.primary }]}>{'< 返回'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.textPrimary }]}>角色详情</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.avatarCenter}>
            <Image source={avatarSource} style={styles.avatarLarge} />
          </View>
          <Text style={[styles.virtualName, { color: c.textPrimary }]}>{virtualName}</Text>
          <Text style={[styles.virtualHint, { color: c.textMuted }]}>
            此角色为内置角色，尚未加入邀约
          </Text>

          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: c.accentTeal }]}
            activeOpacity={0.7}
            onPress={handleJoin}
          >
            <Text style={styles.joinButtonText}>加入邀约</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Existing character: edit form ──
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgDark }]}>
      <View style={[styles.header, { backgroundColor: c.bgHeader, borderBottomColor: c.borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: c.primary }]}>{'< 返回'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>编辑角色</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={[styles.saveText, { color: c.accentTeal }]}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatarCenter}
          activeOpacity={isCustom ? 0.6 : 1}
          onPress={isCustom ? pickImage : undefined}
          disabled={!isCustom}
        >
          <Image source={avatarSource} style={styles.avatarLarge} />
          {isCustom && (
            <View style={[styles.avatarEditOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
              <Text style={styles.avatarEditText}>更换</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Name */}
        <Text style={[styles.label, { color: c.textSecondary }]}>名称</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: c.inputBg,
              borderColor: c.inputBorder,
              color: c.textPrimary,
              opacity: isDefault ? 0.5 : 1,
            },
          ]}
          value={name}
          onChangeText={setName}
          editable={isCustom}
          placeholder="角色名称"
          placeholderTextColor={c.textMuted}
        />

        {/* Status */}
        <Text style={[styles.label, { color: c.textSecondary }]}>状态</Text>
        <View style={styles.statusRow}>
          {statusOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.statusChip,
                {
                  backgroundColor: status === opt.value ? opt.color + '30' : c.inputBg,
                  borderColor: status === opt.value ? opt.color : c.inputBorder,
                },
              ]}
              onPress={() => setStatus(opt.value)}
            >
              <View style={[styles.statusChipDot, { backgroundColor: opt.color }]} />
              <Text
                style={[
                  styles.statusChipLabel,
                  { color: status === opt.value ? opt.color : c.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Aliases */}
        <Text style={[styles.label, { color: c.textSecondary }]}>别名标签</Text>
        <View style={styles.aliasInputRow}>
          <TextInput
            style={[
              styles.aliasInput,
              { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary },
            ]}
            value={aliasInput}
            onChangeText={setAliasInput}
            placeholder="输入别名后点击添加"
            placeholderTextColor={c.textMuted}
            onSubmitEditing={addAlias}
          />
          <TouchableOpacity
            style={[styles.aliasAddBtn, { backgroundColor: c.primary }]}
            onPress={addAlias}
          >
            <Text style={styles.aliasAddText}>添加</Text>
          </TouchableOpacity>
        </View>
        {aliases.length > 0 && (
          <View style={styles.aliasWrap}>
            {aliases.map((alias, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.aliasTag, { backgroundColor: c.itemHover, borderColor: c.borderColor }]}
                onPress={() => removeAlias(i)}
              >
                <Text style={[styles.aliasTagText, { color: c.textSecondary }]}>
                  {alias} x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Delete (custom only) */}
        {isCustom && (
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: c.accentPink }]}
            activeOpacity={0.7}
            onPress={handleDelete}
          >
            <Text style={[styles.deleteButtonText, { color: c.accentPink }]}>
              删除角色
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
    minWidth: 60,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    minWidth: 60,
  },
  saveBtn: {
    paddingVertical: 4,
    paddingLeft: 8,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  avatarCenter: {
    alignSelf: 'center',
    marginBottom: 20,
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarEditOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  virtualName: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  virtualHint: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 28,
  },
  joinButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  statusChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  aliasInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  aliasInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  aliasAddBtn: {
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  aliasAddText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  aliasWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  aliasTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  aliasTagText: {
    fontSize: 12,
  },
  deleteButton: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
