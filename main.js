// Réseau, volet système : les réseaux Wi-Fi enregistrés dans Windows (mot de passe lu seulement quand tu le demandes)
// et un test de connexion : ta box, Internet, le DNS et League of Legends (EUW).
// Les sorties de netsh et ping changent de langue et d'encodage selon Windows : on lit des fichiers XML (netsh export)
// et, pour ping, seulement les nombres des lignes de réponse (celles qui ont un TTL).
const { execFile, spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), dns = require('dns').promises;
const LOL_HOST = 'prod.euw1.lol.riotgames.com';
// les réseaux de Riot Games (AS6507) : leurs serveurs ne répondent pas au ping, mais leur premier routeur, si
const RIOT = [['104.160.128.0', 19], ['185.40.64.0', 22], ['162.249.72.0', 21], ['192.64.168.0', 21]];
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

module.exports = api => {
  const on = (n, f) => api.ipcMain.handle(n, f);
  on('wifi:list', async () => (await exportProfiles()).map(({ name, auth }) => ({ name, auth })));
  on('wifi:key', async (_, name) => { const p = (await exportProfiles(String(name)))[0]; return p ? p.key : ''; });
  on('wifi:copy', async (_, text) => { await api.electron.clipboard.writeText(String(text)); return true; });
  on('net:test', async () => {
    let r = api.readDoc('route') || {};
    const t0 = Date.now(); let dnsMs = null, lol = null;
    try { lol = (await dns.lookup(LOL_HOST, { family: 4 })).address; dnsMs = Date.now() - t0; } catch {}
    if (!r.riot || !r.gw || r.lol !== lol) { r = { ...(lol ? await route(lol) : {}), lol }; if (r.riot) api.writeDoc('route', r); }
    const [box, net, riot] = await Promise.all([r.gw ? ping(r.gw) : null, ping('1.1.1.1'), r.riot ? ping(r.riot, 12) : null]);
    if (riot && riot.loss === 100) api.writeDoc('route', {});  // le routeur a changé : le prochain test refait le chemin
    return { box, net, riot, dns: dnsMs, gw: r.gw || '', riotIp: r.riot || '' };
  });
};
module.exports.parsePing = parsePing; module.exports.inRiot = inRiot;
