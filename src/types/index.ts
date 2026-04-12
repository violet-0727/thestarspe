export interface Contact {
  id: string;
  name: string;
  avatar: string;
  avatarName?: string;
  type: 'message' | 'group' | 'channel';
  pinned: boolean;
  status?: string;
  isDefault?: boolean;
  aliases?: string[];
  isCustomAvatar?: boolean;
  members?: string[];
}

export interface ChatMessage {
  type: 'system' | 'message' | 'choice';
  content?: string;
  sender?: string;
  senderName?: string;
  time?: string;
  avatar?: string;
  title?: string;
  options?: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  avatar: string;
  avatarName: string;
  pinned: boolean;
}

export interface ProjectData {
  contacts: Contact[];
  chats: Record<string, ChatMessage[]>;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  contrast: number;
  previewInterval: number;
  fontSize: number;
  showTimestamp: boolean;
}

export const defaultSettings: AppSettings = {
  theme: 'dark',
  contrast: 1.0,
  previewInterval: 1500,
  fontSize: 14,
  showTimestamp: true,
};
