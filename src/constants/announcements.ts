import { Announcement } from '../types';

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'announce_1',
    title: '欢迎使用',
    content: `欢迎大家使用 Heart Link！
本软件为《星塔旅人》聊天系统主题二创工具，仅用于同人创作与兴趣交流。

使用公约

1. 文明交流，友善互动，尊重游戏原作与角色。
2. 禁止引战、人身攻击、恶意玩梗及违规内容。
3. 尊重原创，禁止抄袭、盗用他人二创成果。
4. 内容遵守平台规范，共同维护良好创作氛围。
5. 本软件为同人二创，非官方应用，仅供兴趣使用。

愿以心意相连，共创属于我们的星塔故事。`,
    avatar: '/avatars/琥珀.png',
    avatarName: '琥珀',
    pinned: true,
  },
  {
    id: 'announce_2',
    title: '联系我们',
    content: `- 邮箱：1343807478@qq.com / 2799902706@qq.com
- Bilibili：https://space.bilibili.com/699093611

愿以心意相连，共创属于我们的星塔故事。`,
    avatar: '/avatars/鸢尾.png',
    avatarName: '鸢尾',
    pinned: false,
  },
];
