/* ============================================================
   里民陳情表單 — 前端邏輯
   後端：Google Apps Script Web App（見 tools/petition/Code.gs）
   鄰別判定沿用 address-lookup.js 的 parseAddress / lookupNeighborhood
   ============================================================ */

'use strict';

const PETITION_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbwbhOiNmub0rcRxdWYeAGBe8e5961unCrAz2p-ezd-A0SBgOv0vnmurnPuXcmQefUhovA/exec';

// 必須與後端 Code.gs 的 CATEGORIES 完全一致。
// anon: true = 可完全匿名；false = 必須留聯絡方式。
const PETITION_CATEGORIES = [
  { name: '道路坑洞', anon: true },
  { name: '路燈',     anon: true },
  { name: '水溝排水', anon: true },
  { name: '垃圾清運', anon: true },
  { name: '公園綠地', anon: true },
  { name: '交通停車', anon: true },
  { name: '噪音污染', anon: false },
  { name: '治安',     anon: false },
  { name: '違建占用', anon: false },
  { name: '鄰里糾紛', anon: false },
  { name: '流浪動物', anon: false },
  { name: '其他',     anon: false },
];

const MAX_PHOTOS = 3;
const PHOTO_MAX_EDGE = 1600;
const PHOTO_QUALITY = 0.8;
const COOLDOWN_MS = 30 * 1000;
const COOLDOWN_KEY = 'petition_last_submit';

// ─── DOM ─────────────────────────────────────────────────────
const pfForm      = document.getElementById('petitionForm');
const pfCatGrid   = document.getElementById('catGrid');
const pfLocation  = document.getElementById('locationInput');
const pfAddrNote  = document.getElementById('addrNote');
const pfGeoBtn    = document.getElementById('geoBtn');
const pfDetail    = document.getElementById('detailInput');
const pfCount     = document.getElementById('detailCount');
const pfPhotoIn   = document.getElementById('photoInput');
const pfPhotoPick = document.getElementById('photoPick');
const pfPhotoList = document.getElementById('photoList');
const pfNickname  = document.getElementById('nicknameInput');
const pfContact   = document.getElementById('contactInput');
const pfContactTag  = document.getElementById('contactTag');
const pfContactNeed = document.getElementById('contactNeed');
const pfWantUpdate  = document.getElementById('wantUpdate');
const pfHoneypot  = document.getElementById('pfWebsite');
const pfError     = document.getElementById('formError');
const pfSubmit    = document.getElementById('submitBtn');
const pfDone      = document.getElementById('petitionDone');
const pfCaseId    = document.getElementById('caseId');
const pfCaseCode  = document.getElementById('caseCode');
const pfAgainBtn  = document.getElementById('againBtn');
const pfCopyBtn   = document.getElementById('copyLinkBtn');

// 案件查詢
const qForm    = document.getElementById('caseForm');
const qId      = document.getElementById('caseIdInput');
const qCode    = document.getElementById('caseCodeInput');
const qSubmit  = document.getElementById('caseSubmit');
const qError   = document.getElementById('caseError');
const qResult  = document.getElementById('caseResult');

// ─── 狀態 ────────────────────────────────────────────────────
const state = {
  category: null,
  neighborhood: '',
  community: '',
  lat: null,
  lng: null,
  photos: [],      // { dataUrl, mime }
};

// 傳單／名片 QR 帶進來的來源標記，用來判斷哪個管道有效
const petitionSrc = new URLSearchParams(location.search).get('src') || 'web';

if (pfForm) init();

function init() {
  renderCategories();
  bindLocation();
  bindDetail();
  bindPhotos();
  bindSubmit();
  bindLookup();

  pfAgainBtn.addEventListener('click', () => {
    resetForm();
    pfDone.hidden = true;
    pfForm.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  pfCopyBtn.addEventListener('click', copyLookupLink);
}

/* ---------- ① 類別 ---------- */

function renderCategories() {
  PETITION_CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-chip';
    btn.textContent = cat.name;
    btn.dataset.name = cat.name;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => selectCategory(cat));
    pfCatGrid.appendChild(btn);
  });
}

