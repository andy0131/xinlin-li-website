/* ============================================================
   新林里地址快速查詢 — 資料來源
   1. ADDRESS_RULES：新北市林口區新林里轄鄰調整明細表（門牌 → 鄰別）
   2. NEIGHBORHOOD_COMMUNITIES：新林里新鄰別社區對照（鄰別 → 社區／建案名稱）
   ============================================================ */

'use strict';

// road：道路全名（含一/二/三段）。lane/alley：巷／弄號碼，無則為 null。
// from/to：門牌主號碼區間（「之N」一律取主號碼，同號視為同棟同鄰）。
// parity：'odd'（單號）｜'even'（雙號）｜'all'（單雙皆含或單一門牌）。
const ADDRESS_RULES = [
  // ── 1 鄰 ──
  { road: '文化北路一段', lane: null, alley: null, from: 360, to: 398, parity: 'even', neighborhood: 1 },
  { road: '民族路',       lane: null, alley: null, from: 1,   to: 1,   parity: 'all',  neighborhood: 1 },
  { road: '民族路',       lane: null, alley: null, from: 9,   to: 9,   parity: 'all',  neighborhood: 1 },
  { road: '民族路',       lane: 61,   alley: null, from: 1,   to: 11,  parity: 'all',  neighborhood: 1 },
  { road: '民族路',       lane: null, alley: null, from: 63,  to: 63,  parity: 'all',  neighborhood: 1 },
  { road: '忠孝一路',     lane: null, alley: null, from: 26,  to: 82,  parity: 'even', neighborhood: 1 },
  { road: '忠孝一路',     lane: 78,   alley: null, from: 2,   to: 2,   parity: 'all',  neighborhood: 1 },
  { road: '忠孝一路',     lane: 78,   alley: null, from: 9,   to: 9,   parity: 'all',  neighborhood: 1 },
  { road: '忠孝路',       lane: null, alley: null, from: 32,  to: 38,  parity: 'even', neighborhood: 1 },
  { road: '南勢街',       lane: null, alley: null, from: 110, to: 128, parity: 'even', neighborhood: 1 },

  // ── 2 鄰 ──
  { road: '民族路',   lane: null, alley: null, from: 2,  to: 30, parity: 'even', neighborhood: 2 },
  { road: '忠孝一路', lane: null, alley: null, from: 12, to: 22, parity: 'even', neighborhood: 2 },
  { road: '南勢街',   lane: null, alley: null, from: 19, to: 23, parity: 'odd',  neighborhood: 2 },
  { road: '南勢街',   lane: null, alley: null, from: 33, to: 33, parity: 'all',  neighborhood: 2 },

  // ── 3 鄰 ──
  { road: '文化三路一段', lane: null, alley: null, from: 359, to: 395, parity: 'odd',  neighborhood: 3 },
  { road: '忠孝路',       lane: null, alley: null, from: 120, to: 130, parity: 'even', neighborhood: 3 },
  { road: '忠孝路',       lane: 256,  alley: null, from: 11,  to: 17,  parity: 'odd',  neighborhood: 3 },

  // ── 4 鄰 ──
  { road: '三民路',       lane: null, alley: null, from: 180, to: 186, parity: 'even', neighborhood: 4 },
  { road: '文化三路一段', lane: 249,  alley: null, from: 85,  to: 91,  parity: 'all',  neighborhood: 4 },
  { road: '文化三路一段', lane: null, alley: null, from: 303, to: 341, parity: 'odd',  neighborhood: 4 },
  { road: '忠孝一路',     lane: null, alley: null, from: 1,   to: 43,  parity: 'odd',  neighborhood: 4 },

  // ── 5 鄰 ──
  { road: '三民路',       lane: null, alley: null, from: 168, to: 178, parity: 'even', neighborhood: 5 },
  { road: '文化三路一段', lane: 225,  alley: null, from: 6,   to: 32,  parity: 'even', neighborhood: 5 },
  { road: '文化三路一段', lane: null, alley: null, from: 227, to: 247, parity: 'odd',  neighborhood: 5 },
  { road: '文化三路一段', lane: 249,  alley: null, from: 20,  to: 79,  parity: 'all',  neighborhood: 5 },

  // ── 6 鄰 ──
  { road: '文化北路一段', lane: null, alley: null, from: 332, to: 338, parity: 'all', neighborhood: 6 },
  { road: '文明街',       lane: 138,  alley: null, from: 31,  to: 43,  parity: 'all', neighborhood: 6 },
  { road: '文明街',       lane: null, alley: null, from: 182, to: 185, parity: 'all', neighborhood: 6 },

  // ── 7 鄰 ──
  { road: '三民路',       lane: null, alley: null, from: 111, to: 111, parity: 'all',  neighborhood: 7 },
  { road: '三民路',       lane: 175,  alley: null, from: 2,   to: 10,  parity: 'all',  neighborhood: 7 },
  { road: '三民路',       lane: null, alley: null, from: 185, to: 185, parity: 'all',  neighborhood: 7 },
  { road: '文化北路一段', lane: null, alley: null, from: 258, to: 290, parity: 'even', neighborhood: 7 },
  { road: '文明街',       lane: null, alley: null, from: 128, to: 136, parity: 'all',  neighborhood: 7 },
  { road: '文明街',       lane: 138,  alley: null, from: 2,   to: 2,   parity: 'all',  neighborhood: 7 },
  { road: '忠孝三路',     lane: null, alley: null, from: 110, to: 118, parity: 'even', neighborhood: 7 },

  // ── 8 鄰 ──
  { road: '三民路',       lane: null, alley: null, from: 136, to: 136, parity: 'all',  neighborhood: 8 },
  { road: '三民路',       lane: null, alley: null, from: 122, to: 128, parity: 'all',  neighborhood: 8 },
  { road: '文化三路一段', lane: 191,  alley: null, from: 2,   to: 59,  parity: 'all',  neighborhood: 8 },
  { road: '文化三路一段', lane: null, alley: null, from: 195, to: 223, parity: 'odd',  neighborhood: 8 },
  { road: '文化三路一段', lane: 225,  alley: null, from: 1,   to: 13,  parity: 'odd',  neighborhood: 8 },

  // ── 9 鄰 ──
  { road: '三民路',       lane: null, alley: null, from: 92,  to: 108, parity: 'even', neighborhood: 9 },
  { road: '三民路',       lane: 112,  alley: null, from: 6,   to: 8,   parity: 'even', neighborhood: 9 },
  { road: '文化三路一段', lane: null, alley: null, from: 165, to: 181, parity: 'odd',  neighborhood: 9 },
  { road: '文化三路一段', lane: null, alley: null, from: 189, to: 189, parity: 'all',  neighborhood: 9 },
  { road: '文化三路一段', lane: 191,  alley: null, from: 3,   to: 27,  parity: 'odd',  neighborhood: 9 },
  { road: '忠孝三路',     lane: null, alley: null, from: 16,  to: 46,  parity: 'even', neighborhood: 9 },

  // ── 10 鄰 ──
  { road: '文化三路一段', lane: 39,   alley: null, from: 275, to: 299, parity: 'odd', neighborhood: 10 },
  { road: '文化三路一段', lane: null, alley: null, from: 101, to: 125, parity: 'odd', neighborhood: 10 },
  { road: '忠孝三路',     lane: null, alley: null, from: 5,   to: 75,  parity: 'odd', neighborhood: 10 },

  // ── 11 鄰 ──
  { road: '三民路',       lane: null, alley: null, from: 101, to: 101, parity: 'all',  neighborhood: 11 },
  { road: '文化北路一段', lane: null, alley: null, from: 178, to: 222, parity: 'even', neighborhood: 11 },
  { road: '文明街',       lane: null, alley: null, from: 75,  to: 75,  parity: 'all',  neighborhood: 11 },
  { road: '文明街',       lane: null, alley: null, from: 76,  to: 76,  parity: 'all',  neighborhood: 11 },

  // ── 12 鄰 ──
  { road: '八德路',       lane: null, alley: null, from: 472, to: 472, parity: 'all',  neighborhood: 12 },
  { road: '八德路',       lane: null, alley: null, from: 498, to: 498, parity: 'all',  neighborhood: 12 },
  { road: '八德路',       lane: 500,  alley: null, from: 13,  to: 66,  parity: 'all',  neighborhood: 12 },
  { road: '三民路',       lane: null, alley: null, from: 75,  to: 75,  parity: 'all',  neighborhood: 12 },
  { road: '井泉街',       lane: null, alley: null, from: 58,  to: 64,  parity: 'even', neighborhood: 12 },
  { road: '文化北路一段', lane: null, alley: null, from: 28,  to: 68,  parity: 'even', neighborhood: 12 },
  { road: '文化北路一段', lane: null, alley: null, from: 136, to: 136, parity: 'all',  neighborhood: 12 },
  { road: '文化北路一段', lane: 60,   alley: null, from: 8,   to: 112, parity: 'all',  neighborhood: 12 },
  { road: '惠民街',       lane: null, alley: null, from: 39,  to: 53,  parity: 'odd',  neighborhood: 12 },

  // ── 13 鄰 ──
  { road: '八德路', lane: null, alley: null, from: 408, to: 470, parity: 'even', neighborhood: 13 },
  { road: '三民路', lane: null, alley: null, from: 15,  to: 73,  parity: 'odd',  neighborhood: 13 },
  { road: '惠民街', lane: null, alley: null, from: 2,   to: 56,  parity: 'even', neighborhood: 13 },
  { road: '惠民街', lane: 30,   alley: null, from: 21,  to: 29,  parity: 'all',  neighborhood: 13 },
  { road: '惠民街', lane: 38,   alley: null, from: 2,   to: 38,  parity: 'even', neighborhood: 13 },
  { road: '惠民街', lane: 88,   alley: null, from: 1,   to: 11,  parity: 'odd',  neighborhood: 13 },

  // ── 14 鄰 ──
  { road: '三民路',       lane: null, alley: null, from: 36,  to: 58,  parity: 'even', neighborhood: 14 },
  { road: '文化三路一段', lane: 39,   alley: 116,  from: 1,   to: 9,   parity: 'odd',  neighborhood: 14 },
  { road: '文化三路一段', lane: 39,   alley: null, from: 118, to: 213, parity: 'all',  neighborhood: 14 },

  // ── 15 鄰 ──
  { road: '三民路',       lane: null, alley: null, from: 18, to: 32,  parity: 'even', neighborhood: 15 },
  { road: '文化三路一段', lane: 39,   alley: null, from: 96, to: 179, parity: 'all',  neighborhood: 15 },
  { road: '文化三路一段', lane: null, alley: null, from: 61, to: 87,  parity: 'odd',  neighborhood: 15 },

  // ── 16 鄰 ──
  { road: '八德路',       lane: null, alley: null, from: 316, to: 369, parity: 'all', neighborhood: 16 },
  { road: '文化三路一段', lane: null, alley: null, from: 1,   to: 37,  parity: 'odd', neighborhood: 16 },
  { road: '文化三路一段', lane: 39,   alley: null, from: 1,   to: 17,  parity: 'odd', neighborhood: 16 },

  // ── 17 鄰 ──
  { road: '八德路',       lane: null, alley: null, from: 236, to: 290, parity: 'even', neighborhood: 17 },
  { road: '文化二路一段', lane: null, alley: null, from: 1,   to: 1,   parity: 'all',  neighborhood: 17 },
  { road: '文化二路一段', lane: null, alley: null, from: 123, to: 123, parity: 'all',  neighborhood: 17 },
  { road: '文化三路一段', lane: null, alley: null, from: 2,   to: 2,   parity: 'all',  neighborhood: 17 },
  { road: '文化三路一段', lane: null, alley: null, from: 6,   to: 6,   parity: 'all',  neighborhood: 17 },
  { road: '文化三路一段', lane: null, alley: null, from: 302, to: 302, parity: 'all',  neighborhood: 17 },
  { road: '忠孝二路',     lane: null, alley: null, from: 55,  to: 55,  parity: 'all',  neighborhood: 17 },
  { road: '忠孝二路',     lane: null, alley: null, from: 57,  to: 57,  parity: 'all',  neighborhood: 17 },

  // ── 18 鄰 ──
  { road: '文化三路一段', lane: null, alley: null, from: 356, to: 366, parity: 'all', neighborhood: 18 },
  { road: '文化三路一段', lane: null, alley: null, from: 368, to: 368, parity: 'all', neighborhood: 18 },

  // ── 19 鄰 ──
  { road: '文化三路一段', lane: null, alley: null, from: 370, to: 370, parity: 'all', neighborhood: 19 },
  { road: '文化三路一段', lane: null, alley: null, from: 372, to: 372, parity: 'all', neighborhood: 19 },
  { road: '文化三路一段', lane: null, alley: null, from: 374, to: 374, parity: 'all', neighborhood: 19 },

  // ── 20 鄰 ──
  { road: '文化三路一段', lane: null, alley: null, from: 376, to: 382, parity: 'even', neighborhood: 20 },
  { road: '文化三路一段', lane: null, alley: null, from: 384, to: 390, parity: 'even', neighborhood: 20 },

  // ── 21 鄰 ──
  { road: '文化三路一段', lane: null, alley: null, from: 392, to: 392, parity: 'all',  neighborhood: 21 },
  { road: '文化三路一段', lane: 394,  alley: null, from: 2,   to: 10,  parity: 'even', neighborhood: 21 },

  // ── 22 鄰 ──
  { road: '文化二路一段', lane: 241, alley: null, from: 26,  to: 28,  parity: 'even', neighborhood: 22 },
  { road: '文化三路一段', lane: 394, alley: null, from: 1,   to: 36,  parity: 'all',  neighborhood: 22 },
  { road: '忠孝路',       lane: null, alley: null, from: 132, to: 306, parity: 'even', neighborhood: 22 },
  { road: '忠孝路',       lane: 308,  alley: null, from: 2,   to: 20,  parity: 'even', neighborhood: 22 },

  // ── 23 鄰 ──
  { road: '文化二路一段', lane: null, alley: null, from: 269, to: 289, parity: 'odd', neighborhood: 23 },
  { road: '忠孝路',       lane: 308,  alley: null, from: 15,  to: 23,  parity: 'odd', neighborhood: 23 },
  { road: '忠孝路',       lane: null, alley: null, from: 314, to: 314, parity: 'all', neighborhood: 23 },
  { road: '文化三路一段', lane: 394,  alley: null, from: 37,  to: 39,  parity: 'all', neighborhood: 23 },
];

