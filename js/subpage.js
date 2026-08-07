/* ============================================================
   內頁共用互動邏輯（白皮書、門牌對照表）
   只保留內頁真正需要的功能：導覽列、日夜切換、回到頂端、年份。
   首頁專屬的打字機／輪播／粒子特效不在此檔。
   ============================================================ */

'use strict';

// ─── 導覽列滾動效果 ──────────────────────────────────────────
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const scrollTopBtn = document.getElementById('scrollTopBtn');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
  scrollTopBtn.classList.toggle('visible', window.scrollY > 600);
}, { passive: true });

navToggle.addEventListener('click', () => {
  const isOpen = navToggle.classList.toggle('open');
  navLinks.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
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

  // 點了子選單內的連結也要收合
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

// 收起手機選單時一併收合子選單
navToggle.addEventListener('click', () => {
  if (!navLinks.classList.contains('open')) closeAllNavSubs();
});

// 點選連結後關閉手機選單（子選單開合鈕除外）
document.querySelectorAll('#navLinks a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

// ─── 頁尾年份 ────────────────────────────────────────────────
const yearEl = document.getElementById('currentYear');
if (yearEl) yearEl.textContent = new Date().getFullYear();
