// lancé par le test « local » de NeoDex : liste Wi-Fi, affiche puis masque un mot de passe (sans l'écrire), test de connexion
module.exports = async ({ pj, sleep }) => {
  await sleep(1500);
  const nets = await pj(`document.querySelectorAll('.rsNet').length`);
  let key = 'pas de réseau protégé';
  if (await pj(`!!document.querySelector('.rsNet button')`)) {
    await pj(`document.querySelector('.rsNet button').click()`); await sleep(1500);
    key = await pj(`document.querySelector('.rsNet code').textContent.length`) > 0 ? 'mot de passe affiché' : 'mot de passe VIDE';
    await pj(`document.querySelector('.rsNet button').click()`);
  }
  await pj(`document.querySelector('.agHead button').click()`);
  for (let i = 0; i < 60; i++) { await sleep(500); if (await pj(`!document.querySelector('.agHead button').disabled`)) break; }
  const cards = await pj(`[...document.querySelectorAll('.rsCard')].map(c => c.textContent.replace(/\\s+/g, ' ')).join(' / ')`);
  const verdict = await pj(`document.querySelector('.rsVerdict').textContent`);
  if (!/ms/.test(cards)) throw new Error('test vide : [' + cards + '] ' + verdict);
  return nets + ' réseaux, ' + key + ' ; ' + cards + ' ; ' + verdict;
};
