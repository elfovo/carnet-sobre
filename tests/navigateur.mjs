/**
 * Tests fonctionnels dans un vrai navigateur (Chromium piloté par Playwright).
 *
 * Complètent les tests unitaires : ici le CSS est appliqué, la politique de sécurité (CSP)
 * est active et les pages sont ouvertes comme par un visiteur.
 *
 * Lancer : npm run test:navigateur
 * (le site est servi par un petit serveur intégré au script, puis ouvert aussi en file://)
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'categorie.html', 'article.html', 'a-propos.html'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

// Petit serveur statique, limité au dossier du site
const serveur = http.createServer((req, res) => {
  const chemin = path.normalize(path.join(RACINE, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!chemin.startsWith(RACINE) || !fs.existsSync(chemin) || fs.statSync(chemin).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(chemin)] || 'application/octet-stream' });
  fs.createReadStream(chemin).pipe(res);
});
await new Promise((ok) => serveur.listen(0, ok));
const HTTP = `http://localhost:${serveur.address().port}/`;
const FICHIER = 'file://' + RACINE + '/';

const navigateur = await chromium.launch();
const resultats = [];

async function test(nom, corps, options = {}) {
  const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  const page = await contexte.newPage();
  const erreurs = [];
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await corps(page, erreurs);
    resultats.push({ nom, ok: true });
    console.log('  ✔', nom);
  } catch (e) {
    resultats.push({ nom, ok: false, erreur: e.message });
    console.log('  ✘', nom, '\n     ', e.message);
  } finally {
    await contexte.close();
  }
}

function verifier(condition, message) {
  if (!condition) throw new Error(message);
}

const cartesVisibles = (page) => page.locator('[data-filtrable] [data-categorie]:visible').count();

console.log('Tests dans Chromium');

await test('Bienvenue : le prénom saisi produit le message personnalisé', async (page) => {
  await page.goto(HTTP + 'index.html');
  await page.fill('#prenom', 'Léa');
  await page.click('#form-bienvenue button');
  const message = await page.textContent('#message-bienvenue');
  verifier(message === 'Bonjour Léa, bienvenue sur Carnet Sobre !', `message reçu : ${message}`);
});

await test('Bienvenue : la touche Entrée envoie aussi le formulaire (clavier seul)', async (page) => {
  await page.goto(HTTP + 'index.html');
  await page.focus('#prenom');
  await page.keyboard.type('Marc');
  await page.keyboard.press('Enter');
  verifier((await page.textContent('#message-bienvenue')).includes('Marc'), 'pas de message après Entrée');
});

await test('Bienvenue : une injection de script est refusée et rien ne s\'exécute', async (page) => {
  let alerte = false;
  page.on('dialog', async (d) => { alerte = true; await d.dismiss(); });
  await page.goto(HTTP + 'index.html');
  for (const attaque of ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '"><svg onload=alert(1)>']) {
    await page.fill('#prenom', attaque);
    await page.click('#form-bienvenue button');
    verifier((await page.textContent('#prenom-erreur')) !== '', `pas d'erreur pour ${attaque}`);
    verifier((await page.locator('#message-bienvenue img, #message-bienvenue svg, #message-bienvenue script').count()) === 0, 'balise insérée');
  }
  verifier(!alerte, 'une alerte a été déclenchée');
});

await test('Masquer / afficher : le contenu disparaît vraiment à l\'écran puis revient', async (page) => {
  await page.goto(HTTP + 'index.html');
  const carte = page.locator('[data-categorie]').nth(2);
  await carte.locator('.btn-replier').click();
  verifier(!(await carte.locator('.carte-contenu').isVisible()), 'contenu encore visible');
  verifier((await carte.locator('h3').isVisible()), 'le titre a disparu');
  verifier((await carte.locator('.btn-replier .libelle').textContent()) === 'Afficher', 'libellé non mis à jour');
  await carte.locator('.btn-replier').click();
  verifier(await carte.locator('.carte-contenu').isVisible(), 'contenu non réaffiché');
});

await test('Filtre : seules les cartes de la catégorie choisie restent à l\'écran', async (page) => {
  await page.goto(HTTP + 'index.html');
  const attendus = { accessibilite: 2, 'eco-conception': 3, outils: 1, 'developpement-web': 1, toutes: 7 };
  for (const [categorie, nombre] of Object.entries(attendus)) {
    await page.selectOption('#filtre-categorie', categorie);
    const n = await cartesVisibles(page);
    verifier(n === nombre, `${categorie} : ${n} cartes visibles au lieu de ${nombre}`);
  }
});

await test('Sans JavaScript : contenu complet, commandes absentes, menu affiché sur smartphone', async (page) => {
  await page.goto(HTTP + 'index.html');
  verifier((await cartesVisibles(page)) === 7, 'des articles manquent');
  verifier(!(await page.isVisible('#form-bienvenue')), 'formulaire visible sans script');
  verifier(!(await page.isVisible('#filtre-categorie')), 'filtre visible sans script');
  verifier((await page.locator('.btn-replier:visible').count()) === 0, 'boutons visibles sans script');
  verifier(await page.isVisible('#menu a[href="a-propos.html"]'), 'menu caché sans script');
}, { javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

await test('Smartphone (390 px) : aucune barre de défilement horizontale après usage', async (page) => {
  await page.goto(HTTP + 'index.html');
  await page.fill('#prenom', 'Marie-Dominique');
  await page.click('#form-bienvenue button');
  await page.selectOption('#filtre-categorie', 'accessibilite');
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  verifier(!deborde, 'défilement horizontal');
}, { viewport: { width: 390, height: 844 } });

for (const [mode, base] of [['http', HTTP], ['file', FICHIER]]) {
  await test(`CSP : aucune erreur ni violation sur les 4 pages (${mode}://)`, async (page, erreurs) => {
    for (const p of PAGES) await page.goto(base + p);
    verifier(erreurs.length === 0, erreurs.join(' | '));
  });
}

await test('CSP : un script injecté dans la page est bloqué par le navigateur', async (page) => {
  await page.goto(HTTP + 'index.html');
  await page.evaluate(() => {
    const s = document.createElement('script');
    s.textContent = 'window.pirate = true';
    document.body.appendChild(s);
  });
  verifier(!(await page.evaluate(() => window.pirate)), 'le script injecté s\'est exécuté');
});

await navigateur.close();
serveur.close();

const echecs = resultats.filter((r) => !r.ok).length;
console.log(`\n${resultats.length - echecs} réussi(s), ${echecs} échoué(s) sur ${resultats.length}`);
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(resultats, null, 2));
process.exit(echecs ? 1 : 0);
