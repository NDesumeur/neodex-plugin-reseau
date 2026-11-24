// Réseau, volet système : les réseaux Wi-Fi enregistrés dans Windows (mot de passe lu seulement quand tu le demandes)
// et un test de connexion : ta box, Internet, le DNS et le serveur de jeu que tu choisis (Riot, Steam, Fortnite, Battle.net).
// Les sorties de netsh et ping changent de langue et d'encodage selon Windows : on lit des fichiers XML (netsh export)
// et, pour ping, seulement les nombres des lignes de réponse (celles qui ont un TTL).
const { execFile, spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), dns = require('dns').promises;
const LOL_HOST = 'prod.euw1.lol.riotgames.com';
// les réseaux de Riot Games (AS6507) : leurs serveurs ne répondent pas au ping, mais leur premier routeur, si
const RIOT = [['104.160.128.0', 19], ['185.40.64.0', 22], ['162.249.72.0', 21], ['192.64.168.0', 21]];
// les serveurs de jeu au choix. riot : l'entrée du réseau de Riot trouvée par tracert ; steam : un relais Valve (liste lue chez Steam) ; host : une adresse qui répond au ping
const GAMES = {
  riot: { name: 'Riot · EUW', info: 'League of Legends, Valorant' },
  'steam-par': { name: 'Steam · Paris', steam: 'par', ip: '185.25.182.18' },
  'steam-fra': { name: 'Steam · Francfort', steam: 'fra', ip: '155.133.226.68' },
  'steam-ams': { name: 'Steam · Amsterdam', steam: 'ams', ip: '155.133.248.36' },
  fortnite: { name: 'Fortnite · Europe', host: 'ping-eu.ds.on.epicgames.com' },
  blizzard: { name: 'Battle.net · Europe', host: 'eu.actual.battle.net', info: 'serveur de connexion de Blizzard' },
};
async function steamRelay(pop, fallback) {  // les relais changent parfois d'adresse : on lit la liste de Steam, sinon l'adresse connue
  try { const j = await (await fetch('https://api.steampowered.com/ISteamApps/GetSDRConfig/v1/?appid=730', { signal: AbortSignal.timeout(4000) })).json(); return j.pops[pop].relays[0].ipv4 || fallback; } catch { return fallback; }
}
const ipNum = ip => ip.split('.').reduce((a, b) => a * 256 + +b, 0);
const inRiot = ip => RIOT.some(([n, b]) => Math.floor(ipNum(ip) / 2 ** (32 - b)) === Math.floor(ipNum(n) / 2 ** (32 - b)));
const run = (cmd, args) => new Promise((ok, ko) => execFile(cmd, args, { windowsHide: true, timeout: 30000 }, (e, out) => e && !out ? ko(e) : ok(String(out))));