// 鄰別 → 社區／建案名稱（來自「新林里新鄰別社區對照」圖，僅供輔助二次確認，非正式門牌資料）
const NEIGHBORHOOD_COMMUNITIES = {
  1:  ['三井六富', '京硯米蘭', '愛家滙', '城市之洲', '蘭會所'],
  2:  ['森聯CLASSY HOME', '森JIA', '竹城宮崎', '麗江清久', '和毅上景'],
  3:  ['公園苑', '築禾忠孝苑', '立軒天諾', '羅芙宮', '福樺謙禮'],
  4:  ['三井3錦', '冠東方', '新東方花園', '春見築'],
  5:  ['大觀天下', '巴黎香頌', '力璞玉', '如意貴築', '文化爵士', '文化捷境'],
  6:  ['京澄謙隱', '春木日和'],
  7:  ['力璞之星', '麗池桂冠'],
  8:  ['帝晶', '長虹交響苑', '躍世紀', '峰閣', '呈冠禮樂'],
  9:  ['富堡晶林', '世界極', '峯輝金典', '長耀初', '福樺謙璽', '品竣靜悅', '泓昇WISH', '德馨居V'],
  10: ['巴黎香榭', '圓方大千苑', '長耀双丰卉', '世紀長虹'],
  11: ['雙橡園'],
  12: ['群祥悅', '群祥囍', '群祥樂', '銘達樓', '山侘一生', '國瑋尊爵', '盛德藝', '國璽雅居', '富堡晶棧', '宏樸曉霧'],
  13: ['盛德富', '時尚A9', '聯太淳青', '禾林A9棧'],
  14: ['耀東方', '甄美A9', '德馨居NO.3'],
  15: ['森聯摩天41', '文化錄', '光之御所日光區', '森RICH', '亞昕星空樹', '富堡晶鑄'],
  16: ['大觀園二期', '翡翠大道', '林口晴空樹', '璽來登帝寶'],
  17: ['冠德鼎捷'],
  18: ['遠雄未來城二期'],
  19: ['遠雄未來城二期'],
  20: ['遠雄未來城一期'],
  21: ['遠雄未來城一期'],
  22: ['玄泰文華', '文化逸靚', '九揚華冠', '世界之洲', '亞昕奇瓦頌'],
  23: ['福樺大觀文明', '亞昕101', '呈冠禮讚'],
};
