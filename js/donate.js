/* ============================================================
   政治獻金捐款回報 — 前端邏輯
   後端：Google Apps Script Web App（見 tools/donation/Code.gs）

   這支表單不收錢。捐款人是先匯款到政治獻金專戶，再用這張表
   把開立受贈收據所需要的身分資料交給我們 —— 匯款單上只有金額
   和帳號，沒有姓名、身分證字號與地址，收據就開不出來。
   ============================================================ */

'use strict';

/* ------------------------------------------------------------
   ⚠ 上線開關 —— 取得監察院許可函之前一律維持 false。

   政治獻金法第 10 條第 1 項：專戶須報經監察院許可「後」始得收受
   政治獻金；第 26 條：未經許可而收受者處三年以下有期徒刑，得併科
   20 萬～100 萬元罰金，代收的親友、志工同罰。

   許可函送達後才做這三件事，缺一不可：
     1. 這裡改成 true
     2. 下面 ACCOUNT 的四個欄位填上實際資料
     3. tools/donation/Code.gs 的 CONFIG.PERMIT_GRANTED 也改成 true 並重新部署
   ------------------------------------------------------------ */
const DONATION_LIVE = false;

// 專戶資訊。許可函到達前刻意留空 —— 帳號一旦出現在網頁原始碼裡，
// 就可能有人在許可生效前匯款進來，那筆錢會直接讓候選人踩到第 26 條。
const ACCOUNT = {
  permitNo:    '',    // 監察院許可函文號
  bank:        '',    // 銀行與分行
  accountName: '',    // 戶名（格式：115年新北市林口區新林里里長擬參選人○○○政治獻金專戶）
  accountNo:   '',    // 帳號
};

const DONATION_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwAsXBODoIszfMj_umSpiIOCFZihk2InFYlG--XoXNIUeRtVpN8m_Hqx49Aif0iv5oGEA/exec';

// 收受期間（政治獻金法 §12 Ⅰ④，監察院 115/2/9 公告）。
// 必須與後端 Code.gs 的 CONFIG.PERIOD_START / PERIOD_END 一致。
const PERIOD_START = '2026-08-20';
const PERIOD_END   = '2026-11-27';

// 法定金額門檻。必須與後端 Code.gs 的 CONFIG 一致。
const MAX_PER_PERSON_YEAR = 100000;   // §18　個人對同一擬參選人每年上限
const TIER_FULL_DATA      = 30000;    // 準則 §15　逾此金額須留完整身分證字號與地址

// 捐款方式。必須與後端 Code.gs 的 METHODS 完全一致。
const DONATION_METHODS = [
  { name: '匯款',      needLast5: true  },
  { name: 'ATM 轉帳',  needLast5: true  },
  { name: '現金',      needLast5: false },
  { name: '支票',      needLast5: false },
];

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 30000];

const COOLDOWN_MS = 30 * 1000;
const COOLDOWN_KEY = 'donation_last_submit';

// ─── DOM ─────────────────────────────────────────────────────
const dfForm      = document.getElementById('donateForm');
const dfPending   = document.getElementById('pendingNotice');
const dfLiveWrap  = document.getElementById('liveContent');
const dfAccount   = document.getElementById('accountBlock');
const dfMethodGrid = document.getElementById('methodGrid');
const dfAmountGrid = document.getElementById('amountGrid');
const dfAmount    = document.getElementById('amountInput');
const dfAmountNote = document.getElementById('amountNote');
const dfDate      = document.getElementById('dateInput');
const dfLast5Field = document.getElementById('last5Field');
const dfLast5     = document.getElementById('last5Input');
const dfName      = document.getElementById('nameInput');
const dfId        = document.getElementById('idInput');
const dfIdNote    = document.getElementById('idNote');
const dfIdTag     = document.getElementById('idTag');
const dfAddress   = document.getElementById('addressInput');
const dfAddressTag = document.getElementById('addressTag');
const dfPhone     = document.getElementById('phoneInput');
const dfEmail     = document.getElementById('emailInput');
const dfNote      = document.getElementById('noteInput');
const dfDeclare   = document.getElementById('declareCheck');
const dfHoneypot  = document.getElementById('dfWebsite');
const dfError     = document.getElementById('formError');
const dfSubmit    = document.getElementById('submitBtn');
const dfDone      = document.getElementById('donateDone');
const dfDoneId    = document.getElementById('reportId');
const dfDoneCode  = document.getElementById('reportCode');
const dfAgainBtn  = document.getElementById('againBtn');

// 狀態查詢
const sForm   = document.getElementById('statusForm');
const sId     = document.getElementById('statusIdInput');
const sCode   = document.getElementById('statusCodeInput');
const sSubmit = document.getElementById('statusSubmit');
const sError  = document.getElementById('statusError');
const sResult = document.getElementById('statusResult');

