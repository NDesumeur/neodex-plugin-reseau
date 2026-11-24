// Réseau : test de ta connexion (box, Internet, DNS, un serveur de jeu au choix) et tes réseaux Wi-Fi enregistrés avec leur mot de passe.
// Tout ce qui touche Windows se fait dans le volet système (main.js).
const CSS = `
.rsWrap{max-width:clamp(900px,78vw,1500px);margin:0 auto;padding:clamp(16px,1.6vw,30px);display:flex;flex-direction:column;gap:clamp(12px,1.2vw,20px);box-sizing:border-box}
.rsGame{font-size:clamp(13px,.9vw,16px);padding:7px 9px;max-width:100%;background:#05010b;color:#fff;border:0;box-shadow:inset 0 0 0 2px var(--line2,#3a2a6e)}
.rsWrap .agHead{flex-wrap:wrap;gap:10px}
.rsTests{display:grid;grid-template-columns:repeat(auto-fit,minmax(clamp(190px,15vw,300px),1fr));gap:clamp(10px,1vw,18px)}
.rsCard{padding:clamp(14px,1.2vw,22px);display:flex;flex-direction:column;gap:6px;background:color-mix(in srgb,var(--line2,#3a2a6e) 45%,#000);box-shadow:inset 0 0 0 2px var(--line2,#3a2a6e)}
.rsCard .t{font:clamp(8px,.6vw,11px) var(--title);letter-spacing:1px;color:var(--lilac,#c9bde6)}
.rsCard .v{font:clamp(22px,1.8vw,34px) var(--title);color:#fff}
.rsCard .d{font-size:clamp(11px,.8vw,14px);color:var(--muted,#9a8cc0)}
.rsCard.good{box-shadow:inset 0 0 0 2px #3fdc7a}.rsCard.good .v{color:#3fdc7a}
.rsCard.mid{box-shadow:inset 0 0 0 2px var(--yellow,#ffd84a)}.rsCard.mid .v{color:var(--yellow,#ffd84a)}
.rsCard.bad{box-shadow:inset 0 0 0 2px #ff4d6d}.rsCard.bad .v{color:#ff4d6d}
.rsVerdict{font-size:clamp(14px,1vw,18px);color:#fff;min-height:1.2em}
.rsWifi{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,clamp(420px,32vw,620px)),1fr));gap:clamp(6px,.6vw,10px)}
.rsNet{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;background:color-mix(in srgb,var(--line2,#3a2a6e) 30%,#000)}
.rsNet .n{flex:1;min-width:140px;color:#fff;font-size:clamp(14px,.95vw,17px);overflow-wrap:anywhere}
.rsNet .a{font-size:11px;color:var(--muted,#9a8cc0)}
.rsNet code{font:clamp(13px,.9vw,16px) Consolas,monospace;color:var(--yellow,#ffd84a);user-select:all}
.rsNet button{padding:6px 9px;font-size:clamp(9px,.65vw,12px)}
.rsCutHead{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.rsCutHead .grow{flex:1}
.rsOn{display:flex;align-items:center;gap:8px;color:#fff;cursor:var(--cp,pointer);font-size:clamp(13px,.9vw,16px)}.rsOn input{width:20px;height:20px}
.rsLive{font-size:clamp(13px,.9vw,16px);color:var(--lilac,#c9bde6)}.rsLive.ok{color:#3fdc7a}.rsLive.cut{color:#ff4d6d}
.rsBar{position:relative;height:26px;background:color-mix(in srgb,var(--line2,#3a2a6e) 25%,#000);box-shadow:inset 0 0 0 2px var(--line2,#3a2a6e);overflow:hidden}
.rsBar i{position:absolute;top:2px;bottom:2px}.rsBar i.w{background:color-mix(in srgb,#3fdc7a 45%,#000)}.rsBar i.net{background:#ff4d6d;min-width:3px}.rsBar i.box{background:#ff9a3a;min-width:3px}
.rsBarLeg{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--muted,#9a8cc0)}
.rsBarLeg b{display:inline-block;width:10px;height:10px;margin:0 4px 0 10px;vertical-align:-1px}
.rsCuts{display:flex;flex-direction:column;gap:4px;max-height:340px;overflow:auto}
.rsCut{display:flex;flex-wrap:wrap;gap:4px 14px;padding:8px 12px;background:color-mix(in srgb,var(--line2,#3a2a6e) 30%,#000);border-left:4px solid #ff4d6d;font-size:clamp(13px,.88vw,16px);color:#fff}
.rsCut.box{border-left-color:#ff9a3a}.rsCut .k{color:var(--muted,#9a8cc0);flex-basis:100%}`;

