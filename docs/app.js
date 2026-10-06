/* 色界 Irokai — interacción del sitio (sin dependencias) */
(() => {
  const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D = window.IROKAI || {};
  const raiz = document.documentElement;
  if (/[?&]qa/.test(location.search)) raiz.classList.add('qa');

  /* aviso emergente */
  const aviso = $('#aviso'); let tAviso;
  const avisar = (html, ms = 4200) => { aviso.innerHTML = html; aviso.classList.add('ver'); clearTimeout(tAviso); tAviso = setTimeout(() => aviso.classList.remove('ver'), ms); };

  /* cabecera sólida + barra de progreso */
  const cab = $('#cab'), prog = $('#progreso');
  const alScroll = () => {
    const y = scrollY, max = document.body.scrollHeight - innerHeight;
    cab && cab.classList.toggle('solida', y > 20);
    prog && (prog.style.transform = `scaleX(${max > 0 ? y / max : 0})`);
  };
  addEventListener('scroll', alScroll, { passive: true }); alScroll();

  /* luz que sigue al cursor (suavizada) */
  const luz = $('#luz');
  if (luz && !quieto && matchMedia('(pointer:fine)').matches) {
    let x = innerWidth / 2, y = innerHeight * .3, tx = x, ty = y;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function bucle() { x += (tx - x) * .08; y += (ty - y) * .08; luz.style.left = x + 'px'; luz.style.top = y + 'px'; requestAnimationFrame(bucle); })();
  }

  /* titular letra a letra */
  $$('[data-letras]').forEach(h => {
    let i = 0;
    const partir = n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(pal => {
          if (/^\s+$/.test(pal)) { f.append(pal); return; }
          const w = document.createElement('span'); w.style.whiteSpace = 'nowrap';
          [...pal].forEach(ch => { const s = document.createElement('span'); s.className = 'letra'; s.textContent = ch; s.style.animationDelay = (i++ * 0.028) + 's'; w.append(s); });
          f.append(w);
        });
        n.replaceWith(f);
      } else [...n.childNodes].forEach(partir);
    };
    [...h.childNodes].forEach(partir);
  });

  /* aparición al hacer scroll */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px' });
  $$('.rv').forEach(el => io.observe(el));

  /* vídeos: se cargan y reproducen solo cuando se ven (rápido y ahorra datos) */
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) {
      if (v.dataset.src && !v.src) { v.src = v.dataset.src; v.load(); }
      if (!quieto) v.play().catch(() => {});
    } else v.pause();
  }), { threshold: .25 });
  $$('video[data-src], .monitor video').forEach(v => vio.observe(v));

  /* inclinación suave de las tarjetas */
  if (!quieto && matchMedia('(pointer:fine)').matches) $$('.func').forEach(t => {
    t.addEventListener('pointermove', e => {
      const r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      t.style.transform = `translateY(-6px) perspective(900px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg)`;
    });
    t.addEventListener('pointerleave', () => t.style.transform = '');
  });

  /* selector de estéticas: cambia el visor y los colores de TODA la página */
  const E = D.esteticas || [], visor = $('#visor');
  if (E.length && visor) {
    const botones = $$('.lista-est button'), img = $('img', visor), nom = $('#est-nombre'), desc = $('#est-desc'), mu = $$('.muestras span', visor);
    let ei = 0, ii = 0;
    try { const g = JSON.parse(localStorage.getItem('irokai-est')); if (g && E[g.e]) { ei = g.e; ii = g.i % E[g.e].imagenes.length; } } catch (e) {}
    E.forEach(e => e.imagenes.forEach(src => { const p = new Image(); p.decoding = 'async'; p.loading = 'lazy'; }));
    const pintar = (animar = true) => {
      const e = E[ei], [a1, a2] = e.colores[ii] || [e.acento, '#E8B43A'];
      raiz.style.setProperty('--acento', a1); raiz.style.setProperty('--acento2', a2);
      mu[0] && (mu[0].style.background = a1); mu[1] && (mu[1].style.background = a2);
      nom.textContent = `${e.simbolo} ${e.nombre}`; desc.textContent = e.desc;
      botones.forEach((b, k) => b.setAttribute('aria-pressed', String(k === ei)));
      const src = e.imagenes[ii];
      if (animar && img.getAttribute('src') !== src) {
        const nueva = new Image(); nueva.src = src; nueva.alt = `Fondo original de la estética ${e.nombre}`; nueva.width = 960; nueva.height = 540;
        nueva.style.opacity = 0; visor.prepend(nueva);
        nueva.decode().catch(() => {}).finally(() => { requestAnimationFrame(() => { nueva.style.opacity = 1; img.classList.add('saliendo'); setTimeout(() => img.remove(), 750); }); });
        img = nueva;
      } else img.src = src;
      try { localStorage.setItem('irokai-est', JSON.stringify({ e: ei, i: ii })); } catch (er) {}
    };
    botones.forEach(b => b.addEventListener('click', () => { ei = +b.dataset.i; ii = 0; pintar(); }));
    $$('.flechas button', visor).forEach(b => b.addEventListener('click', () => {
      const n = E[ei].imagenes.length; ii = (ii + +b.dataset.paso + n) % n; pintar();
    }));
    addEventListener('keydown', e => {
      if (e.target.closest('input,textarea')) return;
      if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) { ei = (ei + 1) % E.length; ii = 0; pintar(); avisar(`Estética: <b>${E[ei].simbolo} ${E[ei].nombre}</b> · pulsa <b>T</b> para seguir`, 1800); }
    });
    pintar(false);
  }

  /* compra: enlace de Lemon Squeezy (o aviso si aún no está a la venta) */
  $$('[data-comprar]').forEach(a => a.addEventListener('click', ev => {
    if (D.compra && a.hasAttribute('data-real')) { ev.preventDefault(); location.href = D.compra; return; }
    if (!D.compra && a.hasAttribute('data-real')) { ev.preventDefault(); avisar('🚀 <b>Irokai sale muy pronto.</b> Síguenos en TikTok para enterarte el primero.'); }
  }));

  /* tráiler en una ventana (solo se descarga si lo abres) */
  const dlg = $('#trailer');
  if (dlg) {
    const v = $('video', dlg);
    $$('[data-trailer]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault(); if (!v.src) v.src = v.dataset.srcDialog; dlg.showModal(); v.play().catch(() => {});
    }));
    const cerrar = () => { v.pause(); dlg.close(); };
    $('.cerrar', dlg).addEventListener('click', cerrar);
    dlg.addEventListener('click', e => { if (e.target === dlg) cerrar(); });
    dlg.addEventListener('close', () => v.pause());
  }

  /* copiar comandos */
  $$('.copiar').forEach(b => b.addEventListener('click', () => {
    const t = b.parentElement.innerText.split('\n').filter(l => l.startsWith('$')).map(l => l.replace(/^\$\s*/, '')).join('\n');
    navigator.clipboard.writeText(t).then(() => { b.textContent = '¡copiado!'; b.classList.add('ok'); setTimeout(() => { b.textContent = 'copiar'; b.classList.remove('ok'); }, 1500); });
  }));

  /* menú móvil */
  const ham = $('.hamburguesa'), menu = $('#menu');
  ham && ham.addEventListener('click', () => { const ab = menu.classList.toggle('abierto'); ham.setAttribute('aria-expanded', String(ab)); });
  menu && menu.addEventListener('click', e => { if (e.target.tagName === 'A') { menu.classList.remove('abierto'); ham.setAttribute('aria-expanded', 'false'); } });
})();
