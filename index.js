// Réseau : test de ta connexion (box, Internet, DNS, League of Legends EUW) et tes réseaux Wi-Fi enregistrés avec leur mot de passe.
// Tout ce qui touche Windows se fait dans le volet système (main.js).
const CSS = `
.rsWrap{max-width:900px;margin:0 auto;padding:22px;display:flex;flex-direction:column;gap:14px;box-sizing:border-box}
.rsTests{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.rsCard{padding:14px;display:flex;flex-direction:column;gap:6px;background:color-mix(in srgb,var(--line2,#3a2a6e) 45%,#000);box-shadow:inset 0 0 0 2px var(--line2,#3a2a6e)}
.rsCard .t{font:8px var(--title);letter-spacing:1px;color:var(--lilac,#c9bde6)}
.rsCard .v{font:22px var(--title);color:#fff}
.rsCard .d{font-size:11px;color:var(--muted,#9a8cc0)}
.rsCard.good{box-shadow:inset 0 0 0 2px #3fdc7a}.rsCard.good .v{color:#3fdc7a}
.rsCard.mid{box-shadow:inset 0 0 0 2px var(--yellow,#ffd84a)}.rsCard.mid .v{color:var(--yellow,#ffd84a)}
.rsCard.bad{box-shadow:inset 0 0 0 2px #ff4d6d}.rsCard.bad .v{color:#ff4d6d}
.rsVerdict{font-size:14px;color:#fff;min-height:1.2em}
.rsWifi{display:flex;flex-direction:column;gap:6px}
.rsNet{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;background:color-mix(in srgb,var(--line2,#3a2a6e) 30%,#000)}
.rsNet .n{flex:1;min-width:140px;color:#fff;font-size:14px}
.rsNet .a{font-size:11px;color:var(--muted,#9a8cc0)}
.rsNet code{font:13px Consolas,monospace;color:var(--yellow,#ffd84a);user-select:all}
.rsNet button{padding:6px 9px;font-size:9px}`;

export default async function (ctx) {
  const view = ctx.view, el = ctx.el, host = ctx.host, ID = ctx.id;
  if (!host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  host.addStyle(CSS);
  const main = (n, ...a) => ctx.neo.pluginMain(ID, n, ...a);
  const noMain = e => /PERMISSION|rien à/.test(e.message) ? 'Le volet système de Réseau n\'est pas lancé : accorde-lui « volet système » dans Autorisations.' : e.message;

  const wrap = el('div', 'rsWrap'), head = el('div', 'agHead'), testB = el('button', 'btn px', 'TESTER MA CONNEXION'), tests = el('div', 'rsTests'), verdict = el('div', 'rsVerdict');
  const head2 = el('div', 'agHead'), wifi = el('div', 'rsWifi'), wInfo = el('div', 'hint');
  head.append(el('span', 'label', 'Connexion'), testB);
  head2.append(el('span', 'label', 'Wi-Fi enregistrés'), el('span', 'hint', 'les réseaux que ce PC connaît'));
  wrap.append(head, tests, verdict, head2, wInfo, wifi); view.replaceChildren(wrap);

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
      const r = await main('net:test');
      const dnsCard = el('div', 'rsCard ' + (r.dns == null ? 'bad' : r.dns > 150 ? 'mid' : 'good'));
      dnsCard.append(el('div', 't', 'DNS'), el('div', 'v', r.dns == null ? 'en panne' : r.dns + ' ms'), el('div', 'd', 'trouver l\'adresse d\'un site'));
      tests.replaceChildren(card('TA BOX', r.box, 5, 20, r.gw), card('INTERNET', r.net, 30, 70, '1.1.1.1'), dnsCard, card('LOL · EUW', r.riot, 35, 70, r.riotIp));
      const bad = !r.box || r.box.loss ? 'Ta box répond mal : vérifie le câble ou le Wi-Fi de ce PC.'
        : r.net.loss === 100 ? 'Ta box répond mais Internet non : le problème vient de la box ou de ton opérateur.'
        : r.dns == null ? 'Internet marche mais le DNS non : les sites ne s\'ouvriront pas.'
        : r.riot && (r.riot.loss || r.riot.jitter > 15) ? 'Connexion instable vers les serveurs de LoL : attends-toi à du lag.'
        : r.box.avg > 20 ? 'Le Wi-Fi est lent entre ce PC et la box : un câble ferait mieux.' : '';
      verdict.textContent = bad || 'Tout va bien.' + (r.riot ? ' Ping vers l\'entrée du réseau de Riot (EUW) : ' + r.riot.avg + ' ms ; le serveur de jeu ajoute quelques ms.' : '');
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
  ctx.onOpen(loadWifi);
  ctx.onClose(() => { for (const c of wifi.querySelectorAll('code')) c.textContent = ''; });  // un mot de passe affiché ne reste pas à l'écran
  loadWifi();
}