// les calculs du relevé, à part pour le tester : périodes surveillées et coupures coupées à la fenêtre [from, to]
const clip = (a, b, from, to) => Math.max(0, Math.min(b, to) - Math.max(a, from));
function cutSum(d, from, to) {
  const cuts = d.cuts.filter(c => c.to > from && c.from < to).map(c => ({ ...c }));
  if (d.open) cuts.push({ from: d.open.from, to: d.last || to, kind: d.open.kind, now: true });
  const watched = d.spans.reduce((a, [x, y]) => a + clip(x, y, from, to), 0), down = cuts.reduce((a, c) => a + clip(c.from, c.to, from, to), 0);
  return { cuts, watched, down, avail: watched ? Math.max(0, 100 * (1 - down / watched)) : null };
}
let JOUR = 'j';  // « j » de jour, traduit à l'ouverture
const durTxt = ms => { const s = Math.round(ms / 1000), m = Math.round(s / 60), h = Math.floor(s / 3600), j = Math.floor(s / 86400);
  return s < 60 ? s + ' s' : s < 3600 ? m + ' min' : s < 86400 ? h + ' h ' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') : j + ' ' + JOUR + ' ' + Math.floor(s % 86400 / 3600) + ' h'; };
const pctTxt = p => p == null ? '—' : (p >= 99 && p < 100 ? p.toFixed(2) : Math.round(p * 10) / 10).toString().replace('.', ',') + ' %';
console.assert(durTxt(45000) === '45 s' && durTxt(180000) === '3 min' && durTxt(3900000) === '1 h 05' && durTxt(2 * 86400000 + 4 * 3600000) === '2 j 4 h' && pctTxt(99.512) === '99,51 %' && pctTxt(100) === '100 %', 'réseau : durées');
console.assert((() => { const r = cutSum({ spans: [[0, 1000], [2000, 3000]], cuts: [{ from: 100, to: 300, kind: 'net' }, { from: 2900, to: 3000, kind: 'box' }], open: null }, 0, 2950); return r.watched === 1950 && r.down === 250 && r.cuts.length === 2; })(), 'réseau : relevé');

export default async function (ctx) {
  const view = ctx.view, el = ctx.el, host = ctx.host, ID = ctx.id;
  if (!host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  host.addStyle(CSS);
  const main = (n, ...a) => ctx.neo.pluginMain(ID, n, ...a);
  const noMain = e => /PERMISSION|rien à/.test(e.message) ? 'Le volet système de Réseau n\'est pas lancé : accorde-lui « volet système » dans Autorisations.' : e.message;

  const wrap = el('div', 'rsWrap appWrap wide'), head = el('div', 'agHead'), testB = el('button', 'btn px', 'TESTER MA CONNEXION'), tests = el('div', 'rsTests'), verdict = el('div', 'rsVerdict');
  const head2 = el('div', 'agHead'), wifi = el('div', 'rsWifi'), wInfo = el('div', 'hint');
  const game = el('select', 'rsGame'); game.title = 'le serveur de jeu à tester';
  head.append(el('span', 'label', 'Connexion'), game, testB);
  main('net:games').then(g => { game.replaceChildren(...g.list.map(x => { const o = el('option', '', x.name + (x.info ? ' (' + x.info + ')' : '')); o.value = x.id; return o; })); game.value = g.pick; }, () => {});
  head2.append(el('span', 'label', 'Wi-Fi enregistrés'), el('span', 'hint', 'les réseaux que ce PC connaît'));
  // la surveillance des coupures
  const T = x => host.t ? host.t(x) : x; JOUR = T('j');
  const cHead = el('div', 'agHead rsCutHead'), onL = el('label', 'rsOn'), onB = el('input'), live = el('div', 'rsLive'), per = el('select', 'rsGame');
  onB.type = 'checkbox'; onL.append(onB, 'Surveiller');
  for (const [v, t] of [['1', '24 heures'], ['7', '7 jours'], ['30', '30 jours'], ['90', '90 jours']]) { const o = el('option', '', t); o.value = v; per.append(o); }
  per.value = '7'; per.title = 'la période du relevé';
  const copyB = el('button', 'btn px', 'COPIER LE RELEVÉ'), csvB = el('button', 'btn px', 'CSV'), clrB = el('button', 'btn px', 'EFFACER');
  copyB.title = 'un texte prêt à coller dans un message à ton opérateur'; csvB.title = 'le relevé en tableur'; clrB.title = 'effacer l’historique des coupures';
  cHead.append(el('span', 'label', 'Coupures'), onL, el('span', 'grow'), per, copyB, csvB, clrB);
  const cStats = el('div', 'rsTests'), bar = el('div', 'rsBar'), barLeg = el('div', 'rsBarLeg'), cList = el('div', 'rsCuts');
  const cHint = el('div', 'hint', 'NeoDex vérifie ta box et Internet toutes les 10 s tant qu’il est ouvert, même réduit. Une coupure est notée après 20 s sans réponse ; le PC en veille ou NeoDex fermé ne comptent pas.');
  let cut = null;
  const stat = (t, v, d, cls) => { const c = el('div', 'rsCard' + (cls ? ' ' + cls : '')); c.append(el('div', 't', t), el('div', 'v', v), el('div', 'd', d)); return c; };
  const when = t => new Date(t).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const kindTxt = k => k === 'box' ? 'la box ne répondait pas (box, câble ou Wi-Fi de ce PC)' : 'Internet coupé alors que la box répondait (côté opérateur)';
  const range = () => { const to = Date.now(); return [to - +per.value * 864e5, to]; };
  function cutRender(d = cut) {
    if (!d) return; cut = d; onB.checked = d.on;
    live.className = 'rsLive' + (d.open ? ' cut' : d.state === 'ok' ? ' ok' : '');
    live.textContent = !d.on ? 'Surveillance arrêtée : coche « Surveiller » pour noter chaque coupure.'
      : d.open ? 'Coupure en cours depuis ' + durTxt(Date.now() - d.open.from) + ' : ' + kindTxt(d.open.kind) + '.'
      : d.state === 'ok' ? 'Surveillance en cours · tout répond.' : d.state === 'doubt' ? 'Surveillance en cours · une vérification a échoué, on revérifie…'
      : d.state === 'wake' ? 'Surveillance en cours · retour de veille, le réseau se reconnecte…' : 'Surveillance en cours…';
    const [from, to] = range(), r = cutSum(d, from, to), nbox = r.cuts.filter(c => c.kind === 'box').length;
    cStats.replaceChildren(stat('COUPURES', String(r.cuts.length), nbox ? nbox + ' côté box ou Wi-Fi · ' + (r.cuts.length - nbox) + ' côté opérateur' : r.cuts.length ? 'toutes côté opérateur' : 'aucune', r.cuts.length ? 'bad' : r.watched ? 'good' : ''),
      stat('DURÉE COUPÉE', r.down ? durTxt(r.down) : '0', r.cuts.length ? 'la plus longue : ' + durTxt(Math.max(...r.cuts.map(c => c.to - c.from))) : 'en tout', r.down ? 'bad' : ''),
      stat('DISPONIBLE', pctTxt(r.avail), 'du temps surveillé', r.avail == null ? '' : r.avail >= 99.9 ? 'good' : r.avail >= 99 ? 'mid' : 'bad'),
      stat('SURVEILLÉ', r.watched ? durTxt(r.watched) : '0', 'sur ' + per.selectedOptions[0].textContent));
    const pos = (a, b) => 'left:' + (100 * (Math.max(a, from) - from) / (to - from)) + '%;width:' + (100 * (Math.min(b, to) - Math.max(a, from)) / (to - from)) + '%';
    bar.replaceChildren(...d.spans.filter(([a, b]) => b > from).map(([a, b]) => { const i = el('i', 'w'); i.style.cssText = pos(a, b); i.title = 'surveillé : ' + when(a) + ' → ' + when(b); return i; }),
      ...r.cuts.map(c => { const i = el('i', c.kind); i.style.cssText = pos(c.from, c.to); i.title = when(c.from) + ' · ' + durTxt(c.to - c.from) + ' · ' + kindTxt(c.kind); return i; }));
    const leg = el('span'); leg.append(el('b'), 'surveillé', el('b'), 'coupure côté opérateur', el('b'), 'box ou Wi-Fi');
    [...leg.querySelectorAll('b')].forEach((b, i) => { b.style.background = ['color-mix(in srgb,#3fdc7a 45%,#000)', '#ff4d6d', '#ff9a3a'][i]; });
    barLeg.replaceChildren(el('span', '', when(from)), leg, el('span', '', 'maintenant'));
    cList.replaceChildren(...r.cuts.slice().reverse().slice(0, 100).map(c => { const row = el('div', 'rsCut ' + c.kind);
      row.append(el('span', '', when(c.from) + ' → ' + (c.now ? 'en cours' : new Date(c.to).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))), el('b', '', durTxt(c.to - c.from)), el('span', 'k', kindTxt(c.kind))); return row; }));
    if (!r.cuts.length) cList.append(el('div', 'hint', r.watched ? 'Aucune coupure sur cette période.' : 'Rien de surveillé sur cette période.'));
    copyB.disabled = csvB.disabled = !r.watched;
  }
  function cutReport() {  // le relevé en texte simple, dans la langue de NeoDex
    const [from, to] = range(), r = cutSum(cut, from, to), first = cut.spans.find(([, b]) => b > from);
    const lines = [T('Coupures de ma connexion Internet (relevé automatique, une vérification toutes les 10 secondes)'),
      T('Période :') + ' ' + when(first ? Math.max(first[0], from) : from) + ' → ' + when(to) + ' · ' + T('temps surveillé :') + ' ' + durTxt(r.watched),
      T('Coupures :') + ' ' + r.cuts.length + ' · ' + T('durée totale :') + ' ' + durTxt(r.down) + ' · ' + T('connexion disponible') + ' ' + pctTxt(r.avail) + ' ' + T('du temps surveillé'), ''];
    for (const c of r.cuts) lines.push('- ' + when(c.from) + ' → ' + (c.now ? T('en cours') : when(c.to)) + ' (' + durTxt(c.to - c.from) + ') : ' + T(kindTxt(c.kind)));
    return lines.join('\n');
  }
  onB.onchange = async () => { try { cutRender(await main('cut:watch', onB.checked)); } catch (e) { onB.checked = !onB.checked; host.toast(noMain(e), true); } };
  per.onchange = () => cutRender();
  copyB.onclick = async () => { try { await main('wifi:copy', cutReport()); host.toast('Relevé copié : colle-le dans ton message à l’opérateur'); } catch (e) { host.toast(noMain(e), true); } };
  csvB.onclick = async () => {
    const [from, to] = range(), r = cutSum(cut, from, to), q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const csv = [[T('début'), T('fin'), T('durée (secondes)'), T('cause')].map(q).join(';'), ...r.cuts.map(c => [when(c.from), c.now ? T('en cours') : when(c.to), Math.round((c.to - c.from) / 1000), T(kindTxt(c.kind))].map(q).join(';'))].join('\r\n');
    try { const f = await main('cut:save', csv, 'coupures-' + new Date().toISOString().slice(0, 10) + '.csv'); if (f) host.toast('Enregistré : ' + f); } catch (e) { host.toast(noMain(e), true); }
  };
  clrB.onclick = async () => { if (!confirm(T('Effacer tout l’historique des coupures ?'))) return; try { cutRender(await main('cut:clear')); } catch (e) { host.toast(noMain(e), true); } };
  ctx.neo.onPluginMain?.(e => { if (e.id === ID && e.name === 'cut') cutRender(e.data); });
  const cutLoad = () => main('cut:state').then(d => cutRender(d), e => { live.textContent = noMain(e); });
  wrap.append(head, tests, verdict, cHead, live, cStats, bar, barLeg, cList, cHint, head2, wInfo, wifi); view.replaceChildren(wrap);

  // seuils : ping (ms) bon / moyen ; au-delà, mauvais. Une perte de paquets compte toujours comme mauvaise.
  const card = (title, r, good, mid, ip) => {
    const c = el('div', 'rsCard'), v = el('div', 'v'), d = el('div', 'd');
    if (!r) { v.textContent = '—'; d.textContent = 'introuvable'; }
    else if (r.loss === 100) { c.classList.add('bad'); v.textContent = 'injoignable'; d.textContent = 'aucune réponse'; }
    else { c.classList.add(r.loss > 0 || r.avg > mid ? 'bad' : r.avg > good ? 'mid' : 'good'); v.textContent = r.avg + ' ms';
      d.textContent = 'min ' + r.min + ' · max ' + r.max + ' · gigue ' + r.jitter + (r.loss ? ' · perte ' + r.loss + ' %' : ''); }
    c.prepend(el('div', 't', title)); c.append(v, d); if (ip) c.title = ip; return c;
  };
  testB.onclick = async () => {
    testB.disabled = true; verdict.textContent = 'Test en cours (une quinzaine de secondes)…'; tests.replaceChildren();
    try {
      const r = await main('net:test', game.value);
      const dnsCard = el('div', 'rsCard ' + (r.dns == null ? 'bad' : r.dns > 150 ? 'mid' : 'good'));
      dnsCard.append(el('div', 't', 'DNS'), el('div', 'v', r.dns == null ? 'en panne' : r.dns + ' ms'), el('div', 'd', 'trouver l\'adresse d\'un site'));
      tests.replaceChildren(card('TA BOX', r.box, 5, 20, r.gw), card('INTERNET', r.net, 30, 70, '1.1.1.1'), dnsCard, card(r.gameName.toUpperCase(), r.game, 35, 70, r.gameIp));
      const bad = !r.box || r.box.loss ? 'Ta box répond mal : vérifie le câble ou le Wi-Fi de ce PC.'
        : r.net.loss === 100 ? 'Ta box répond mais Internet non : le problème vient de la box ou de ton opérateur.'
        : r.dns == null ? 'Internet marche mais le DNS non : les sites ne s\'ouvriront pas.'
        : r.game && (r.game.loss || r.game.jitter > 15) ? 'Connexion instable vers ' + r.gameName + ' : attends-toi à du lag.'
        : r.box.avg > 20 ? 'Le Wi-Fi est lent entre ce PC et la box : un câble ferait mieux.' : '';
      verdict.textContent = bad || 'Tout va bien.' + (r.game && !r.game.loss ? ' Ping vers ' + r.gameName + ' : ' + r.game.avg + ' ms' + (r.gameId === 'riot' ? ' (l’entrée du réseau de Riot ; le serveur de jeu ajoute quelques ms).' : '.') : '');
    } catch (e) { verdict.textContent = 'Test impossible : ' + noMain(e); }
    testB.disabled = false;
  };

  async function loadWifi() {
    wInfo.textContent = 'Lecture…';
    try {
      const list = await main('wifi:list');
      wInfo.textContent = list.length ? list.length + ' réseau' + (list.length > 1 ? 'x' : '') + ' · le mot de passe n\'est lu que quand tu cliques sur « Afficher »' : 'Aucun réseau Wi-Fi enregistré sur ce PC.';
      wifi.replaceChildren(...list.map(n => {
        const r = el('div', 'rsNet'), show = el('button', 'btn px', 'AFFICHER'), copy = el('button', 'btn px', 'COPIER'), code = el('code');
        const open = !n.auth || /open/i.test(n.auth);
        r.append(el('span', 'n', n.name), el('span', 'a', open ? 'ouvert' : n.auth.replace('WPA3SAE', 'WPA3').replace('WPA2PSK', 'WPA2')), code);
        let key = null; const get = async () => key ?? (key = await main('wifi:key', n.name));
        show.onclick = async () => { if (code.textContent) { code.textContent = ''; show.textContent = 'AFFICHER'; return; }
          try { const k = await get(); code.textContent = k || '(pas de mot de passe)'; show.textContent = 'MASQUER'; } catch (e) { host.toast(noMain(e), true); } };
        copy.onclick = async () => { try { const k = await get(); if (!k) return host.toast('Pas de mot de passe', true); await main('wifi:copy', k); host.toast('Mot de passe copié'); } catch (e) { host.toast(noMain(e), true); } };
        if (!open) r.append(show, copy); return r;
      }));
    } catch (e) { wInfo.textContent = 'Lecture impossible : ' + noMain(e); }
  }
  view.__rs = { game, render: cutRender, report: cutReport, sum: cutSum };  // pour l'auto-test
  ctx.onOpen(() => { loadWifi(); cutLoad(); });
  cutLoad();
  ctx.onClose(() => { for (const c of wifi.querySelectorAll('code')) c.textContent = ''; });  // un mot de passe affiché ne reste pas à l'écran
  loadWifi();
}
