import React, { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import type { Contact, ChatMessage, ProjectData, AppSettings } from '../types';
import { defaultSettings } from '../types';

// ─── Persistence ─────────────────────────────────────────────────────────────

const SAVE_FILE = `${FileSystem.documentDirectory}thestars_project.json`;

async function saveToFile(projectData: ProjectData, settings: AppSettings): Promise<void> {
  try {
    const data = { projectData, settings, savedAt: new Date().toISOString() };
    await FileSystem.writeAsStringAsync(SAVE_FILE, JSON.stringify(data), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (e) {
    console.warn('[AutoSave] Failed to save:', e);
  }
}

async function loadFromFile(): Promise<{ projectData: ProjectData; settings: AppSettings } | null> {
  try {
    const info = await FileSystem.getInfoAsync(SAVE_FILE);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(SAVE_FILE, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const parsed = JSON.parse(content);
    if (parsed.projectData && parsed.settings) {
      return { projectData: parsed.projectData, settings: parsed.settings };
    }
    return null;
  } catch (e) {
    console.warn('[AutoSave] Failed to load:', e);
    return null;
  }
}

// ─── State ───────────────────────────────────────────────────────────────────

export interface AppState {
  projectData: ProjectData;
  activeContactId: string | null;
  currentTab: 'messages' | 'groups' | 'channels';
  settings: AppSettings;
  hasUnsavedChanges: boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type AppAction =
  | { type: 'SET_PROJECT_DATA'; payload: ProjectData }
  | { type: 'SET_ACTIVE_CONTACT'; payload: string | null }
  | { type: 'SET_CURRENT_TAB'; payload: 'messages' | 'groups' | 'channels' }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'MARK_SAVED' }
  | { type: 'ADD_MESSAGE'; payload: { contactId: string; message: ChatMessage } }
  | { type: 'DELETE_MESSAGE'; payload: { contactId: string; index: number } }
  | { type: 'EDIT_MESSAGE'; payload: { contactId: string; index: number; content: string } }
  | { type: 'CLEAR_CHAT'; payload: { contactId: string } }
  | { type: 'ADD_CONTACT'; payload: Contact }
  | { type: 'DELETE_CONTACT'; payload: string }
  | { type: 'TOGGLE_PIN'; payload: string }
  | { type: 'UPDATE_CONTACT'; payload: { id: string; updates: Partial<Contact> } }
  | { type: 'SWAP_MESSAGES'; payload: { contactId: string; indexA: number; indexB: number } };

// ─── Reducer ─────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PROJECT_DATA':
      return {
        ...state,
        projectData: action.payload,
        hasUnsavedChanges: true,
      };

    case 'SET_ACTIVE_CONTACT':
      return { ...state, activeContactId: action.payload };

    case 'SET_CURRENT_TAB':
      return { ...state, currentTab: action.payload };

    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };

    case 'MARK_SAVED':
      return { ...state, hasUnsavedChanges: false };

    case 'ADD_MESSAGE': {
      const { contactId, message } = action.payload;
      const prevMessages = state.projectData.chats[contactId] ?? [];
      return {
        ...state,
        hasUnsavedChanges: true,
        projectData: {
          ...state.projectData,
          chats: {
            ...state.projectData.chats,
            [contactId]: [...prevMessages, message],
          },
        },
      };
    }

    case 'DELETE_MESSAGE': {
      const { contactId, index } = action.payload;
      const messages = state.projectData.chats[contactId];
      if (!messages) return state;
      return {
        ...state,
        hasUnsavedChanges: true,
        projectData: {
          ...state.projectData,
          chats: {
            ...state.projectData.chats,
            [contactId]: messages.filter((_, i) => i !== index),
          },
        },
      };
    }

    case 'EDIT_MESSAGE': {
      const { contactId, index, content } = action.payload;
      const msgs = state.projectData.chats[contactId];
      if (!msgs || !msgs[index]) return state;
      const updated = msgs.map((msg, i) =>
        i === index ? { ...msg, content } : msg,
      );
      return {
        ...state,
        hasUnsavedChanges: true,
        projectData: {
          ...state.projectData,
          chats: {
            ...state.projectData.chats,
            [contactId]: updated,
          },
        },
      };
    }

    case 'CLEAR_CHAT': {
      const { contactId } = action.payload;
      return {
        ...state,
        hasUnsavedChanges: true,
        projectData: {
          ...state.projectData,
          chats: {
            ...state.projectData.chats,
            [contactId]: [],
          },
        },
      };
    }

    case 'ADD_CONTACT': {
      const contact = action.payload;
      return {
        ...state,
        hasUnsavedChanges: true,
        projectData: {
          ...state.projectData,
          contacts: [...state.projectData.contacts, contact],
          chats: {
            ...state.projectData.chats,
            [contact.id]: [],
          },
        },
      };
    }

    case 'DELETE_CONTACT': {
      const id = action.payload;
      const { [id]: _removed, ...remainingChats } = state.projectData.chats;
      return {
        ...state,
        hasUnsavedChanges: true,
        activeContactId:
          state.activeContactId === id ? null : state.activeContactId,
        projectData: {
          ...state.projectData,
          contacts: state.projectData.contacts.filter((c) => c.id !== id),
          chats: remainingChats,
        },
      };
    }

    case 'TOGGLE_PIN': {
      const id = action.payload;
      return {
        ...state,
        hasUnsavedChanges: true,
        projectData: {
          ...state.projectData,
          contacts: state.projectData.contacts.map((c) =>
            c.id === id ? { ...c, pinned: !c.pinned } : c,
          ),
        },
      };
    }

    case 'UPDATE_CONTACT': {
      const { id, updates } = action.payload;
      return {
        ...state,
        hasUnsavedChanges: true,
        projectData: {
          ...state.projectData,
          contacts: state.projectData.contacts.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        },
      };
    }

    case 'SWAP_MESSAGES': {
      const { contactId, indexA, indexB } = action.payload;
      const msgs = state.projectData.chats[contactId];
      if (!msgs || indexA < 0 || indexB < 0 || indexA >= msgs.length || indexB >= msgs.length) return state;
      const swapped = [...msgs];
      [swapped[indexA], swapped[indexB]] = [swapped[indexB], swapped[indexA]];
      return {
        ...state,
        hasUnsavedChanges: true,
        projectData: {
          ...state.projectData,
          chats: {
            ...state.projectData.chats,
            [contactId]: swapped,
          },
        },
      };
    }

    default:
      return state;
  }
}

// ─── Initial data (matches desktop app) ──────────────────────────────────────

function buildInitialState(): AppState {
  const c1: Contact = {
    id: 'contact_1',
    name: '苍兰',
    avatar: '/avatars/苍兰.png',
    avatarName: '苍兰',
    type: 'message',
    pinned: true,
    status: 'online',
    isDefault: true,
  };
  const c2: Contact = {
    id: 'contact_2',
    name: '希娅',
    avatar: '/avatars/希娅.png',
    avatarName: '希娅',
    type: 'message',
    pinned: false,
    status: 'online',
    isDefault: true,
  };
  const c3: Contact = {
    id: 'contact_3',
    name: '璟麟',
    avatar: '/avatars/璟麟.png',
    avatarName: '璟麟',
    type: 'message',
    pinned: false,
    status: 'online',
    isDefault: true,
  };
  const c4: Contact = {
    id: 'contact_4',
    name: '星塔作战组',
    avatar: '/avatars/卡西米拉.png',
    avatarName: '卡西米拉',
    type: 'group',
    pinned: false,
    status: 'online',
    isDefault: true,
    members: [c1.id, c2.id, c3.id],
  };
  const c5: Contact = {
    id: 'contact_5',
    name: '公告频道',
    avatar: '/avatars/琥珀.png',
    avatarName: '琥珀',
    type: 'channel',
    pinned: true,
    status: 'online',
    isDefault: true,
  };

  const contacts: Contact[] = [c1, c2, c3, c4, c5];

  const chats: Record<string, ChatMessage[]> = {
    [c1.id]: [
      { type: 'system', content: '剧情开始 - 第一章：相遇' },
      {
        type: 'message',
        sender: c1.id,
        senderName: c1.name,
        content: '你好，旅行者。欢迎来到星塔。',
        time: '10:30',
        avatar: c1.avatar,
      },
      {
        type: 'message',
        sender: 'self',
        content: '你好，请问这里是...？',
        time: '10:31',
      },
      {
        type: 'message',
        sender: c1.id,
        senderName: c1.name,
        content: '这里是星塔的中心大厅，所有旅人都会经过这里。',
        time: '10:31',
        avatar: c1.avatar,
      },
      {
        type: 'message',
        sender: c1.id,
        senderName: c1.name,
        content: '你看起来不像是本地人呢，从远处来的吗？',
        time: '10:32',
        avatar: c1.avatar,
      },
      {
        type: 'choice',
        title: '选择回答方式',
        options: ['坦诚相告', '含糊其辞', '反问对方'],
      },
    ],
    [c2.id]: [],
    [c3.id]: [],
    [c4.id]: [],
    [c5.id]: [],
  };

  return {
    projectData: { contacts, chats },
    activeContactId: null,
    currentTab: 'messages',
    settings: { ...defaultSettings },
    hasUnsavedChanges: false,
  };
}

// ─── Contexts ────────────────────────────────────────────────────────────────

const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<React.Dispatch<AppAction> | undefined>(
  undefined,
);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, buildInitialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved data on startup
  useEffect(() => {
    (async () => {
      const saved = await loadFromFile();
      if (saved) {
        dispatch({ type: 'SET_PROJECT_DATA', payload: saved.projectData });
        dispatch({ type: 'SET_SETTINGS', payload: saved.settings });
        dispatch({ type: 'MARK_SAVED' });
      }
      setIsLoaded(true);
    })();
  }, []);

  // Auto-save whenever projectData or settings change (after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    saveToFile(state.projectData, state.settings);
  }, [state.projectData, state.settings, isLoaded]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (ctx === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return ctx;
}

export function useAppDispatch(): React.Dispatch<AppAction> {
  const ctx = useContext(AppDispatchContext);
  if (ctx === undefined) {
    throw new Error('useAppDispatch must be used within an AppProvider');
  }
  return ctx;
}