function selectCategory(cat) {
  state.category = cat;
  pfCatGrid.querySelectorAll('.cat-chip').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.name === cat.name));
  });

  // 需要聯絡方式的類別：把第 5 步從「選填」翻成「必填」並說明原因
  const needContact = !cat.anon;
  pfContactNeed.hidden = !needContact;
  pfContactTag.textContent = needContact ? '必填' : '選填';
  pfContactTag.className = 'pf-tag ' + (needContact ? 'pf-tag-required' : 'pf-tag-optional');
  clearError();
}

/* ---------- ② 地點 ---------- */

function bindLocation() {
  let timer = null;
  pfLocation.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(matchNeighborhood, 400);
  });
  pfLocation.addEventListener('blur', matchNeighborhood);
  pfGeoBtn.addEventListener('click', locateMe);
}

// 用現有的門牌規則推算鄰別。查不到只是少一項輔助資訊，不阻擋送出。
function matchNeighborhood() {
  const value = pfLocation.value.trim();
  state.neighborhood = '';
  state.community = '';

  if (!value) {
    pfAddrNote.hidden = true;
    return;
  }

  const parsed = typeof parseAddress === 'function' ? parseAddress(value) : null;
  const hood = parsed ? lookupNeighborhood(parsed) : null;

  if (hood) {
    const communities = (typeof NEIGHBORHOOD_COMMUNITIES !== 'undefined' && NEIGHBORHOOD_COMMUNITIES[hood]) || [];
    state.neighborhood = String(hood);
    state.community = communities.join('、');
    pfAddrNote.className = 'addr-note addr-note-hit';
    pfAddrNote.textContent = '系統判定：新林里 第 ' + hood + ' 鄰'
      + (communities.length ? '（' + communities.join('、') + '）' : '');
  } else {
    pfAddrNote.className = 'addr-note addr-note-miss';
    pfAddrNote.textContent = '這個地址暫時對不到鄰別，不影響送出 —— 我們會人工確認位置。';
  }
  pfAddrNote.hidden = false;
}

function locateMe() {
  if (!navigator.geolocation) {
    showError('您的瀏覽器不支援定位功能，請直接輸入地點。');
    return;
  }
  pfGeoBtn.disabled = true;
  const original = pfGeoBtn.lastChild.textContent;
  pfGeoBtn.lastChild.textContent = ' 定位中…';

  navigator.geolocation.getCurrentPosition(
    pos => {
      state.lat = pos.coords.latitude.toFixed(6);
      state.lng = pos.coords.longitude.toFixed(6);
      pfGeoBtn.disabled = false;
      pfGeoBtn.lastChild.textContent = ' 已記錄位置';

      // 座標只是輔助，仍需要文字描述才能讓人看懂在哪裡
      pfAddrNote.className = 'addr-note addr-note-hit';
      pfAddrNote.textContent = '已記錄您目前的座標。請再補一句文字說明位置（例如「公園旁的路口」），方便現場找到。';
      pfAddrNote.hidden = false;
      pfLocation.focus();
    },
    err => {
      pfGeoBtn.disabled = false;
      pfGeoBtn.lastChild.textContent = original;
      showError(err.code === err.PERMISSION_DENIED
        ? '您拒絕了定位權限，請直接輸入地點文字。'
        : '定位失敗，請直接輸入地點文字。');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

/* ---------- ③ 說明 ---------- */

function bindDetail() {
  pfDetail.addEventListener('input', () => {
    pfCount.textContent = pfDetail.value.length;
    clearError();
  });
}

/* ---------- ④ 照片 ---------- */

function bindPhotos() {
  pfPhotoPick.addEventListener('click', () => pfPhotoIn.click());

  pfPhotoIn.addEventListener('change', async () => {
    const files = Array.from(pfPhotoIn.files || []);
    pfPhotoIn.value = '';   // 清空才能重選同一張

    for (const file of files) {
      if (state.photos.length >= MAX_PHOTOS) {
        showError('照片最多 ' + MAX_PHOTOS + ' 張，多的已略過。');
        break;
      }
      if (!file.type.startsWith('image/')) continue;

      try {
        state.photos.push(await compressImage(file));
      } catch (err) {
        showError('有一張圖片讀不進來，請換一張試試。');
      }
    }
    renderPhotos();
  });
}

// 在瀏覽器端縮到長邊 1600px 再轉 JPEG，手機直拍的 4~8MB 大圖才不會塞爆上傳
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';           // JPEG 沒有透明度，先鋪白底避免變黑
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      resolve({ dataUrl: canvas.toDataURL('image/jpeg', PHOTO_QUALITY), mime: 'image/jpeg' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('圖片解碼失敗'));
    };
    img.src = url;
  });
}

