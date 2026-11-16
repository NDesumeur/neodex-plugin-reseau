// lancé par le test « local » de NeoDex : liste Wi-Fi, affiche puis masque un mot de passe (sans l'écrire), test de connexion vers Steam Paris choisi dans la liste, rien ne déborde
module.exports = async ({ pj, sleep }) => {
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
  await sleep(1500);
  return nets + ' réseaux, ' + key + ' ; ' + cards + ' ; ' + verdict;
};
