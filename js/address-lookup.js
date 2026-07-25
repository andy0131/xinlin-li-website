/* ============================================================
   新林里地址快速查詢 — 比對邏輯
   資料來源見 js/address-lookup-data.js（ADDRESS_RULES / NEIGHBORHOOD_COMMUNITIES）
   ============================================================ */

'use strict';

// 依字串長度由長到短排序，避免「忠孝路」誤吃到「忠孝一路」的開頭
const ROAD_NAMES = [...new Set(ADDRESS_RULES.map(r => r.road))].sort((a, b) => b.length - a.length);

function normalizeAddress(input) {
  return input
    .trim()
    .replace(/新北市/g, '')
    .replace(/林口區/g, '')
    .replace(/\s+/g, '')
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)); // 全形數字轉半形
}

// 回傳 { road, lane, alley, number } 或 null（看不懂的格式）
function parseAddress(rawInput) {
  const input = normalizeAddress(rawInput);
  if (!input) return null;

  const road = ROAD_NAMES.find(name => input.startsWith(name));
  if (!road) return null;

  let rest = input.slice(road.length);
  let lane = null;
  let alley = null;

  const laneMatch = rest.match(/^(\d+)巷/);
  if (laneMatch) {
    lane = parseInt(laneMatch[1], 10);
    rest = rest.slice(laneMatch[0].length);
  }

  const alleyMatch = rest.match(/^(\d+)弄/);
  if (alleyMatch) {
    alley = parseInt(alleyMatch[1], 10);
    rest = rest.slice(alleyMatch[0].length);
  }

  // 主號碼，容許「之N」子號（如 392之3號）與省略「號」字
  const numMatch = rest.match(/^(\d+)(?:之\d+)?號?/);
  if (!numMatch) return null;

  const number = parseInt(numMatch[1], 10);
  if (Number.isNaN(number)) return null;

  return { road, lane, alley, number };
}

// 回傳新林里鄰別數字，或 null（查無資料）
function lookupNeighborhood(parsed) {
  const match = ADDRESS_RULES.find(r =>
    r.road === parsed.road &&
    (r.lane ?? null) === (parsed.lane ?? null) &&
    (r.alley ?? null) === (parsed.alley ?? null) &&
    parsed.number >= r.from &&
    parsed.number <= r.to &&
    (r.parity === 'all' ||
      (r.parity === 'odd' && parsed.number % 2 === 1) ||
      (r.parity === 'even' && parsed.number % 2 === 0))
  );
  return match ? match.neighborhood : null;
}

// ─── DOM 綁定 ─────────────────────────────────────────────────
const lookupForm   = document.getElementById('lookupForm');
const lookupInput  = document.getElementById('lookupInput');
const lookupResult = document.getElementById('lookupResult');

function renderResult(state, payload) {
  if (!lookupResult) return;
  lookupResult.classList.remove('is-hidden', 'lookup-result-success', 'lookup-result-notfound', 'lookup-result-invalid');

  if (state === 'success') {
    const neighborhood = payload.neighborhood;
    const communities = NEIGHBORHOOD_COMMUNITIES[neighborhood] || [];
    lookupResult.classList.add('lookup-result-success');
    lookupResult.innerHTML = `
      <div class="lookup-result-icon" aria-hidden="true">✓</div>
      <div class="lookup-result-body">
        <h3>您的地址屬於新林里 第 ${neighborhood} 鄰</h3>
        <p>恭喜！這裡是新林里的範圍，11/28(六) 別忘了投票支持謝誌謙。</p>
        ${communities.length ? `<p class="lookup-result-communities">同一鄰的社區／建案：${communities.join('、')}</p>` : ''}
      </div>
    `;
  } else if (state === 'notfound') {
    lookupResult.classList.add('lookup-result-notfound');
    lookupResult.innerHTML = `
      <div class="lookup-result-icon" aria-hidden="true">?</div>
      <div class="lookup-result-body">
        <h3>查無符合資料</h3>
        <p>這個地址目前查不到落在新林里的鄰別內，可能屬於南勢里或力行里，也可能是資料尚未涵蓋。建議對照下方地圖，或<a href="#community">聯絡我們</a>協助確認。</p>
      </div>
    `;
  } else {
    lookupResult.classList.add('lookup-result-invalid');
    lookupResult.innerHTML = `
      <div class="lookup-result-icon" aria-hidden="true">!</div>
      <div class="lookup-result-body">
        <h3>看不懂這個地址格式</h3>
        <p>請試著輸入完整門牌，例如：文化三路一段225巷10號、三民路136號。</p>
      </div>
    `;
  }
}

if (lookupForm) {
  lookupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = lookupInput.value;
    const parsed = parseAddress(value);

    if (!parsed) {
      renderResult('invalid');
      return;
    }

    const neighborhood = lookupNeighborhood(parsed);
    if (neighborhood) {
      renderResult('success', { neighborhood });
    } else {
      renderResult('notfound');
    }
  });
}
