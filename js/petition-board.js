/* ============================================================
   陳情處理進度看板 — 前端邏輯
   資料來源：Apps Script doGet（只回傳「是否公開」打勾的案件，
   且只有案件編號／類別／鄰別／公開摘要／狀態／收件時間六個欄位）
   ============================================================ */

'use strict';

const BOARD_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbwbhOiNmub0rcRxdWYeAGBe8e5961unCrAz2p-ezd-A0SBgOv0vnmurnPuXcmQefUhovA/exec';

// 狀態 → 樣式類名（沿用 petition.css 的色票）
const BOARD_STATUS_CLASS = {
  '已收件':   'case-status-received',
  '已轉報':   'case-status-forwarded',
  '處理中':   'case-status-working',
  '已完成':   'case-status-done',
  '無法處理': 'case-status-rejected',
};

// 篩選分組：把五個狀態收斂成里民看得懂的三類
const BOARD_FILTERS = [
  { key: 'all',     label: '全部',   match: () => true },
  { key: 'open',    label: '進行中', match: s => ['已收件', '已轉報', '處理中'].indexOf(s) >= 0 },
  { key: 'done',    label: '已完成', match: s => s === '已完成' },
  { key: 'blocked', label: '無法處理', match: s => s === '無法處理' },
];

const boardStats   = document.getElementById('boardStats');
const boardFilters = document.getElementById('boardFilters');
const boardList    = document.getElementById('boardList');
const boardState   = document.getElementById('boardState');
const boardUpdated = document.getElementById('boardUpdated');

let allCases = [];
let activeFilter = 'all';

if (boardList) loadBoard();

async function loadBoard() {
  showState('loading', '載入中…');

  try {
    // 看板必須反映試算表的當下狀態：你一取消勾選，重新整理就要立刻消失。
    // no-store 擋瀏覽器快取，時間戳參數擋中間層快取。
    const res = await fetch(BOARD_ENDPOINT + '?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();

    if (!data.ok) {
      showState('error', data.error || '看板暫時無法載入。');
      return;
    }

    allCases = data.cases || [];
    if (boardUpdated && data.updatedAt) {
      boardUpdated.textContent = '資料更新於 ' + data.updatedAt;
    }

    if (!allCases.length) {
      showState('empty', '目前還沒有公開的案件。新案件確認過內容、去除個資之後才會上板。');
      return;
    }

    renderStats();
    renderFilters();
    renderList();
    boardState.hidden = true;

  } catch (err) {
    showState('error', '連線出了問題，請稍後重新整理頁面。');
  }
}

function showState(kind, message) {
  boardState.className = 'board-state board-state-' + kind;
  boardState.textContent = message;
  boardState.hidden = false;
  boardList.innerHTML = '';
  if (boardStats) boardStats.hidden = true;
  if (boardFilters) boardFilters.hidden = true;
}

function countBy(matcher) {
  return allCases.filter(c => matcher(c['狀態'])).length;
}

function renderStats() {
  const stats = [
    { label: '公開案件', value: allCases.length },
    { label: '進行中',   value: countBy(BOARD_FILTERS[1].match) },
    { label: '已完成',   value: countBy(BOARD_FILTERS[2].match) },
  ];

  boardStats.innerHTML = '';
  stats.forEach(s => {
    const box = document.createElement('div');
    box.className = 'board-stat';

    const num = document.createElement('div');
    num.className = 'board-stat-value';
    num.textContent = s.value;

    const label = document.createElement('div');
    label.className = 'board-stat-label';
    label.textContent = s.label;

    box.append(num, label);
    boardStats.appendChild(box);
  });
  boardStats.hidden = false;
}

function renderFilters() {
  boardFilters.innerHTML = '';

  BOARD_FILTERS.forEach(f => {
    const count = countBy(f.match);
    if (f.key !== 'all' && count === 0) return;   // 沒有案件的分類就不顯示

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'board-filter';
    btn.textContent = f.label + '（' + count + '）';
    btn.setAttribute('aria-pressed', String(f.key === activeFilter));
    btn.addEventListener('click', () => {
      activeFilter = f.key;
      renderFilters();
      renderList();
    });
    boardFilters.appendChild(btn);
  });
  boardFilters.hidden = false;
}

function renderList() {
  const filter = BOARD_FILTERS.find(f => f.key === activeFilter) || BOARD_FILTERS[0];
  const list = allCases.filter(c => filter.match(c['狀態']));

  boardList.innerHTML = '';

  list.forEach(item => {
    const li = document.createElement('li');
    li.className = 'board-card';

    // 標頭：類別與鄰別 ＋ 狀態
    const head = document.createElement('div');
    head.className = 'board-card-head';

    const tags = document.createElement('div');
    tags.className = 'board-card-tags';

    const cat = document.createElement('span');
    cat.className = 'board-tag board-tag-cat';
    cat.textContent = item['類別'];
    tags.appendChild(cat);

    if (item['鄰別']) {
      const hood = document.createElement('span');
      hood.className = 'board-tag';
      hood.textContent = '第 ' + item['鄰別'] + ' 鄰';
      tags.appendChild(hood);
    }

    const status = document.createElement('span');
    status.className = 'case-status ' + (BOARD_STATUS_CLASS[item['狀態']] || 'case-status-received');
    status.textContent = item['狀態'];

    head.append(tags, status);

    // 摘要
    const summary = document.createElement('p');
    summary.className = 'board-card-summary';
    summary.textContent = item['公開摘要'] || '（尚未撰寫摘要）';

    // 頁尾：編號與收件日
    const foot = document.createElement('div');
    foot.className = 'board-card-foot';

    const id = document.createElement('span');
    id.className = 'board-card-id';
    id.textContent = item['案件編號'];

    const date = document.createElement('span');
    date.textContent = '受理 ' + item['收件時間'];

    foot.append(id, date);

    li.append(head, summary, foot);
    boardList.appendChild(li);
  });
}
