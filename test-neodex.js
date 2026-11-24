// lancé par le test « local » de NeoDex : liste Wi-Fi, affiche puis masque un mot de passe (sans l'écrire), test de connexion vers Steam Paris choisi dans la liste, rien ne déborde
module.exports = async ({ pj, sleep, shot }) => {
  await sleep(1500);
  const nets = await pj(`document.querySelectorAll('.rsNet').length`);
  let key = 'pas de réseau protégé';
  if (await pj(`!!document.querySelector('.rsNet button')`)) {
    await pj(`document.querySelector('.rsNet button').click()`); await sleep(1500);
    key = await pj(`document.querySelector('.rsNet code').textContent.length`) > 0 ? 'mot de passe affiché' : 'mot de passe VIDE';
    await pj(`document.querySelector('.rsNet button').click()`);
  }
  const opts = await pj(`document.querySelectorAll('.rsGame option').length`);
  if (opts < 5) throw new Error('liste des serveurs de jeu : ' + opts);
  await pj(`document.querySelector('.rsGame').value = 'steam-par', 0`);
  await pj(`document.querySelector('.agHead button').click()`);
  for (let i = 0; i < 60; i++) { await sleep(500); if (await pj(`!document.querySelector('.agHead button').disabled`)) break; }
  const cards = await pj(`[...document.querySelectorAll('.rsCard')].map(c => c.textContent.replace(/\\s+/g, ' ')).join(' / ')`);
  const verdict = await pj(`document.querySelector('.rsVerdict').textContent`);
  if (!/ms/.test(cards)) throw new Error('test vide : [' + cards + '] ' + verdict);
  if (!/STEAM · PARIS/.test(cards)) throw new Error('carte du jeu choisi absente : ' + cards);
  const over = await pj(`[...document.querySelectorAll('.appWrap *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length`);
  if (over) throw new Error(over + ' élément(s) débordent à droite');
  // la surveillance des coupures : cochée, une vraie vérification arrive ; puis un faux historique pour le relevé
  const R = `document.querySelector('.rsWrap').parentElement.__rs`;
  await pj(`(() => { const c = document.querySelector('.rsOn input'); c.checked = true; c.dispatchEvent(new Event('change')); })(), 0`);
  let live = '';
  for (let i = 0; i < 30; i++) { await sleep(500); live = await pj(`document.querySelector('.rsLive').textContent`); if (/tout répond|échoué|Coupure/.test(live)) break; }
  if (!/Surveillance en cours|Coupure en cours/.test(live)) throw new Error('surveillance : ' + live);
  const H = Date.now() - 3600e3;
  await pj(`${R}.render({ on: true, state: 'ok', last: Date.now(), every: 10000, open: null, spans: [[${H} - 86400e3, ${H} - 82800e3], [${H}, Date.now()]], cuts: [{ from: ${H} + 600e3, to: ${H} + 750e3, kind: 'net' }, { from: ${H} + 1800e3, to: ${H} + 1830e3, kind: 'box' }] }), 0`);
  const stats = await pj(`[...document.querySelectorAll('.rsCutHead ~ .rsTests .rsCard')].map(c => c.textContent.replace(/\\s+/g, ' ')).join(' / ')`);
  if (!/COUPURES ?2/.test(stats) || !/3 min/.test(stats) || !/97,5 %/.test(stats)) throw new Error('relevé : ' + stats);
  if (await pj(`document.querySelectorAll('.rsBar i.net, .rsBar i.box').length`) !== 2 || await pj(`document.querySelectorAll('.rsCut').length`) !== 2) throw new Error('frise ou liste des coupures');
  const rep = await pj(`${R}.report()`);
  if (!/Coupures : 2/.test(rep) || !/côté opérateur/.test(rep) || rep.split('\n').length !== 6) throw new Error('texte du relevé : ' + rep);
  await sleep(300); if (shot) await shot('coupures');
  await pj(`(() => { const c = document.querySelector('.rsOn input'); c.checked = false; c.dispatchEvent(new Event('change')); })(), 0`); await sleep(300);
  if (!/arrêtée/.test(await pj(`document.querySelector('.rsLive').textContent`))) throw new Error('arrêt de la surveillance');
  await sleep(1500);
  return nets + ' réseaux, ' + key + ' ; coupures : surveillance réelle (' + live + '), relevé 2 coupures, frise, texte pour l’opérateur' + ' ; ' + cards + ' ; ' + verdict;
};
