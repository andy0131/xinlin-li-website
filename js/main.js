/* ============================================================
   謝誌謙 新林里里長競選網站 — JavaScript 互動邏輯
   ============================================================ */

'use strict';

// ─── 導覽列滾動效果 ──────────────────────────────────────────
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
const navLinkItems = document.querySelectorAll('.nav-link');

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

// 點選連結後關閉手機選單
navLinkItems.forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
  });
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
  navLinkItems.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
}

// ─── 打字機效果 ─────────────────────────────────────────────
const typewriterEl = document.getElementById('typewriter');
const cursorEl     = document.getElementById('typewriterCursor');
const phrases = [
  '走在林口之前',
  '設計新林里的未來',
  '讓改變從「之前」開始',
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
document.querySelectorAll('.policy-grid .policy-card, .community-grid .community-card').forEach((el, i) => {
  el.dataset.delay = i * 120;
});

revealEls.forEach(el => revealObserver.observe(el));

// ─── 數字滾動計數 ─────────────────────────────────────────────
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target + suffix;
  }
  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num[data-target]').forEach(el => {
  counterObserver.observe(el);
});

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

// ─── 政見卡片 3D Tilt 效果 ──────────────────────────────────
document.querySelectorAll('.policy-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
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

// ─── 政見卡片：手機版橫向滑動置中強調 + 分頁指示點 ──────────
(function initPolicyCarousel() {
  const grid = document.querySelector('.policy-grid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.policy-card'));

  const dots = document.createElement('div');
  dots.className = 'policy-dots';
  cards.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dots.appendChild(dot);
  });
  grid.insertAdjacentElement('afterend', dots);
  const dotEls = Array.from(dots.children);

  const setActiveDot = (idx) => {
    dotEls.forEach((d, i) => d.classList.toggle('active', i === idx));
  };

  const carouselObserver = new IntersectionObserver((entries) => {
    let bestRatio = 0;
    let bestIdx = -1;
    entries.forEach((entry) => {
      entry.target.classList.toggle('in-view', entry.intersectionRatio > 0.6);
      if (entry.intersectionRatio > bestRatio) {
        bestRatio = entry.intersectionRatio;
        bestIdx = cards.indexOf(entry.target);
      }
    });
    if (bestIdx > -1) setActiveDot(bestIdx);
  }, { root: grid, threshold: [0, 0.25, 0.5, 0.6, 0.75, 1] });

  cards.forEach((card) => carouselObserver.observe(card));
})();

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
