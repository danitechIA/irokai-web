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
    let activo = false;                                   // solo anima mientras se mueve (luego descansa)
    const bucle = () => {
      x += (tx - x) * .08; y += (ty - y) * .08;
      luz.style.transform = `translate3d(${x - 310}px,${y - 310}px,0)`;
      if (Math.abs(tx - x) + Math.abs(ty - y) > .5) requestAnimationFrame(bucle); else activo = false;
    };
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; if (!activo) { activo = true; requestAnimationFrame(bucle); } }, { passive: true });
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
    const botones = $$('.lista-est button'), nom = $('#est-nombre'), desc = $('#est-desc'), mu = $$('.muestras span', visor);
    let ei = 0, ii = 0, img = $('img', visor);
    try { localStorage.removeItem('irokai-est'); } catch (e) {}   // siempre empieza igual (sin saltos al cargar)
    /* precarga de verdad: primero la portada de cada estética, luego el resto; y la que vas a pulsar, al pasar el ratón */
    const precargar = src => { src && lista(src); };
    const enReposo = f => (window.requestIdleCallback || (g => setTimeout(g, 200)))(f);
    new IntersectionObserver((ents, obs) => {
      if (!ents.some(x => x.isIntersecting)) return; obs.disconnect();
      enReposo(() => { E.forEach(e => precargar(e.imagenes[0])); enReposo(() => E.forEach(e => e.imagenes.forEach(precargar))); });
    }, { rootMargin: '600px' }).observe(visor);
    /* cambio instantáneo: se espera a que la foto esté lista y foto + colores + textos cambian en el MISMO fotograma */
    const listas = new Map();                                       // src → promesa de imagen decodificada
    const lista = src => { if (!listas.has(src)) { const p = new Image(); p.src = src; listas.set(src, p.decode().catch(() => {})); } return listas.get(src); };
    let turno = 0;
    const pintar = async () => {
      const yo = ++turno, e = E[ei], i = ii, src = e.imagenes[i];
      await lista(src);
      if (yo !== turno) return;                                     // si has pulsado otra mientras cargaba, gana la última
      const [a1, a2] = e.colores[i] || [e.acento, '#E8B43A'];
      raiz.classList.add('sin-transicion');                         // nada se anima: todo cambia de golpe
      img.src = src; img.alt = `Fondo original de la estética ${e.nombre}`;
      raiz.style.setProperty('--acento', a1); raiz.style.setProperty('--acento2', a2);
      mu[0] && (mu[0].style.background = a1); mu[1] && (mu[1].style.background = a2);
      nom.textContent = `${e.simbolo} ${e.nombre}`; desc.textContent = e.desc;
      botones.forEach((b, k) => b.setAttribute('aria-pressed', String(k === ei)));
      requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.remove('sin-transicion')));
    };
    botones.forEach(b => {
      b.addEventListener('click', () => { ei = +b.dataset.i; ii = 0; pintar(); });
      b.addEventListener('pointerenter', () => precargar(E[+b.dataset.i].imagenes[0]), { passive: true });
    });
    /* la ruedecita del ratón desplaza la fila de estéticas en horizontal (cuando está en fila) */
    const fila = $('.lista-est');
    fila && fila.addEventListener('wheel', ev => {
      const horizontal = fila.scrollWidth > fila.clientWidth + 2 && getComputedStyle(fila).flexDirection === 'row';
      if (!horizontal || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;
      const fin = fila.scrollWidth - fila.clientWidth, d = ev.deltaY * (ev.deltaMode === 1 ? 40 : 1);
      if ((d < 0 && fila.scrollLeft <= 0) || (d > 0 && fila.scrollLeft >= fin - 1)) return;   // en los extremos sigue bajando la página
      ev.preventDefault(); fila.scrollLeft += d;
    }, { passive: false });
    $$('.flechas button', visor).forEach(b => b.addEventListener('click', () => {
      const n = E[ei].imagenes.length; ii = (ii + +b.dataset.paso + n) % n; pintar();
    }));
    addEventListener('keydown', e => {
      if (e.target.closest('input,textarea')) return;
      if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) { ei = (ei + 1) % E.length; ii = 0; pintar(); avisar(`Estética: <b>${E[ei].simbolo} ${E[ei].nombre}</b> · pulsa <b>T</b> para seguir`, 1800); }
    });
    pintar();
  }

  /* compra: enlace de Lemon Squeezy; si aún no está a la venta, lleva al formulario «Avísame» */
  const form = $('#avisame');
  $$('[data-comprar]').forEach(a => a.addEventListener('click', ev => {
    if (D.compra && a.hasAttribute('data-real')) { ev.preventDefault(); location.href = D.compra; return; }
    if (form) { ev.preventDefault(); $('#precio').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'center' }); setTimeout(() => $('#av-email').focus({ preventScroll: true }), quieto ? 0 : 700); }
  }));

  /* vuelta desde Buttondown: ?apuntado (falta confirmar) o ?confirmado (ya en la lista) */
  const vuelta = new URLSearchParams(location.search);
  if (vuelta.has('confirmado') || vuelta.has('apuntado')) {
    const ok = vuelta.has('confirmado');
    setTimeout(() => avisar(ok ? '🎉 <b>¡Confirmado!</b> Ya estás en la lista de Irokai. Te avisaremos el día del lanzamiento.'
                               : '✉️ <b>¡Casi!</b> Revisa tu correo y pulsa <b>Confirmar</b> para entrar en la lista.', 8000), 600);
    if (ok && form) { form.classList.add('hecho'); form.innerHTML = '<p class="ok">✅ <b>Ya estás en la lista.</b> El día que Irokai salga te llegará un email con el precio de lanzamiento.</p>'; }
    history.replaceState(null, '', location.pathname + location.hash);
  }

  /* lista de aviso (Buttondown o MailerLite): envía el email sin salir de la página */
  if (form) form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const email = form.email.value.trim(), boton = $('button[type=submit]', form);
    if (form.web.value) return;                                    // trampa para bots
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { avisar('✉️ Escribe un <b>email válido</b>.'); form.email.focus(); return; }
    if (!form.acepto.checked) { avisar('☑️ Marca la casilla para que podamos avisarte.'); return; }
    if (!D.lista) { avisar('🚧 La lista de aviso se abre en unos días. Vuelve pronto.'); return; }
    boton.disabled = true; boton.textContent = 'Enviando…';
    try {
      const fd = new FormData();
      if (/mailerlite/.test(D.lista)) {                            // MailerLite: responde con JSON
        fd.append('fields[email]', email); fd.append('ml-submit', '1'); fd.append('anticsrf', 'true');
        const r = await fetch(D.lista, { method: 'POST', body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false) throw new Error();
      } else {                                                     // Buttondown: envío simple (respuesta opaca)
        fd.append('email', email); fd.append('tag', 'lanzamiento');
        await fetch(D.lista, { method: 'POST', body: fd, mode: 'no-cors' });
      }
      form.classList.add('hecho');
      form.innerHTML = '<p class="ok">✅ <b>¡Apuntado!</b> Te hemos enviado un email a <b></b>: ábrelo y pulsa <b>Confirmar</b> para entrar en la lista. Si no lo ves, mira en spam o promociones.</p>';
      $('.ok b:nth-of-type(2)', form).textContent = email;
      avisar('✅ <b>¡Apuntado!</b> Revisa tu correo para confirmar.', 6000);
    } catch {
      boton.disabled = false; boton.textContent = 'Avísame';
      avisar('⚠️ No se ha podido enviar. Prueba otra vez en un momento.');
    }
  });

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