const state = { method: null };

const donateSrc = new URLSearchParams(location.search).get('src') || 'web';

if (dfForm) init();

function init() {
  applyGate();
  if (!DONATION_LIVE) return;

  renderAccount();
  renderMethods();
  renderAmounts();
  bindAmount();
  bindId();
  bindDate();
  bindSubmit();
  bindStatusLookup();

  dfAgainBtn.addEventListener('click', () => {
    resetForm();
    dfDone.hidden = true;
    dfForm.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------- 上線閘門 ---------- */

// 許可函還沒到就不顯示專戶資訊與表單，只留一段說明。
// 這不只是體驗問題 —— 提前收到的每一筆錢都是刑責。
function applyGate() {
  dfPending.hidden = DONATION_LIVE;
  dfLiveWrap.hidden = !DONATION_LIVE;
}

function renderAccount() {
  const rows = [
    ['戶名', ACCOUNT.accountName],
    ['銀行', ACCOUNT.bank],
    ['帳號', ACCOUNT.accountNo],
    ['監察院許可文號', ACCOUNT.permitNo],
  ];
  dfAccount.innerHTML = '';

  rows.forEach(([label, value]) => {
    if (!value) return;
    const row = document.createElement('div');
    row.className = 'acct-row';

    const dt = document.createElement('span');
    dt.className = 'acct-label';
    dt.textContent = label;

    const dd = document.createElement('span');
    dd.className = 'acct-value' + (label === '帳號' ? ' acct-value-no' : '');
    dd.textContent = value;

    row.append(dt, dd);
    dfAccount.appendChild(row);
  });
}

/* ---------- ① 捐款方式 ---------- */

function renderMethods() {
  DONATION_METHODS.forEach(m => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-chip';
    btn.textContent = m.name;
    btn.dataset.name = m.name;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => selectMethod(m));
    dfMethodGrid.appendChild(btn);
  });
}

function selectMethod(m) {
  state.method = m;
  dfMethodGrid.querySelectorAll('.cat-chip').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.name === m.name));
  });
  // 匯款與轉帳要靠後五碼對帳；現金與支票是當面交付，沒有這組號碼
  dfLast5Field.hidden = !m.needLast5;
  clearError();
}

/* ---------- ② 金額 ---------- */

function renderAmounts() {
  PRESET_AMOUNTS.forEach(v => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'amount-chip';
    btn.textContent = fmtMoney(v);
    btn.addEventListener('click', () => {
      dfAmount.value = v;
      syncAmountTier();
      dfAmount.focus();
    });
    dfAmountGrid.appendChild(btn);
  });
}

function bindAmount() {
  dfAmount.addEventListener('input', syncAmountTier);
}

// 查核準則第 15 條的分級記載：金額越大，收據上必須登載的資料越完整。
// 表單即時把「選填」翻成「必填」，並說明是哪一條規定要求的。
function syncAmountTier() {
  const amount = Number(dfAmount.value);
  clearError();

  if (!dfAmount.value.trim()) {
    dfAmountNote.hidden = true;
    setTier(false);
    return;
  }

  if (amount > MAX_PER_PERSON_YEAR) {
    dfAmountNote.className = 'addr-note addr-note-miss';
    dfAmountNote.textContent = '依政治獻金法第 18 條，個人對同一擬參選人每年捐贈上限為 '
      + fmtMoney(MAX_PER_PERSON_YEAR) + ' 元，超過的部分依法不能收受。';
    dfAmountNote.hidden = false;
    setTier(true);
    return;
  }

  const full = amount > TIER_FULL_DATA;
  setTier(full);

  if (full) {
    dfAmountNote.className = 'addr-note addr-note-hit';
    dfAmountNote.textContent = '超過 ' + fmtMoney(TIER_FULL_DATA)
      + ' 元的捐款，受贈收據依規定必須登載身分證字號與戶籍地址，下面兩欄請務必填寫。';
    dfAmountNote.hidden = false;
  } else {
    dfAmountNote.hidden = true;
  }
}

function setTier(full) {
  dfIdTag.textContent = full ? '必填' : '選填';
  dfIdTag.className = 'pf-tag ' + (full ? 'pf-tag-required' : 'pf-tag-optional');
  dfAddressTag.textContent = full ? '必填' : '選填';
  dfAddressTag.className = 'pf-tag ' + (full ? 'pf-tag-required' : 'pf-tag-optional');
}

/* ---------- ③ 身分證字號 ---------- */

function bindId() {
  dfId.addEventListener('input', () => {
    dfId.value = dfId.value.toUpperCase();
    clearError();
    checkId();
  });
  dfId.addEventListener('blur', checkId);
}

