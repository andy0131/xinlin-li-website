/* ============================================================
   謝誌謙 新林里里長競選網站 — JavaScript 互動邏輯
   ============================================================ */

'use strict';

// ─── 導覽列滾動效果 ──────────────────────────────────────────
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
const navLinkItems = document.querySelectorAll('.nav-link, .nav-sub-link');

window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  updateActiveNav();
  handleScrollTop();
}, { passive: true });

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navLinks.classList.toggle('open');
});

// 點選連結後關閉手機選單（子選單的開合鈕除外，它要負責展開下層）
navLinkItems.forEach(link => {
  link.addEventListener('click', () => {
    if (link.classList.contains('nav-sub-toggle')) return;
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// ─── 主選單子選單（地址查詢、里民陳情）───────────────────────
// 桌面靠 hover 展開（CSS 負責），這裡處理點擊、觸控與鍵盤操作。
// 頁面上可以有多組子選單，同一時間只允許展開一組。
const navSubs = [];

document.querySelectorAll('.nav-sub-toggle').forEach(toggle => {
  const menu = document.getElementById(toggle.getAttribute('aria-controls'));
  const wrap = toggle.closest('.nav-item-has-sub');
  if (!menu || !wrap) return;

  const sub = {
    toggle, menu, wrap,
    isOpen: () => menu.classList.contains('open'),
    set(open) {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    },
  };
  navSubs.push(sub);

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !sub.isOpen();
    closeAllNavSubs();
    sub.set(willOpen);
  });

  // 點了子選單內的連結也要收合（首頁的「快速查詢」只捲動不換頁，面板會賴著不走）
  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => sub.set(false));
  });

  // 鍵盤 Tab 離開整個子選單區塊時收合
  wrap.addEventListener('focusout', (e) => {
    if (!wrap.contains(e.relatedTarget)) sub.set(false);
  });
});

function closeAllNavSubs() {
  navSubs.forEach(sub => sub.set(false));
}

// 點擊子選單以外的地方就收合
document.addEventListener('click', (e) => {
  navSubs.forEach(sub => {
    if (!sub.wrap.contains(e.target)) sub.set(false);
  });
});

// Esc 收合並把焦點還給開合鈕
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = navSubs.find(sub => sub.isOpen());
  if (!open) return;
  open.set(false);
  open.toggle.focus();
});

// 收起手機選單時一併收合子選單，避免下次展開時停在半開狀態
navToggle.addEventListener('click', () => {
  if (!navLinks.classList.contains('open')) closeAllNavSubs();
});

// ─── 日夜主題切換 ────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;

function applyThemeToggleUI() {
  const isDark = htmlEl.getAttribute('data-theme') === 'dark';
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute('aria-label', isDark ? '切換至淺色模式' : '切換至深色模式');
}
applyThemeToggleUI();

themeToggle.addEventListener('click', () => {
  const isDark = htmlEl.getAttribute('data-theme') === 'dark';
  if (isDark) {
    htmlEl.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    htmlEl.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
  applyThemeToggleUI();
});

// ─── 高亮當前 Section 導覽連結 ───────────────────────────────
function updateActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 100;
    if (window.scrollY >= top) {
      current = section.getAttribute('id');
    }
  });
  // 先全部清掉再標記，避免子選單項目與其父層開合鈕互相蓋掉
  navLinkItems.forEach(link => link.classList.remove('active'));
  navLinkItems.forEach(link => {
    if (link.getAttribute('href') !== `#${current}`) return;
    link.classList.add('active');
    // 子選單項目命中時，父層的「地址查詢」也要跟著亮起
    const wrap = link.closest('.nav-item-has-sub');
    if (wrap) wrap.querySelector('.nav-sub-toggle').classList.add('active');
  });
}

// ─── 打字機效果 ─────────────────────────────────────────────
const typewriterEl = document.getElementById('typewriter');
const cursorEl     = document.getElementById('typewriterCursor');
const phrases = [
  '堅持不懈‧勇往直前',
  '設計新林里的未來',
  '讓改變從堅持開始',
  '務實服務 × 在地創新',
];
let phraseIdx = 0;
let charIdx   = 0;
let deleting  = false;
let typingPause = false;

function typeEffect() {
  const current = phrases[phraseIdx];

  if (!deleting) {
    charIdx++;
    typewriterEl.textContent = current.slice(0, charIdx);
    if (charIdx === current.length) {
      typingPause = true;
      setTimeout(() => { typingPause = false; deleting = true; }, 2400);
    }
  } else {
    charIdx--;
    typewriterEl.textContent = current.slice(0, charIdx);
    if (charIdx === 0) {
      deleting = false;
      phraseIdx = (phraseIdx + 1) % phrases.length;
    }
  }

  if (!typingPause) {
    const delay = deleting ? 55 : 95;
    setTimeout(typeEffect, delay);
  } else {
    setTimeout(typeEffect, 2400);
  }
}

setTimeout(typeEffect, 800);

// ─── Hero 背景輪播 ───────────────────────────────────────────
const heroSlides = document.querySelectorAll('.hero-bg-slide');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 第 2-4 張輪播圖等主執行緒閒置後才抓取，避免搶佔首屏頻寬
// （用 window.load 太晚：字型等資源在節流環境下可能 10 秒才觸發，
//   輪播間隔卻只有 6 秒，會先跳出空白再補圖）
function loadDeferredSlides() {
  heroSlides.forEach((slide) => {
    const bg = slide.dataset.bg;
    if (bg) {
      slide.style.backgroundImage = `url('${bg}')`;
      delete slide.dataset.bg;
    }
  });
}
if ('requestIdleCallback' in window) {
  requestIdleCallback(loadDeferredSlides, { timeout: 2000 });
} else {
  setTimeout(loadDeferredSlides, 1200);
}

