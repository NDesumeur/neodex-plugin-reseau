// node test-main.js : vérifie le volet système sur ce PC (Wi-Fi, ping, chemin vers Riot) ; n'affiche aucun mot de passe
const assert = require('assert'), m = require('./main.js');
assert.deepEqual(m.parsePing('Réponse de 1.1.1.1 : octets=32 temps=6 ms TTL=57\nReply from 1.1.1.1: bytes=32 time<1ms TTL=57\n', 4), { avg: 4, min: 1, max: 6, jitter: 5, loss: 50 });
assert.equal(m.parsePing('Délai dépassé', 4).loss, 100);
assert.ok(m.inRiot('104.160.154.109') && m.inRiot('185.40.64.65') && !m.inRiot('212.27.35.13'));
{ // la surveillance des coupures, sans réseau : une suite de vérifications inventée (secondes)
  const c = m.cutEmpty(), B = 1.7e12, at = (t, box, net) => m.cutStep(c, B + t * 1000, { box, net });
  at(0, true, true); at(10, true, false); assert.equal(c.state, 'doubt'); at(20, true, false); assert.equal(c.state, 'cut-net'); at(30, false, false); assert.equal(c.state, 'cut-box');
  at(40, true, true); assert.deepEqual(c.cuts, [{ from: B + 10000, to: B + 40000, kind: 'box' }]);
  at(50, true, false); at(60, true, true); assert.equal(c.cuts.length, 1, 'un seul raté ne compte pas');
  at(200, true, true); assert.equal(c.spans.length, 2, 'veille : nouvelle période'); at(210, null, false); assert.equal(c.state, 'wake', 'réveil ignoré');
  at(240, null, false); at(250, null, false); assert.equal(c.state, 'cut-box');
  at(400, true, true); assert.deepEqual(c.cuts[1], { from: B + 240000, to: B + 250000, kind: 'box' }, 'coupure refermée avant la veille'); assert.equal(c.spans.length, 3);
  assert.deepEqual(c.spans[0], [B, B + 60000]);
}
let doc = {}; const h = new Map();
m({ readDoc: n => doc[n], writeDoc: (n, d) => { doc[n] = d; }, electron: {}, ipcMain: { handle: (n, f) => h.set(n, (...a) => f({}, ...a)) } });
(async () => {
  const list = await h.get('wifi:list')(); console.log('wifi', list.length, list.slice(0, 2).map(x => x.auth));
  if (list[0]) { const k = await h.get('wifi:key')(list[0].name); console.log('clé lue :', typeof k, k.length > 0); }
  let t = Date.now(); console.log(JSON.stringify(await h.get('net:test')()), Date.now() - t, 'ms');
  t = Date.now(); console.log(JSON.stringify(await h.get('net:test')()), Date.now() - t, 'ms (chemin en cache)');
  for (const g of ['steam-par', 'fortnite']) { const r = await h.get('net:test')(g); assert.equal(r.gameId, g); assert.ok(r.gameIp, g); console.log(g, r.gameIp, r.game && r.game.avg, 'ms'); }
  assert.equal(doc.game.id, 'fortnite'); assert.equal((await h.get('net:games')()).pick, 'fortnite');
  console.log('ok');
})().catch(e => { console.error(e); process.exit(1); });