function checkId() {
  const value = dfId.value.trim();
  if (!value) {
    dfIdNote.hidden = true;
    return;
  }
  if (validTaiwanId(value)) {
    dfIdNote.className = 'addr-note addr-note-hit';
    dfIdNote.textContent = '格式正確。';
  } else {
    dfIdNote.className = 'addr-note addr-note-miss';
    dfIdNote.textContent = '這組身分證字號的檢查碼不正確，請再確認一次 —— 收據上的字號錯了，報稅時會對不上。';
  }
  dfIdNote.hidden = false;
}

// 中華民國國民身分證統一編號檢查碼。
// 後端 Code.gs 有一份相同邏輯（前端擋手滑、後端擋惡意），改動時兩邊必須同步。
function validTaiwanId(id) {
  if (!/^[A-Z][12]\d{8}$/.test(id)) return false;

  // 字母代碼：索引 + 10 即為該字母的兩位數值（A=10 … I=34、O=35）
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVXYWZIO';
  const letterValue = LETTERS.indexOf(id.charAt(0)) + 10;
  if (letterValue < 10) return false;

  let sum = Math.floor(letterValue / 10) + (letterValue % 10) * 9;
  for (let i = 1; i <= 8; i++) {
    sum += Number(id.charAt(i)) * (9 - i);
  }
  sum += Number(id.charAt(9));
  return sum % 10 === 0;
}

/* ---------- ④ 日期 ---------- */

function bindDate() {
  const today = localDate();
  dfDate.min = PERIOD_START;
  dfDate.max = today < PERIOD_END ? today : PERIOD_END;
  dfDate.addEventListener('change', clearError);
}

// 不能用 toISOString()：它給的是 UTC 日期，台灣是 UTC+8，
// 凌晨 0 點到 8 點之間會算成前一天，害當天捐款的人選不到今天。
function localDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/* ---------- 送出 ---------- */

function bindSubmit() {
  dfForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const problem = validate();
    if (problem) {
      showError(problem.message);
      problem.focus?.();
      return;
    }

    const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    const wait = COOLDOWN_MS - (Date.now() - last);
    if (wait > 0) {
      showError('剛剛才送出過，請 ' + Math.ceil(wait / 1000) + ' 秒後再送下一筆。');
      return;
    }

    setSending(true);
    clearError();

    try {
      // Apps Script 不處理 CORS preflight，必須用 text/plain 送出 JSON 字串
      const res = await fetch(DONATION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          name:      dfName.value.trim(),
          idNumber:  dfId.value.trim().toUpperCase(),
          address:   dfAddress.value.trim(),
          phone:     dfPhone.value.trim(),
          email:     dfEmail.value.trim(),
          amount:    Number(dfAmount.value),
          donatedAt: dfDate.value,
          method:    state.method.name,
          last5:     state.method.needLast5 ? dfLast5.value.trim() : '',
          note:      dfNote.value.trim(),
          declare:   dfDeclare.checked,
          src:       donateSrc,
          hp:        dfHoneypot.value,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        showError(data.error || '送出失敗，請稍後再試。');
        setSending(false);
        return;
      }

      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      dfDoneId.textContent = data.reportId;
      dfDoneCode.textContent = data.code || '—';
      dfForm.hidden = true;
      dfDone.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      setSending(false);
      showError('網路連線出了問題，資料沒有送出。請確認網路後再試一次，或直接來電 0968-013-131。');
    }
  });
}

