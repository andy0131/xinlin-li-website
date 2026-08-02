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

// ─── 主選單子選單（地址查詢）─────────────────────────────────
// 桌面靠 hover 展開（CSS 負責），這裡處理點擊、觸控與鍵盤操作。
const navSubToggle = document.querySelector('.nav-sub-toggle');
const navSubMenu   = navSubToggle && document.getElementById(navSubToggle.getAttribute('aria-controls'));

if (navSubToggle && navSubMenu) {
  const navSubWrap = navSubToggle.closest('.nav-item-has-sub');

  const setNavSubOpen = (open) => {
    navSubMenu.classList.toggle('open', open);
    navSubToggle.setAttribute('aria-expanded', String(open));
  };

  navSubToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setNavSubOpen(!navSubMenu.classList.contains('open'));
  });

  // 點擊子選單以外的地方就收合
  document.addEventListener('click', (e) => {
    if (!navSubWrap.contains(e.target)) setNavSubOpen(false);
  });

  // 點了子選單內的連結也要收合
  navSubMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => setNavSubOpen(false));
  });

  // Esc 收合並把焦點還給開合鈕
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navSubMenu.classList.contains('open')) {
      setNavSubOpen(false);
      navSubToggle.focus();
    }
  });

  // 鍵盤 Tab 離開整個子選單區塊時收合
  navSubWrap.addEventListener('focusout', (e) => {
    if (!navSubWrap.contains(e.relatedTarget)) setNavSubOpen(false);
  });

  // 收起手機選單時一併收合子選單
  navToggle.addEventListener('click', () => {
    if (!navLinks.classList.contains('open')) setNavSubOpen(false);
  });
}

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
