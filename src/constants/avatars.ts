// Avatar image mappings for React Native require()
// We need static requires for bundled assets
// File names use pinyin to avoid Metro bundler issues with Chinese characters on Windows

export const AVAILABLE_AVATAR_NAMES = [
  '苍兰', '尘沙', '赤霞', '冬香', '多娜', '翡冷翠', '风影', '格芮',
  '琥珀', '花原', '焦糖', '璟麟', '卡娜丝', '卡西米拉', '珂赛特',
  '科洛妮丝', '菈露', '岭川', '密涅瓦', '千都世', '师渺', '特丽莎',
  '缇莉娅', '雾语', '希娅', '夏花', '小禾', '杏子', '鸢尾', '紫槿',
  '埃利诺', '奥尔贝德', '贝缇丽', '贝修丽娜', '波西亚', '达尔茜娅',
  '枫', '红宝石', '花玲', '火垂', '蓝宝石', '蓝锥', '米娜', '珀尔娜',
  '青叶', '维嘉尔', '星雁', '优叶'
];

// Static require map for avatar images
// Keys are Chinese display names, values use pinyin filenames
const avatarMap: Record<string, any> = {
  '苍兰': require('../../assets/avatars/canglan.png'),
  '尘沙': require('../../assets/avatars/chensha.png'),
  '赤霞': require('../../assets/avatars/chixia.png'),
  '冬香': require('../../assets/avatars/dongxiang.png'),
  '多娜': require('../../assets/avatars/duona.png'),
  '翡冷翠': require('../../assets/avatars/feicuili.png'),
  '风影': require('../../assets/avatars/fengying.png'),
  '格芮': require('../../assets/avatars/gerui.png'),
  '琥珀': require('../../assets/avatars/hupo.png'),
  '花原': require('../../assets/avatars/huayuan.png'),
  '焦糖': require('../../assets/avatars/jiaotang.png'),
  '璟麟': require('../../assets/avatars/jinglin.png'),
  '卡娜丝': require('../../assets/avatars/kanasi.png'),
  '卡西米拉': require('../../assets/avatars/kaximila.png'),
  '珂赛特': require('../../assets/avatars/kesaite.png'),
  '科洛妮丝': require('../../assets/avatars/keluonisi.png'),
  '菈露': require('../../assets/avatars/lalu.png'),
  '岭川': require('../../assets/avatars/lingchuan.png'),
  '密涅瓦': require('../../assets/avatars/minewo.png'),
  '千都世': require('../../assets/avatars/qiandushi.png'),
  '师渺': require('../../assets/avatars/shimiao.png'),
  '特丽莎': require('../../assets/avatars/telisha.png'),
  '缇莉娅': require('../../assets/avatars/tiliya.png'),
  '雾语': require('../../assets/avatars/wuyu.png'),
  '希娅': require('../../assets/avatars/xiya.png'),
  '夏花': require('../../assets/avatars/xiahua.png'),
  '小禾': require('../../assets/avatars/xiaohe.png'),
  '杏子': require('../../assets/avatars/xingzi.png'),
  '鸢尾': require('../../assets/avatars/yuanwei.png'),
  '紫槿': require('../../assets/avatars/zijin.png'),
  '埃利诺': require('../../assets/avatars/ailinuo.png'),
  '奥尔贝德': require('../../assets/avatars/aoerbeide.png'),
  '贝缇丽': require('../../assets/avatars/beitili.png'),
  '贝修丽娜': require('../../assets/avatars/beixiulina.png'),
  '波西亚': require('../../assets/avatars/boxiya.png'),
  '达尔茜娅': require('../../assets/avatars/daerxiya.png'),
  '枫': require('../../assets/avatars/feng.png'),
  '红宝石': require('../../assets/avatars/hongbaoshi.png'),
  '花玲': require('../../assets/avatars/hualing.png'),
  '火垂': require('../../assets/avatars/huochui.png'),
  '蓝宝石': require('../../assets/avatars/lanbaoshi.png'),
  '蓝锥': require('../../assets/avatars/lanzhui.png'),
  '米娜': require('../../assets/avatars/mina.png'),
  '珀尔娜': require('../../assets/avatars/poerna.png'),
  '青叶': require('../../assets/avatars/qingye.png'),
  '维嘉尔': require('../../assets/avatars/weijiaer.png'),
  '星雁': require('../../assets/avatars/xingyan.png'),
  '优叶': require('../../assets/avatars/youye.png'),
};

export function getAvatarSource(avatarName: string): any {
  return avatarMap[avatarName] || null;
}

// For contacts that store avatar as a path string like '/avatars/苍兰.png'
export function resolveAvatarSource(avatarPath: string): any {
  // If it's a data URI (custom avatar), return as uri
  if (avatarPath.startsWith('data:')) {
    return { uri: avatarPath };
  }
  // Extract name from path like '/avatars/苍兰.png'
  const match = avatarPath.match(/\/avatars\/(.+)\.png$/);
  if (match && avatarMap[match[1]]) {
    return avatarMap[match[1]];
  }
  // Fallback
  return avatarMap['琥珀'];
}
