/* ============================================================
   陳情完成照片 — 縮圖列與燈箱
   進度看板與案件查詢兩頁共用，所以獨立成一支。
   後端（Apps Script driveThumbs）吐的每張照片長這樣：
     { thumb: 'https://drive.google.com/thumbnail?id=…&sz=w800',
       large: '…&sz=w1600' }
   ============================================================ */

'use strict';

const CASE_PHOTO_MAX = 4;

/* ---------- 縮圖列 ---------- */

// 沒有照片就回 null，呼叫端直接不 append —— 不要留一個空的容器撐版面。
function renderCasePhotos(photos, caption) {
  if (!Array.isArray(photos) || !photos.length) return null;

  const wrap = document.createElement('figure');
  wrap.className = 'case-photos';

  const label = document.createElement('figcaption');
  label.className = 'case-photos-label';
  label.textContent = caption || '處理完成';
  wrap.appendChild(label);

  const strip = document.createElement('div');
  strip.className = 'case-photos-strip';

  const shown = photos.slice(0, CASE_PHOTO_MAX);
  shown.forEach((photo, i) => {
    if (!photo || !photo.thumb) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'case-photo';
    btn.setAttribute('aria-label', '放大第 ' + (i + 1) + ' 張完成照片');

    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = '處理完成照片';
    img.loading = 'lazy';
    img.decoding = 'async';

    // Drive 圖片載不出來的原因通常是檔案沒開共用，這在瀏覽器端無從補救。
    // 一格破圖比少一格難看得多，所以失敗就整格拿掉；
    // 拿到最後一格都沒了，連標題一起收掉，免得留下一個「處理完成」卻沒有照片。
    img.addEventListener('error', () => {
      btn.remove();
      if (!strip.children.length) wrap.remove();
    });

    btn.appendChild(img);
    btn.addEventListener('click', () => openCasePhoto(photo.large || photo.thumb));
    strip.appendChild(btn);
  });

  if (!strip.children.length) return null;

  wrap.appendChild(strip);
  return wrap;
}

/* ---------- 燈箱 ---------- */

let casePhotoBox = null;
let casePhotoImg = null;
let casePhotoOpener = null;

// 燈箱只建一次，之後重複使用。頁面上可能有幾十張縮圖，
// 每張都掛一個 overlay 是白花的 DOM。
function ensureCasePhotoBox() {
  if (casePhotoBox) return;

  casePhotoBox = document.createElement('div');
  casePhotoBox.className = 'case-photo-box';
  casePhotoBox.hidden = true;
  casePhotoBox.setAttribute('role', 'dialog');
  casePhotoBox.setAttribute('aria-modal', 'true');
  casePhotoBox.setAttribute('aria-label', '完成照片');

  casePhotoImg = document.createElement('img');
  casePhotoImg.alt = '處理完成照片';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'case-photo-close';
  close.setAttribute('aria-label', '關閉');
  close.textContent = '✕';

  casePhotoBox.append(casePhotoImg, close);
  document.body.appendChild(casePhotoBox);

  // 點背景關閉，點照片本身不關 —— 想放大細看的人常會點到圖。
  casePhotoBox.addEventListener('click', (e) => {
    if (e.target !== casePhotoImg) closeCasePhoto();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !casePhotoBox.hidden) closeCasePhoto();
  });
}

function openCasePhoto(src) {
  ensureCasePhotoBox();
  casePhotoOpener = document.activeElement;
  casePhotoImg.src = src;
  casePhotoBox.hidden = false;
  document.body.classList.add('case-photo-open');
  casePhotoBox.querySelector('.case-photo-close').focus();
}

function closeCasePhoto() {
  casePhotoBox.hidden = true;
  casePhotoImg.removeAttribute('src');   // 關掉就別繼續佔記憶體
  document.body.classList.remove('case-photo-open');
  if (casePhotoOpener && casePhotoOpener.focus) casePhotoOpener.focus();
  casePhotoOpener = null;
}