async function exportProfiles(name) {  // netsh écrit un XML par profil ; le dossier temporaire est effacé aussitôt lu
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neodex-wifi-'));
  try {
    await run('netsh', ['wlan', 'export', 'profile', ...(name ? ['name=' + name] : []), ...(name ? ['key=clear'] : []), 'folder=' + dir]);
    return fs.readdirSync(dir).filter(f => f.endsWith('.xml')).map(f => {
      const x = fs.readFileSync(path.join(dir, f), 'utf8'), tag = t => (new RegExp('<' + t + '>([^<]*)</' + t + '>').exec(x) || [])[1] || '';
      const un = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
      return { name: un(tag('name')), auth: tag('authentication'), key: un(tag('keyMaterial')) };
    });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function parsePing(out, n) {  // locale-indépendant : « temps=12 ms TTL=… », « time<1ms TTL=… »
  const t = [...out.matchAll(/[=<]\s?(\d+)\s?ms\s+TTL/gi)].map(m => +m[1]);
  if (!t.length) return { loss: 100 };
  const avg = t.reduce((a, b) => a + b, 0) / t.length;
  const jitter = t.length > 1 ? t.slice(1).reduce((a, v, i) => a + Math.abs(v - t[i]), 0) / (t.length - 1) : 0;
  return { avg: Math.round(avg), min: Math.min(...t), max: Math.max(...t), jitter: Math.round(jitter), loss: Math.round(100 * (n - t.length) / n) };
}
const ping = (ip, n = 8) => run('ping', ['-n', String(n), '-w', '1000', ip]).then(o => parsePing(o, n), () => ({ loss: 100 }));

// tracert jusqu'au premier routeur de Riot, arrêté dès qu'il est trouvé (ou après 3 sauts muets) : donne aussi ta box (saut 1)
function route(ip) {
  return new Promise(ok => {
    const p = spawn('tracert', ['-d', '-w', '700', '-h', '15', ip], { windowsHide: true });
    let buf = '', gw = '', riot = '', silent = 0; const done = () => { try { p.kill(); } catch {} ok({ gw, riot }); };
    p.stdout.on('data', d => {
      buf += d; const lines = buf.split(/\r?\n/); buf = lines.pop();
      for (const l of lines) {
        const m = /^\s*(\d+)\s.*?(\d+\.\d+\.\d+\.\d+)\s*$/.exec(l);
        if (!/^\s*\d+\s/.test(l)) continue;
        if (!m) { if (++silent >= 3) return done(); continue; }
        silent = 0; if (m[1] === '1') gw = m[2];
        if (inRiot(m[2])) { riot = m[2]; return done(); }
      }
    });
    p.on('close', done); p.on('error', done); setTimeout(done, 25000);
  });
}

// la surveillance des coupures : toutes les 10 s, un ping vers la box et un vers Internet (1.1.1.1, sinon 8.8.8.8).
// Une coupure n'est notée qu'après 2 vérifications ratées de suite (20 s) ; un trou de plus d'une minute entre deux vérifications (PC en veille, NeoDex fermé)
// coupe la période surveillée au lieu de compter comme une coupure, et les 30 s après un réveil sont ignorées (le Wi-Fi se reconnecte).
const CUT_EVERY = 10000, CUT_GAP = 60000, CUT_WAKE = 30000, CUT_KEEP = 90 * 864e5;
const cutEmpty = () => ({ on: false, spans: [], cuts: [], open: null, fails: 0, last: 0, wake: 0, state: '' });
// une vérification : res = { box: true/false/null (null : aucune box trouvée), net: true/false } ; renvoie true si l'historique a changé (à écrire)
function cutStep(c, now, res) {
  let dirty = false;
  if (!c.last || now - c.last > CUT_GAP) {  // première vérification ou réveil : nouvelle période surveillée, une coupure ouverte est refermée à la dernière vérification
    if (c.open) { if (c.open.confirmed) { c.cuts.push({ from: c.open.from, to: c.last, kind: c.open.kind }); } c.open = null; c.fails = 0; dirty = true; }
    if (c.last) c.wake = now + CUT_WAKE;
    c.spans.push([now, now]); dirty = true;
  }
  const span = c.spans[c.spans.length - 1]; if (now - (c.saved || 0) > 5 * 60000) { dirty = true; c.saved = now; } span[1] = now; c.last = now;
  if (now < c.wake) { c.state = 'wake'; return dirty; }
  const ok = res.net, kind = res.box === true ? 'net' : 'box';
  if (ok) {
    if (c.open?.confirmed) { c.cuts.push({ from: c.open.from, to: now, kind: c.open.kind }); dirty = true; }
    c.open = null; c.fails = 0; c.state = 'ok';
  } else {
    if (!c.open) c.open = { from: now, kind }; else if (kind === 'box') c.open.kind = 'box';  // la box injoignable même un instant : on le dit
    if (++c.fails >= 2 && !c.open.confirmed) { c.open.confirmed = true; dirty = true; }
    c.state = c.open.confirmed ? 'cut-' + c.open.kind : 'doubt';
  }
  const old = now - CUT_KEEP; c.cuts = c.cuts.filter(x => x.to > old); c.spans = c.spans.filter(x => x[1] > old);
  return dirty;
}
const gateway = () => run('route', ['print', '-4', '0.0.0.0']).then(o => (/^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)/m.exec(o) || [])[1] || '', () => '');
const alive = ip => run('ping', ['-n', '1', '-w', '1500', ip]).then(o => parsePing(o, 1).loss === 0, () => false);

module.exports = api => {
  // la surveillance : l'état vit ici (le volet tourne tant que NeoDex est ouvert, même sans la fenêtre de Réseau)
  const cut = Object.assign(cutEmpty(), api.readDoc('local-coupures') || {}); cut.open = null; cut.fails = 0; cut.last = 0; cut.wake = 0; cut.state = '';
  const cutSave = () => api.writeDoc('local-coupures', { on: cut.on, spans: cut.spans, cuts: cut.cuts });
  let gw = '', gwAt = 0, timer = null, busy = false;
  const check = async () => {
    if (busy) return; busy = true;
    try {
      if (!gw || Date.now() - gwAt > 5 * 60000) { gw = await gateway(); gwAt = Date.now(); }
      let box = gw ? await alive(gw) : null;
      if (box === false || box === null) { gw = await gateway(); gwAt = Date.now(); box = gw ? await alive(gw) : null; }  // changement de réseau : on relit la box
      const net = await alive('1.1.1.1') || await alive('8.8.8.8');
      if (cutStep(cut, Date.now(), { box, net })) cutSave();
      api.emit('cut', cutView());
    } catch {} finally { busy = false; }
  };
  const cutView = () => ({ on: cut.on, spans: cut.spans, cuts: cut.cuts, open: cut.open?.confirmed ? { from: cut.open.from, kind: cut.open.kind } : null, state: cut.state, last: cut.last, every: CUT_EVERY });
  const cutRun = () => { clearInterval(timer); timer = null; if (cut.on) { timer = setInterval(check, CUT_EVERY); check(); } };
  cutRun();

  const on = (n, f) => api.ipcMain.handle(n, f);
  on('wifi:list', async () => (await exportProfiles()).map(({ name, auth }) => ({ name, auth })));
  on('wifi:key', async (_, name) => { const p = (await exportProfiles(String(name)))[0]; return p ? p.key : ''; });
  on('wifi:copy', async (_, text) => { await api.electron.clipboard.writeText(String(text)); return true; });
  on('cut:state', () => cutView());
  on('cut:watch', (_, v) => { cut.on = !!v; if (!cut.on && cut.open?.confirmed) cut.cuts.push({ from: cut.open.from, to: cut.last, kind: cut.open.kind }); if (!cut.on) { cut.open = null; cut.fails = 0; cut.last = 0; cut.state = ''; } cutSave(); cutRun(); return cutView(); });
  on('cut:clear', () => { Object.assign(cut, cutEmpty(), { on: cut.on }); cutSave(); cutRun(); return cutView(); });
  on('cut:save', async (_, csv, name) => {  // le relevé en CSV, là où tu veux
    const r = await api.electron.dialog.showSaveDialog(api.getWin(), { defaultPath: String(name || 'coupures.csv'), filters: [{ name: 'CSV', extensions: ['csv'] }] });
    if (r.canceled || !r.filePath) return false; fs.writeFileSync(r.filePath, '\ufeff' + String(csv)); return r.filePath;
  });
  on('net:games', () => ({ list: Object.entries(GAMES).map(([id, g]) => ({ id, name: g.name, info: g.info || '' })), pick: api.readDoc('game')?.id || 'riot' }));
  on('net:test', async (_, gid) => {
    const g = GAMES[gid] ? gid : api.readDoc('game')?.id || 'riot'; api.writeDoc('game', { id: g });
    let r = api.readDoc('route') || {};
    const t0 = Date.now(); let dnsMs = null, lol = null;
    try { lol = (await dns.lookup(LOL_HOST, { family: 4 })).address; dnsMs = Date.now() - t0; } catch {}
    if (!r.riot || !r.gw || r.lol !== lol) { r = { ...(lol ? await route(lol) : {}), lol }; if (r.riot) api.writeDoc('route', r); }
    const G = GAMES[g], gameIp = g === 'riot' ? r.riot : G.steam ? await steamRelay(G.steam, G.ip) : await dns.lookup(G.host, { family: 4 }).then(x => x.address, () => '');
    const [box, net, game] = await Promise.all([r.gw ? ping(r.gw) : null, ping('1.1.1.1'), gameIp ? ping(gameIp, 12) : null]);
    if (g === 'riot' && game && game.loss === 100) api.writeDoc('route', {});  // le routeur a changé : le prochain test refait le chemin
    return { box, net, game, gameId: g, gameName: G.name, dns: dnsMs, gw: r.gw || '', gameIp: gameIp || '' };
  });
  return () => { clearInterval(timer); if (cut.open?.confirmed) { cut.cuts.push({ from: cut.open.from, to: cut.last, kind: cut.open.kind }); cutSave(); } };
};
module.exports.cutStep = cutStep; module.exports.cutEmpty = cutEmpty; module.exports.parsePing = parsePing; module.exports.inRiot = inRiot; module.exports.GAMES = GAMES;
