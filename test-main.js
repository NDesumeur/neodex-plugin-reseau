// node test-main.js : vérifie le volet système sur ce PC (Wi-Fi, ping, chemin vers Riot) ; n'affiche aucun mot de passe
const assert = require('assert'), m = require('./main.js');
assert.deepEqual(m.parsePing('Réponse de 1.1.1.1 : octets=32 temps=6 ms TTL=57\nReply from 1.1.1.1: bytes=32 time<1ms TTL=57\n', 4), { avg: 4, min: 1, max: 6, jitter: 5, loss: 50 });
assert.equal(m.parsePing('Délai dépassé', 4).loss, 100);
assert.ok(m.inRiot('104.160.154.109') && m.inRiot('185.40.64.65') && !m.inRiot('212.27.35.13'));
let doc = {}; const h = new Map();
m({ readDoc: n => doc[n], writeDoc: (n, d) => { doc[n] = d; }, electron: {}, ipcMain: { handle: (n, f) => h.set(n, (...a) => f({}, ...a)) } });
(async () => {
  const list = await h.get('wifi:list')(); console.log('wifi', list.length, list.slice(0, 2).map(x => x.auth));
  if (list[0]) { const k = await h.get('wifi:key')(list[0].name); console.log('clé lue :', typeof k, k.length > 0); }
  let t = Date.now(); console.log(JSON.stringify(await h.get('net:test')()), Date.now() - t, 'ms');
  t = Date.now(); console.log(JSON.stringify(await h.get('net:test')()), Date.now() - t, 'ms (chemin en cache)');
  console.log('ok');
})().catch(e => { console.error(e); process.exit(1); });
