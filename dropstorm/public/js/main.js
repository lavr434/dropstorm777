/* ══════════════════════════════════════════
   DROPSTORM main.js — v2
══════════════════════════════════════════ */
'use strict';

/* ── Toast ── */
window.showToast = function(msg, type = 'success', dur = 3500) {
  let c = document.getElementById('toasts');
  if (!c) { c = document.createElement('div'); c.id = 'toasts'; c.className = 'toasts'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-icon">${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(t);
  t.addEventListener('click', () => remove(t));
  setTimeout(() => remove(t), dur);
  function remove(el) { el.style.animation = 'toastOut .3s ease forwards'; el.addEventListener('animationend', () => el.remove()); }
};

/* ── Modal ── */
window.openModal  = id => document.getElementById(id)?.classList.add('open');
window.closeModal = id => document.getElementById(id)?.classList.remove('open');
document.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); });

/* ── Flash screen ── */
window.triggerFlash = function() {
  let o = document.getElementById('flash-overlay');
  if (!o) { o = document.createElement('div'); o.id = 'flash-overlay'; o.className = 'flash-overlay'; document.body.appendChild(o); }
  o.style.display = 'block';
  o.getBoundingClientRect();
  o.style.animation = 'none';
  o.getBoundingClientRect();
  o.style.animation = 'caseFlash 1.2s ease forwards';
  setTimeout(() => { o.style.display = 'none'; }, 1250);
};

/* ── Gold particle burst ── */
window.goldBurst = function(x, y, n = 28) {
  if (document.body.classList.contains('no-animations')) return;
  const em = ['🪙','✨','⭐','💫','🌟','⚡'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.textContent = em[Math.floor(Math.random()*em.length)];
    const dx = (Math.random()-0.5)*220, dy = -(80+Math.random()*160);
    p.style.cssText = `position:fixed;left:${x}px;top:${y}px;font-size:${12+Math.random()*15}px;pointer-events:none;z-index:9999;--dx:${dx}px;--dy:${dy}px;animation:goldBurst ${.7+Math.random()*.8}s ease-out forwards`;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(), 1600);
  }
};

/* ── Animate balance counter ── */
window.animateBalance = function(from, to, dur = 700) {
  const el = document.getElementById('balance-display');
  if (!el) return;
  const start = performance.now(), f = parseFloat(from), d = parseFloat(to)-f;
  const tick = now => {
    const t = Math.min((now-start)/dur, 1), e = 1-Math.pow(1-t,3);
    el.textContent = Math.round(f+d*e).toLocaleString('ru-RU')+'₽';
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/* ── Online counter fake animation ── */
(function() {
  const el = document.getElementById('online-count');
  if (!el) return;
  let n = parseInt(el.textContent)||1400;
  setInterval(()=>{
    n = Math.max(1000, Math.min(2000, n + Math.floor(Math.random()*7)-3));
    el.textContent = n.toLocaleString('ru-RU');
  }, 4000+Math.random()*3000);
})();

/* ── Stats bar animated counters ── */
(function() {
  function run() {
    document.querySelectorAll('.stat-num[data-target]').forEach(el => {
      const target = parseFloat(el.dataset.target);
      const isF = el.dataset.float === '1';
      const orig = el.textContent;
      let start = null;
      const dur = 1800;
      const tick = ts => {
        if (!start) start = ts;
        const p = Math.min((ts-start)/dur, 1), e = 1-Math.pow(1-p, 3);
        el.textContent = isF ? (target*e).toFixed(1) : Math.floor(target*e).toLocaleString('ru-RU');
        if (p < 1) requestAnimationFrame(tick); else el.textContent = orig;
      };
      requestAnimationFrame(tick);
    });
  }
  const bar = document.querySelector('.stats-bar');
  if (bar && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => { entries.forEach(e => { if(e.isIntersecting){run();obs.disconnect();} }); }, {threshold:.3});
    obs.observe(bar);
  } else if (bar) run();
})();

/* ── Scroll fade-in ── */
(function() {
  document.querySelectorAll('.case-card,.item-card,.quest-card,.history-item,.widget-card,.case-grid-card').forEach((el,i)=>{
    el.classList.add('fade-in');
    el.style.transitionDelay = (i*0.035)+'s';
  });
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}}),{threshold:.08});
    document.querySelectorAll('.fade-in').forEach(el=>obs.observe(el));
  } else {
    document.querySelectorAll('.fade-in').forEach(el=>el.classList.add('visible'));
  }
})();