function validate() {
  if (!state.method) {
    return { message: '請先選擇捐款方式。', focus: () => scrollToStep('stepMethod') };
  }

  const amount = Number(dfAmount.value);
  if (!dfAmount.value.trim() || !isFinite(amount) || amount <= 0 || Math.floor(amount) !== amount) {
    return { message: '請填寫捐款金額（整數）。', focus: () => dfAmount.focus() };
  }
  if (amount > MAX_PER_PERSON_YEAR) {
    return {
      message: '依政治獻金法第 18 條，個人對同一擬參選人每年捐贈上限為 '
        + fmtMoney(MAX_PER_PERSON_YEAR) + ' 元。',
      focus: () => dfAmount.focus(),
    };
  }

  if (!dfDate.value) {
    return { message: '請選擇捐款日期。', focus: () => dfDate.focus() };
  }
  if (dfDate.value < PERIOD_START || dfDate.value > PERIOD_END) {
    return {
      message: '捐款日期須在法定收受期間（' + PERIOD_START + ' 至 ' + PERIOD_END + '）內。',
      focus: () => dfDate.focus(),
    };
  }

  if (state.method.needLast5 && !/^\d{5}$/.test(dfLast5.value.trim())) {
    return {
      message: '請填寫匯款帳號的後五碼（5 位數字），這是我們對帳時唯一的比對依據。',
      focus: () => dfLast5.focus(),
    };
  }

  if (!dfName.value.trim()) {
    return { message: '請填寫捐款人姓名，收據要用。', focus: () => dfName.focus() };
  }
  if (!dfPhone.value.trim()) {
    return { message: '請填寫聯絡電話，對帳有疑問時我們才找得到您。', focus: () => dfPhone.focus() };
  }

  const idValue = dfId.value.trim();
  const full = amount > TIER_FULL_DATA;

  if (full && !idValue) {
    return {
      message: '超過 ' + fmtMoney(TIER_FULL_DATA)
        + ' 元的捐款，依政治獻金查核準則第 15 條，收據必須登載身分證字號。',
      focus: () => dfId.focus(),
    };
  }
  if (full && !dfAddress.value.trim()) {
    return {
      message: '超過 ' + fmtMoney(TIER_FULL_DATA)
        + ' 元的捐款，依政治獻金查核準則第 15 條，收據必須登載戶籍地址。',
      focus: () => dfAddress.focus(),
    };
  }
  if (idValue && !validTaiwanId(idValue)) {
    return { message: '身分證字號的檢查碼不正確，請再確認一次。', focus: () => dfId.focus() };
  }

  if (!dfDeclare.checked) {
    return {
      message: '請閱讀並勾選捐款人聲明事項 —— 捐贈資格是法律的硬性規定，我們需要您先確認。',
      focus: () => scrollToStep('stepDeclare'),
    };
  }
  return null;
}

function scrollToStep(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setSending(sending) {
  dfSubmit.disabled = sending;
  dfSubmit.textContent = sending ? '送出中…' : '送出回報';
}

function showError(message) {
  dfError.textContent = message;
  dfError.hidden = false;
}

function clearError() {
  dfError.hidden = true;
}

function fmtMoney(n) {
  return String(Number(n) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ---------- 查詢處理狀態 ---------- */

const STATUS_CLASS = {
  '未對帳':   'case-status-received',
  '已對帳':   'case-status-working',
  '已開收據': 'case-status-forwarded',
  '已交付':   'case-status-done',
  '退還':     'case-status-rejected',
  '繳庫':     'case-status-rejected',
};

function bindStatusLookup() {
  sForm.addEventListener('submit', (e) => {
    e.preventDefault();
    runStatusLookup(sId.value, sCode.value);
  });
}

async function runStatusLookup(rawId, rawCode) {
  const id = rawId.trim().toUpperCase();
  const code = rawCode.trim().toUpperCase();

  sResult.hidden = true;
  sError.hidden = true;

  if (!id || !code) {
    showStatusError('請同時輸入回報編號與查詢碼。');
    return;
  }

  sSubmit.disabled = true;
  sSubmit.textContent = '查詢中…';

  try {
    const url = DONATION_ENDPOINT
      + '?action=status&id=' + encodeURIComponent(id)
      + '&code=' + encodeURIComponent(code);
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      showStatusError(data.error || '查詢失敗，請稍後再試。');
      return;
    }
    renderStatus(data.report);

  } catch (err) {
    showStatusError('網路連線出了問題，請稍後再試一次。');
  } finally {
    sSubmit.disabled = false;
    sSubmit.textContent = '查詢';
  }
}

function renderStatus(item) {
  const status = item['狀態'] || '未對帳';
  const statusClass = STATUS_CLASS[status] || 'case-status-received';

  const rows = [
    ['捐款金額', item['金額'] ? item['金額'] + ' 元' : ''],
    ['捐款日期', item['捐款日期']],
    ['收據編號', item['收據編號']],
    ['說明',     item['處理備註']],
  ];

  sResult.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'case-result-head';

  const idEl = document.createElement('span');
  idEl.className = 'case-result-id';
  idEl.textContent = item['回報編號'];

  const statusEl = document.createElement('span');
  statusEl.className = 'case-status ' + statusClass;
  statusEl.textContent = status;

  head.append(idEl, statusEl);

  const list = document.createElement('dl');
  list.className = 'case-fields';
  rows.forEach(([label, value]) => {
    const field = document.createElement('div');
    field.className = 'case-field';
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value || '';   // 空值由 CSS 補上破折號
    field.append(dt, dd);
    list.appendChild(field);
  });

  sResult.append(head, list);
  sResult.hidden = false;
}

function showStatusError(message) {
  sError.textContent = message;
  sError.hidden = false;
}

function resetForm() {
  state.method = null;
  dfForm.reset();
  dfMethodGrid.querySelectorAll('.cat-chip').forEach(b => b.setAttribute('aria-pressed', 'false'));
  dfLast5Field.hidden = true;
  dfAmountNote.hidden = true;
  dfIdNote.hidden = true;
  setTier(false);
  clearError();
  setSending(false);
}
