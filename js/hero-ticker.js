/* ============================================================
   首頁 Hero 底部：陳情成績條
   左側累計數字固定，右側單則案件每 6 秒淡出換下一則。
   資料同看板（Apps Script doGet），只含已公開、去識別化的欄位。

   三個刻意的行為：
   1. 公開案件少於 MIN_CASES 就整條不顯示 —— 空的成績條比沒有更糟
   2. 端點慢或掛掉一律靜默失敗 —— 首頁是第一印象，不能因為它壞掉
   3. 一次工作階段只打一次 API，結果存 sessionStorage
   ============================================================ */

'use strict';

const TICKER_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbwbhOiNmub0rcRxdWYeAGBe8e5961unCrAz2p-ezd-A0SBgOv0vnmurnPuXcmQefUhovA/exec';

const TICKER_MIN_CASES = 3;          // 少於這個數量就不顯示整條
const TICKER_INTERVAL = 6000;        // 每則停留毫秒數
const TICKER_FADE = 400;             // 淡出淡入毫秒數，需與 CSS transition 一致
const TICKER_CACHE_KEY = 'petition_board_cache';
// 首頁是全站流量最高的一頁，加快取是為了不要每次載入都打 Apps Script。
// 但太長會讓你在試算表改了公開狀態卻遲遲看不到，兩分鐘是折衷。
// 看板頁本身不快取，永遠即時。
const TICKER_CACHE_MS = 2 * 60 * 1000;

const TICKER_STATUS_CLASS = {
  '已收件':   'hero-ticker-dot-received',
  '已轉報':   'hero-ticker-dot-forwarded',
  '處理中':   'hero-ticker-dot-working',
  '已完成':   'hero-ticker-dot-done',
  '無法處理': 'hero-ticker-dot-rejected',
};

const tickerEl    = document.getElementById('heroTicker');
const tickerStats = document.getElementById('heroTickerStats');
const tickerFeed  = document.getElementById('heroTickerFeed');

let tickerItems = [];
let tickerIndex = 0;
let tickerTimer = null;
let tickerPaused = false;

if (tickerEl) initTicker();

async function initTicker() {
  const cases = await fetchBoard();
  if (!cases || cases.length < TICKER_MIN_CASES) return;   // 靜默不顯示

  tickerItems = cases;
  renderTickerStats(cases);
  renderTickerItem(cases[0]);

  tickerEl.hidden = false;
  document.getElementById('hero').classList.add('has-ticker');

  // 系統設定要求減少動畫時，只顯示最新一則，不輪換
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || cases.length < 2) return;

  tickerEl.addEventListener('mouseenter', () => { tickerPaused = true; });
  tickerEl.addEventListener('mouseleave', () => { tickerPaused = false; });
  tickerEl.addEventListener('focus', () => { tickerPaused = true; });
  tickerEl.addEventListener('blur', () => { tickerPaused = false; });

  // 分頁切到背景時不必空轉
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopTicker(); else startTicker();
  });

  startTicker();
}

async function fetchBoard() {
  try {
    const cached = sessionStorage.getItem(TICKER_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.at < TICKER_CACHE_MS) return parsed.cases;
    }
  } catch (err) {
    // sessionStorage 被停用或內容壞掉都不是問題，重新抓一次就好
  }

  try {
    const res = await fetch(TICKER_ENDPOINT + '?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    if (!data.ok) return null;

    try {
      sessionStorage.setItem(TICKER_CACHE_KEY, JSON.stringify({ at: Date.now(), cases: data.cases }));
    } catch (err) { /* 無痕模式寫不進去，不影響顯示 */ }

    return data.cases;
  } catch (err) {
    return null;   // 端點慢或掛掉：整條不顯示，首頁其餘部分完全不受影響
  }
}

function renderTickerStats(cases) {
  const done = cases.filter(c => c['狀態'] === '已完成').length;
  tickerStats.textContent = '公開 ' + cases.length + ' 件 · 已完成 ' + done + ' 件';
}

function renderTickerItem(item) {
  tickerFeed.innerHTML = '';

  const dot = document.createElement('span');
  dot.className = 'hero-ticker-dot ' + (TICKER_STATUS_CLASS[item['狀態']] || '');
  dot.setAttribute('aria-hidden', 'true');

  const status = document.createElement('span');
  status.className = 'hero-ticker-status';
  status.textContent = item['狀態'];

  const text = document.createElement('span');
  text.className = 'hero-ticker-text';
  text.textContent = (item['鄰別'] ? '第 ' + item['鄰別'] + ' 鄰　' : '') + (item['公開摘要'] || item['類別']);

  tickerFeed.append(dot, status, text);
}

function startTicker() {
  stopTicker();
  tickerTimer = setInterval(() => {
    if (tickerPaused) return;
    tickerIndex = (tickerIndex + 1) % tickerItems.length;

    tickerFeed.classList.add('is-fading');
    setTimeout(() => {
      renderTickerItem(tickerItems[tickerIndex]);
      tickerFeed.classList.remove('is-fading');
    }, TICKER_FADE);
  }, TICKER_INTERVAL);
}

function stopTicker() {
  if (tickerTimer) clearInterval(tickerTimer);
  tickerTimer = null;
}