function renderPhotos() {
  pfPhotoList.innerHTML = '';

  state.photos.forEach((photo, i) => {
    const li = document.createElement('li');
    li.className = 'photo-item';

    const img = document.createElement('img');
    img.src = photo.dataUrl;
    img.alt = '已選擇的照片 ' + (i + 1);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'photo-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', '移除照片 ' + (i + 1));
    remove.addEventListener('click', () => {
      state.photos.splice(i, 1);
      renderPhotos();
    });

    li.append(img, remove);
    pfPhotoList.appendChild(li);
  });

  pfPhotoPick.disabled = state.photos.length >= MAX_PHOTOS;
}

/* ---------- ⑤ 送出 ---------- */

function bindSubmit() {
  pfForm.addEventListener('submit', async (e) => {
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
      showError('剛剛才送出過，請 ' + Math.ceil(wait / 1000) + ' 秒後再送下一件。');
      return;
    }

    setSending(true);
    clearError();

    try {
      // Apps Script 不處理 CORS preflight，必須用 text/plain 送出 JSON 字串
      const res = await fetch(PETITION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          category:     state.category.name,
          location:     pfLocation.value.trim(),
          neighborhood: state.neighborhood,
          community:    state.community,
          lat:          state.lat,
          lng:          state.lng,
          detail:       pfDetail.value.trim(),
          nickname:     pfNickname.value.trim(),
          contact:      pfContact.value.trim(),
          wantUpdate:   pfWantUpdate.checked,
          src:          petitionSrc,
          hp:           pfHoneypot.value,
          photos:       state.photos.map(p => ({ data: p.dataUrl, mime: p.mime })),
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        showError(data.error || '送出失敗，請稍後再試。');
        setSending(false);
        return;
      }

      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      pfCaseId.textContent = data.caseId;
      pfCaseCode.textContent = data.code || '—';
      pfForm.hidden = true;
      pfDone.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      setSending(false);
      showError('網路連線出了問題，陳情沒有送出。請確認網路後再試一次，或改用 LINE 官方帳號告訴我們。');
    }
  });
}

function validate() {
  if (!state.category) {
    return { message: '請先選擇一個陳情類別。', focus: () => scrollToStep('stepCategory') };
  }
  if (!pfLocation.value.trim()) {
    return { message: '請填寫發生地點，門牌或附近地標都可以。', focus: () => pfLocation.focus() };
  }
  if (pfDetail.value.trim().length < 5) {
    return { message: '請簡單描述一下情況，至少 5 個字。', focus: () => pfDetail.focus() };
  }
  if (!state.category.anon && !pfContact.value.trim()) {
    return {
      message: '「' + state.category.name + '」需要向您確認細節才能處理，請留下電話或 LINE。',
      focus: () => pfContact.focus(),
    };
  }
  return null;
}