if (heroSlides.length > 1 && !reduceMotion) {
  let slideIdx = 0;
  setInterval(() => {
    heroSlides[slideIdx].classList.remove('active');
    slideIdx = (slideIdx + 1) % heroSlides.length;
    heroSlides[slideIdx].classList.add('active');
  }, 6000);
}

// ─── 粒子特效 ────────────────────────────────────────────────
function createParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  const count = 30;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 1;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 4 + 4}s;
      animation-delay: ${Math.random() * 6}s;
      background: ${Math.random() > 0.5 ? '#f5c842' : '#4f8ef7'};
      opacity: 0;
    `;
    container.appendChild(p);
  }
}

createParticles();

// ─── 捲動動畫 (Intersection Observer) ───────────────────────
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, idx) => {
    if (entry.isIntersecting) {
      // 依序延遲
      const delay = entry.target.dataset.delay || 0;
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, parseInt(delay));
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

// 為同組元素自動加上 stagger delay
document.querySelectorAll('.community-grid .community-card').forEach((el, i) => {
  el.dataset.delay = i * 120;
});

revealEls.forEach(el => revealObserver.observe(el));

// ─── 回到頂端按鈕 ────────────────────────────────────────────
const scrollTopBtn = document.getElementById('scrollTopBtn');

function handleScrollTop() {
  if (!scrollTopBtn) return;
  if (window.scrollY > 400) {
    scrollTopBtn.classList.add('visible');
  } else {
    scrollTopBtn.classList.remove('visible');
  }
}

if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ─── 政見卡片 3D Tilt 效果（僅桌面寬螢幕，避免手機滑動版裁切）──
document.querySelectorAll('.policy-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    if (!window.matchMedia('(min-width: 769px)').matches) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width  / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -6;
    const ry = ((x - cx) / cx) * 6;
    card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-8px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ─── 平滑滾動（補強瀏覽器相容性）────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      const offsetTop = target.offsetTop - 72;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  });
});

// ─── 年份自動更新 ────────────────────────────────────────────
const yearEl = document.getElementById('currentYear');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ─── 圖片燈箱（地址查詢區塊的里界圖與鄰別對照表）────────────
const lightbox        = document.getElementById('lightbox');
const lightboxStage   = document.getElementById('lightboxStage');
const lightboxImg     = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxClose   = document.getElementById('lightboxClose');

if (lightbox) {
  let lastFocused = null;

  function setZoom(on, originX, originY) {
    lightbox.classList.toggle('is-zoomed', on);
    if (!on) return;
    // 以點擊位置為中心捲動，讓使用者點哪就看哪
    requestAnimationFrame(() => {
      const ratioX = originX != null ? originX : 0.5;
      const ratioY = originY != null ? originY : 0.5;
      lightboxStage.scrollLeft =
        ratioX * lightboxImg.offsetWidth  - lightboxStage.clientWidth  / 2;
      lightboxStage.scrollTop  =
        ratioY * lightboxImg.offsetHeight - lightboxStage.clientHeight / 2;
    });
  }

  function openLightbox(trigger) {
    const img = trigger.querySelector('img');
    const caption = trigger.closest('figure').querySelector('figcaption');
    if (!img) return;

    lastFocused = trigger;
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt || '';
    lightboxCaption.textContent = caption ? caption.textContent.trim() : '';

    setZoom(false);
    lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    const finish = () => {
      lightbox.hidden = true;
      lightboxImg.src = '';
      setZoom(false);
      if (lastFocused) lastFocused.focus();
    };
    if (reduceMotion) finish();
    else setTimeout(finish, 250);
  }

  document.querySelectorAll('[data-lightbox]').forEach(trigger => {
    trigger.addEventListener('click', () => openLightbox(trigger));
  });

  lightboxClose.addEventListener('click', closeLightbox);

  // 點圖片切換放大／縮回；點圖片以外的背景則關閉
  lightboxImg.addEventListener('click', (e) => {
    e.stopPropagation();
    const zoomed = lightbox.classList.contains('is-zoomed');
    const rect = lightboxImg.getBoundingClientRect();
    setZoom(!zoomed, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  });
  lightboxStage.addEventListener('click', (e) => {
    if (e.target === lightboxStage) closeLightbox();
  });

  // 放大後可用滑鼠拖曳平移
  let panning = false, panX = 0, panY = 0, panLeft = 0, panTop = 0;
  lightboxStage.addEventListener('pointerdown', (e) => {
    if (!lightbox.classList.contains('is-zoomed') || e.pointerType === 'touch') return;
    panning = true;
    panX = e.clientX; panY = e.clientY;
    panLeft = lightboxStage.scrollLeft; panTop = lightboxStage.scrollTop;
    lightboxStage.classList.add('is-panning');
    lightboxStage.setPointerCapture(e.pointerId);
  });
  lightboxStage.addEventListener('pointermove', (e) => {
    if (!panning) return;
    lightboxStage.scrollLeft = panLeft - (e.clientX - panX);
    lightboxStage.scrollTop  = panTop  - (e.clientY - panY);
  });
  ['pointerup', 'pointercancel'].forEach(evt => {
    lightboxStage.addEventListener(evt, () => {
      panning = false;
      lightboxStage.classList.remove('is-panning');
    });
  });

  // Esc 關閉；Tab 鎖在燈箱內（唯一可聚焦控制項為關閉鈕）
  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeLightbox();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      lightboxClose.focus();
    }
  });
}