/* ── Fake live ticker drops ── */
(function() {
  const fakeDrops = [
    {user:'ProStorm', gun:'★ Karambit', skin:'Doppler', rarity:'legend', caseName:'Молния'},
    {user:'NightKing', gun:'AWP', skin:'Medusa', rarity:'legend', caseName:'Глаз Бури'},
    {user:'DragonX', gun:'M4A4', skin:'Howl', rarity:'legend', caseName:'Тайфун'},
    {user:'LuckyBoy', gun:'Desert Eagle', skin:'Blaze', rarity:'epic', caseName:'Огненный Дроп'},
    {user:'CoolGuy', gun:'USP-S', skin:'Kill Confirmed', rarity:'epic', caseName:'Молния'},
    {user:'FastDrop', gun:'P90', skin:'Asiimov', rarity:'rare', caseName:'Штормовой Бриз'},
  ];
  const RC = {legend:'var(--c-legend)',epic:'var(--c-epic)',rare:'var(--c-rare)',uncommon:'var(--c-uncommon)',common:'var(--c-common)'};
  function addDrop() {
    const track = document.getElementById('ticker-track');
    if (!track) return;
    const d = fakeDrops[Math.floor(Math.random()*fakeDrops.length)];
    const el = document.createElement('div');
    el.className = 'ticker-item';
    el.innerHTML = `
      <div class="ticker-ava">👤</div>
      <div class="ticker-info">
        <span class="ticker-user">${d.user}</span>
        <span class="ticker-gun">${d.gun}</span>
        <span class="ticker-skin" style="color:${RC[d.rarity]};font-size:9.5px;font-weight:800;">${d.skin}</span>
      </div>
      <div class="ticker-case-reveal">📦 ${d.caseName}</div>`;
    const mid = Math.floor(track.children.length/2);
    track.insertBefore(el, track.children[mid]);
  }
  setInterval(addDrop, 9000+Math.random()*6000);
})();

/* ── Card mouse parallax glow ── */
document.addEventListener('mousemove', function(e) {
  document.querySelectorAll('.case-card,.item-card').forEach(card => {
    const r = card.getBoundingClientRect();
    if (e.clientX > r.left-60 && e.clientX < r.right+60 && e.clientY > r.top-60 && e.clientY < r.bottom+60) {
      const x = ((e.clientX-r.left)/r.width)*100, y = ((e.clientY-r.top)/r.height)*100;
      card.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(245,197,66,.08) 0%, var(--card) 60%)`;
    } else { card.style.background = ''; }
  });
});

/* ── Sound: subtle click (Web Audio) ── */
function playClick() {
  if (document.body.classList.contains('muted')) return;
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.setValueAtTime(700, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime+0.07);
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.1);
    osc.start(); osc.stop(ctx.currentTime+0.1);
  } catch(e){}
}
document.addEventListener('click', e => { if (e.target.closest('.btn')) playClick(); });

/* ── Bonus timer global ── */
window.startBonusTimer = function(endTime) {
  const el = document.getElementById('bonus-timer');
  if (!el) return;
  function tick() {
    const diff = endTime - Date.now();
    if (diff <= 0) { el.textContent = 'Доступен!'; return; }
    const h = String(Math.floor(diff/3600000)).padStart(2,'0');
    const m = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
    const s = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
    el.textContent = `${h}:${m}:${s}`;
    setTimeout(tick, 1000);
  }
  tick();
};
(function() {
  const stored = localStorage.getItem('bonusEnd');
  if (stored) window.startBonusTimer(parseInt(stored));
})();

console.log('%c⚡ DropStorm v2', 'color:#f5c542;font-weight:900;font-size:20px;text-shadow:0 0 10px #ff7b42');