function scrollToStep(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setSending(sending) {
  pfSubmit.disabled = sending;
  pfSubmit.textContent = sending
    ? (state.photos.length ? '照片上傳中，請稍候…' : '送出中…')
    : '送出陳情';
}

function showError(message) {
  pfError.textContent = message;
  pfError.hidden = false;
}

function clearError() {
  pfError.hidden = true;
}

/* ---------- 查詢案件進度 ---------- */

const STATUS_CLASS = {
  '已收件':   'case-status-received',
  '已轉報':   'case-status-forwarded',
  '處理中':   'case-status-working',
  '已完成':   'case-status-done',
  '無法處理': 'case-status-rejected',
};

function bindLookup() {
  qForm.addEventListener('submit', (e) => {
    e.preventDefault();
    runLookup(qId.value, qCode.value);
  });

  // 支援分享出去的查詢連結：/petition/?case=XL-...&code=XXXX
  const params = new URLSearchParams(location.search);
  const linkedId = params.get('case');
  const linkedCode = params.get('code');
  if (linkedId && linkedCode) {
    qId.value = linkedId;
    qCode.value = linkedCode;
    document.getElementById('caseLookup').scrollIntoView({ behavior: 'smooth', block: 'start' });
    runLookup(linkedId, linkedCode);
  }
}

async function runLookup(rawId, rawCode) {
  const id = rawId.trim().toUpperCase();
  const code = rawCode.trim().toUpperCase();

  qResult.hidden = true;
  qError.hidden = true;

  if (!id || !code) {
    showLookupError('請同時輸入案件編號與查詢碼。');
    return;
  }

  qSubmit.disabled = true;
  qSubmit.textContent = '查詢中…';

  try {
    const url = PETITION_ENDPOINT
      + '?action=case&id=' + encodeURIComponent(id)
      + '&code=' + encodeURIComponent(code);
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      showLookupError(data.error || '查詢失敗，請稍後再試。');
      return;
    }
    renderCase(data.case);

  } catch (err) {
    showLookupError('網路連線出了問題，請稍後再試一次。');
  } finally {
    qSubmit.disabled = false;
    qSubmit.textContent = '查詢';
  }
}

function renderCase(item) {
  const status = item['狀態'] || '已收件';
  const statusClass = STATUS_CLASS[status] || 'case-status-received';

  const rows = [
    ['類別',     item['類別']],
    ['地點',     item['地點']],
    ['陳情內容', item['說明']],
    ['收件時間', item['收件時間']],
    ['最後更新', item['狀態更新時間']],
    ['轉報單位', item['轉報單位']],
    ['處理說明', item['處理備註']],
  ];

  qResult.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'case-result-head';

  const idEl = document.createElement('span');
  idEl.className = 'case-result-id';
  idEl.textContent = item['案件編號'];

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

  qResult.append(head, list);
  qResult.hidden = false;
}

function showLookupError(message) {
  qError.textContent = message;
  qError.hidden = false;
}

async function copyLookupLink() {
  const link = location.origin + location.pathname
    + '?case=' + encodeURIComponent(pfCaseId.textContent)
    + '&code=' + encodeURIComponent(pfCaseCode.textContent);

  try {
    await navigator.clipboard.writeText(link);
    pfCopyBtn.textContent = '已複製連結';
  } catch (err) {
    // 舊瀏覽器或未授權剪貼簿時，至少讓使用者看得到連結可以手動複製
    window.prompt('請複製這個查詢連結：', link);
    return;
  }
  setTimeout(() => { pfCopyBtn.textContent = '複製查詢連結'; }, 2500);
}

function resetForm() {
  state.category = null;
  state.neighborhood = '';
  state.community = '';
  state.lat = null;
  state.lng = null;
  state.photos = [];

  pfForm.reset();
  pfCatGrid.querySelectorAll('.cat-chip').forEach(b => b.setAttribute('aria-pressed', 'false'));
  pfContactNeed.hidden = true;
  pfContactTag.textContent = '選填';
  pfContactTag.className = 'pf-tag pf-tag-optional';
  pfAddrNote.hidden = true;
  pfCount.textContent = '0';
  renderPhotos();
  clearError();
  setSending(false);
}
