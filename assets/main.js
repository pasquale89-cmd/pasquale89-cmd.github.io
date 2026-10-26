const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const CFG = window.CFG || {};
const eur = n => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// Menu mobile
const b = $('.burger'), n = $('#nav');
b && b.addEventListener('click', () => { const o = n.classList.toggle('open'); b.setAttribute('aria-expanded', o); });

// Animazioni in ingresso
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
$$('.reveal').forEach(el => io.observe(el));

// Countdown Bonus Colonnine
$$('[data-until]').forEach(el => {
  const end = new Date(el.dataset.until + 'T23:59:59'), d = Math.ceil((end - new Date()) / 864e5);
  if (d < 0) { el.textContent = ''; return; }
  el.textContent = el.classList.contains('countdown-big')
    ? `⏳ Mancano ${d} giorni alla scadenza delle installazioni con bonus`
    : `Mancano ${d} giorni.`;
});

// Calcolatore wallbox
const calc = $('#calc');
if (calc && CFG.prezzi) {
  const P = CFG.prezzi, mid = a => (a[0] + a[1]) / 2;
  const scaduto = new Date() > new Date(CFG.fineBonus + 'T23:59:59');
  const upd = () => {
    const chi = $('input[name=chi]:checked', calc).value, kw = $('input[name=kw]:checked', calc).value, m = +$('#metri').value;
    $('#mOut').textContent = m;
    let c = mid(P.wallbox[kw]) + mid(P.posa_base) + Math.max(0, m - 10) * mid(P.metro_extra);
    if ($('#linea').checked) c += mid(P.linea_dedicata);
    if ($('#carichi').checked) c += mid(P.gestione_carichi);
    if (chi === 'condominio') c += mid(P.condominio_extra);
    c = Math.round(c / 10) * 10;
    const cap = chi === 'condominio' ? P.cap_condominio : P.cap_privato;
    const bonus = scaduto ? 0 : Math.min(cap, Math.round(c * P.bonus_pct / 100));
    $('#rCosto').textContent = eur(c); $('#rBonus').textContent = scaduto ? 'non più disponibile' : '− ' + eur(bonus);
    $('#rNetto').textContent = eur(c - bonus);
    $('#calcCta').href = `contatti.html?tipo=${chi === 'condominio' ? 'condominio' : 'privato'}&servizio=wallbox&stima=${c}`;
  };
  calc.addEventListener('input', upd); upd();
}

// Check-up quiz
const quiz = $('#quiz');
if (quiz) quiz.addEventListener('submit', e => {
  e.preventDefault();
  let s = 0, max = 0;
  $$('.q', quiz).forEach((q, i) => { const w = +q.dataset.w; max += w; if ($(`input[name=q${i}]:checked`, quiz)?.value === '1') s += w; });
  const pct = Math.round(s / max * 100), lv = pct >= 45 ? 2 : pct >= 15 ? 1 : 0;
  const T = [
    ['Impianto in buono stato', 'Dalle tue risposte non emergono segnali di rischio. Un controllo strumentale ogni qualche anno resta comunque una buona abitudine.'],
    ['Meglio fare un controllo', 'Ci sono alcuni segnali da approfondire. Un check-up con misure strumentali ti dice con certezza cosa va sistemato e cosa no.'],
    ['Serve una verifica a breve', 'Le tue risposte indicano possibili rischi per la sicurezza. Ti consigliamo una verifica il prima possibile: il sopralluogo in zona è gratuito.']
  ];
  const r = $('#quizRes'); r.hidden = false; r.className = 'quiz-res lv' + lv;
  r.innerHTML = `<div class="score">${pct}%</div><span class="eyebrow">Livello di attenzione</span><h2>${T[lv][0]}</h2><p>${T[lv][1]}</p>
  <div class="hero-btns"><a class="btn" href="contatti.html?tipo=privato&servizio=checkup&checkup=${pct}">Prenota il sopralluogo gratuito</a>
  <a class="btn btn-ghost" href="https://wa.me/${CFG.wa}?text=${encodeURIComponent('Ho fatto il check-up online: risultato ' + pct + '%. Vorrei una verifica.')}" target="_blank" rel="noopener">Scrivici su WhatsApp</a></div>`;
  r.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Modulo preventivo a step
const f = $('#preventivo');
if (f) {
  const steps = $$('.w-step', f), back = $('.w-back', f), next = $('.w-next', f), send = $('.w-send', f), bar = $('.w-prog i', f);
  let cur = 0;
  const show = i => {
    cur = i; steps.forEach((s, k) => s.hidden = k !== i);
    back.hidden = i === 0; next.hidden = i === steps.length - 1; send.hidden = i !== steps.length - 1;
    bar.style.width = ((i + 1) / steps.length * 100) + '%';
  };
  const valid = () => $$('input,select,textarea', steps[cur]).every(el => el.reportValidity());
  next.addEventListener('click', () => valid() && show(cur + 1));
  back.addEventListener('click', () => show(cur - 1));
  $$('input[name=tipo]', f).forEach(r => r.addEventListener('change', () => setTimeout(() => show(1), 180)));
  // precompilazione da URL
  const q = new URLSearchParams(location.search);
  if (q.get('tipo')) { const r = $(`input[name=tipo][value=${q.get('tipo')}]`, f); if (r) r.checked = true; }
  if (q.get('servizio')) { const s = $('select[name=servizio]', f); s.value = q.get('servizio'); }
  if (q.get('checkup')) $('#checkupField').value = 'Check-up online: ' + q.get('checkup') + '%';
  if (q.get('stima')) $('#checkupField').value = 'Stima calcolatore wallbox: ' + q.get('stima') + ' €';
  show(q.get('tipo') ? 1 : 0);
  f.addEventListener('submit', async ev => {
    ev.preventDefault(); if (!valid()) return;
    const m = $('.form-msg', f); send.disabled = true; m.className = 'form-msg'; m.textContent = 'Invio in corso…';
    try {
      const r = await fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } });
      if (!r.ok) throw 0;
      f.reset(); show(0); m.classList.add('ok'); m.textContent = 'Grazie! Ti ricontattiamo entro 24 ore lavorative.';
    } catch { m.classList.add('err'); m.textContent = 'Invio non riuscito. Chiamaci o scrivici su WhatsApp.'; }
    send.disabled = false;
  });
}
