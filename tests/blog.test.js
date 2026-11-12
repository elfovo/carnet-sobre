/**
 * Tests unitaires du script js/blog.js (Jest + jsdom).
 *
 * Trois niveaux :
 *  1. les fonctions pures, testées seules ;
 *  2. les fonctionnalités branchées sur les VRAIES pages du site (index.html, categorie.html),
 *     chargées dans un DOM simulé ;
 *  3. des tests de sécurité : injection de script, valeurs forgées, absence de code dangereux.
 *
 * Lancer : npm test   (couverture : npm run test:couverture)
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const CarnetSobre = require('../js/blog.js');

const RACINE = path.join(__dirname, '..');
const lire = (fichier) => fs.readFileSync(path.join(RACINE, fichier), 'utf8');

// Une page neuve (document + fenêtre) pour chaque test : les écouteurs ne s'accumulent pas.
let document;
let window;

/** Charge une vraie page du site dans un DOM simulé, puis branche le script. */
function chargerPage(fichier, { brancher = true } = {}) {
  const dom = new JSDOM(lire(fichier), { url: 'http://localhost/' + fichier });
  window = dom.window;
  document = window.document;
  if (brancher) CarnetSobre.initialiser(document);
}

/** Tape une valeur dans le champ prénom et envoie le formulaire. */
function envoyerPrenom(valeur) {
  document.getElementById('prenom').value = valeur;
  document.getElementById('form-bienvenue').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

/** Choisit une catégorie dans la liste déroulante. */
function choisirCategorie(valeur) {
  const liste = document.getElementById('filtre-categorie');
  liste.value = valeur;
  liste.dispatchEvent(new window.Event('change', { bubbles: true }));
}

const articlesVisibles = () =>
  Array.from(document.querySelectorAll('[data-filtrable] [data-categorie]')).filter((a) => !a.hidden);

/* ======================================================================
   1. Fonctions pures
   ====================================================================== */
describe('validerPrenom', () => {
  test('accepte un prénom simple, avec accent', () => {
    expect(CarnetSobre.validerPrenom('Léa')).toEqual({ ok: true, valeur: 'Léa' });
  });

  test('accepte les prénoms composés, les apostrophes et les espaces', () => {
    expect(CarnetSobre.validerPrenom('Jean-Pierre').ok).toBe(true);
    expect(CarnetSobre.validerPrenom("N'Golo").ok).toBe(true);
    expect(CarnetSobre.validerPrenom('Anne Marie').ok).toBe(true);
  });

  test("remplace l'apostrophe typographique par une apostrophe droite", () => {
    expect(CarnetSobre.validerPrenom('N’Golo')).toEqual({ ok: true, valeur: "N'Golo" });
  });

  test('retire les espaces autour et réduit les espaces multiples', () => {
    expect(CarnetSobre.validerPrenom('   Anne    Marie  ')).toEqual({ ok: true, valeur: 'Anne Marie' });
  });

  test('refuse un champ vide ou composé seulement d\'espaces', () => {
    for (const vide of ['', '    ', null, undefined]) {
      expect(CarnetSobre.validerPrenom(vide)).toEqual({ ok: false, erreur: 'Saisissez votre prénom.' });
    }
  });

  test('refuse un prénom de plus de 40 caractères, accepte 40 tout juste', () => {
    expect(CarnetSobre.validerPrenom('a'.repeat(40)).ok).toBe(true);
    const trop = CarnetSobre.validerPrenom('a'.repeat(41));
    expect(trop.ok).toBe(false);
    expect(trop.erreur).toMatch(/40 caractères/);
  });

  test('refuse les chiffres et les caractères spéciaux', () => {
    for (const saisie of ['Léa2', 'Léa!', '@lea', '-Léa', "'Léa"]) {
      expect(CarnetSobre.validerPrenom(saisie).ok).toBe(false);
    }
  });
});

describe('messageBienvenue', () => {
  test('insère le prénom dans la phrase', () => {
    expect(CarnetSobre.messageBienvenue('Léa')).toBe('Bonjour Léa, bienvenue sur Carnet Sobre !');
  });
});

describe('filtre : fonctions de calcul', () => {
  const autorises = ['toutes', 'eco-conception', 'accessibilite'];

  test('estVisible : « toutes » affiche tout, sinon seule la bonne catégorie', () => {
    expect(CarnetSobre.estVisible('outils', 'toutes')).toBe(true);
    expect(CarnetSobre.estVisible('accessibilite', 'accessibilite')).toBe(true);
    expect(CarnetSobre.estVisible('outils', 'accessibilite')).toBe(false);
  });

  test('normaliserChoix garde une valeur autorisée', () => {
    expect(CarnetSobre.normaliserChoix('accessibilite', autorises)).toBe('accessibilite');
  });

  test('normaliserChoix ramène une valeur inconnue à « toutes »', () => {
    expect(CarnetSobre.normaliserChoix('pirate', autorises)).toBe('toutes');
    expect(CarnetSobre.normaliserChoix('', autorises)).toBe('toutes');
  });

  test('texteResultat accorde le nombre', () => {
    expect(CarnetSobre.texteResultat(0)).toBe('Aucun article dans cette catégorie.');
    expect(CarnetSobre.texteResultat(1)).toBe('1 article affiché.');
    expect(CarnetSobre.texteResultat(7)).toBe('7 articles affichés.');
  });
});

/* ======================================================================
   2. Fonctionnalités sur les vraies pages
   ====================================================================== */
describe('amélioration progressive', () => {
  test('sans le script, les commandes sont cachées et tout le contenu est visible', () => {
    chargerPage('index.html', { brancher: false });
    expect(document.querySelector('.bienvenue-bloc').hidden).toBe(true);
    expect(document.querySelector('.barre-filtre').hidden).toBe(true);
    document.querySelectorAll('.btn-replier').forEach((b) => expect(b.hidden).toBe(true));
    expect(articlesVisibles()).toHaveLength(7);
  });

  test('une fois le script branché, les commandes apparaissent', () => {
    chargerPage('index.html');
    expect(document.querySelector('.bienvenue-bloc').hidden).toBe(false);
    expect(document.querySelector('.barre-filtre').hidden).toBe(false);
    document.querySelectorAll('.btn-replier').forEach((b) => expect(b.hidden).toBe(false));
  });
});

describe('fonctionnalité 1 : message de bienvenue', () => {
  beforeEach(() => chargerPage('index.html'));

  test('affiche le message personnalisé après un clic sur le bouton', () => {
    envoyerPrenom('Léa');
    expect(document.getElementById('message-bienvenue').textContent).toBe('Bonjour Léa, bienvenue sur Carnet Sobre !');
    expect(document.getElementById('prenom-erreur').textContent).toBe('');
  });

  test('un champ vide affiche une erreur, marque le champ invalide et lui rend le focus', () => {
    envoyerPrenom('   ');
    const champ = document.getElementById('prenom');
    expect(document.getElementById('prenom-erreur').textContent).toBe('Saisissez votre prénom.');
    expect(champ.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(champ);
    expect(document.getElementById('message-bienvenue').textContent).toBe('');
  });

  test('une saisie correcte après une erreur efface l\'erreur', () => {
    envoyerPrenom('');
    envoyerPrenom('Marc');
    expect(document.getElementById('prenom-erreur').textContent).toBe('');
    expect(document.getElementById('prenom').hasAttribute('aria-invalid')).toBe(false);
    expect(document.getElementById('message-bienvenue').textContent).toContain('Marc');
  });

  test('une nouvelle saisie remplace le message précédent', () => {
    envoyerPrenom('Léa');
    envoyerPrenom('Marc');
    expect(document.getElementById('message-bienvenue').textContent).toBe('Bonjour Marc, bienvenue sur Carnet Sobre !');
  });

  test("le formulaire n'est pas envoyé (aucune donnée ne quitte le navigateur)", () => {
    document.getElementById('prenom').value = 'Léa';
    const envoi = new window.Event('submit', { bubbles: true, cancelable: true });
    document.getElementById('form-bienvenue').dispatchEvent(envoi);
    expect(envoi.defaultPrevented).toBe(true);
  });

  test('les zones de message sont annoncées aux lecteurs d\'écran', () => {
    expect(document.getElementById('message-bienvenue').getAttribute('role')).toBe('status');
    expect(document.getElementById('prenom-erreur').getAttribute('role')).toBe('alert');
    expect(document.getElementById('prenom').getAttribute('aria-describedby')).toContain('prenom-erreur');
  });
});

describe('fonctionnalité 2 : masquer / afficher un article', () => {
  test('un clic masque le contenu de la carte, un second clic le réaffiche', () => {
    chargerPage('index.html');
    const carte = document.querySelectorAll('[data-categorie]')[2];
    const bouton = carte.querySelector('.btn-replier');
    const contenu = document.getElementById(bouton.getAttribute('aria-controls'));

    bouton.click();
    expect(contenu.hidden).toBe(true);
    expect(bouton.getAttribute('aria-expanded')).toBe('false');
    expect(bouton.querySelector('.libelle').textContent).toBe('Afficher');
    expect(carte.classList.contains('repliee')).toBe(true);
    expect(carte.querySelector('h3').textContent).not.toBe('');  // le titre reste visible

    bouton.click();
    expect(contenu.hidden).toBe(false);
    expect(bouton.getAttribute('aria-expanded')).toBe('true');
    expect(bouton.querySelector('.libelle').textContent).toBe('Masquer');
    expect(carte.classList.contains('repliee')).toBe(false);
  });

  test('masquer un article ne touche pas les autres', () => {
    chargerPage('index.html');
    const boutons = document.querySelectorAll('.btn-replier');
    boutons[1].click();
    const masques = Array.from(document.querySelectorAll('.carte-contenu')).filter((z) => z.hidden);
    expect(masques).toHaveLength(1);
  });

  test("l'article à la une masque aussi son illustration (deux zones contrôlées)", () => {
    chargerPage('index.html');
    const bouton = document.querySelector('.carte-une .btn-replier');
    bouton.click();
    expect(document.getElementById('contenu-1').hidden).toBe(true);
    expect(document.getElementById('illu-1').hidden).toBe(true);
  });

  test('fonctionne aussi sur la page de liste des articles', () => {
    chargerPage('categorie.html');
    const bouton = document.querySelectorAll('.liste .btn-replier')[0];
    bouton.click();
    expect(document.getElementById('resume-1').hidden).toBe(true);
    expect(bouton.closest('li').classList.contains('repliee')).toBe(true);
  });

  test('chaque bouton porte un nom explicite pour les lecteurs d\'écran', () => {
    chargerPage('index.html');
    const bouton = document.querySelectorAll('.btn-replier')[2];
    expect(bouton.textContent).toBe("Masquer l'article : Contrastes de couleurs : les seuils à retenir");
  });
});

describe('fonctionnalité 3 : filtre par catégorie', () => {
  beforeEach(() => chargerPage('index.html'));

  test('« Accessibilité » ne laisse que les 2 articles de cette catégorie', () => {
    choisirCategorie('accessibilite');
    expect(articlesVisibles()).toHaveLength(2);
    articlesVisibles().forEach((a) => expect(a.dataset.categorie).toBe('accessibilite'));
    expect(document.getElementById('filtre-resultat').textContent).toBe('2 articles affichés.');
  });

  test('chaque catégorie affiche le bon nombre d\'articles', () => {
    const attendus = { 'eco-conception': 3, accessibilite: 2, 'developpement-web': 1, outils: 1, toutes: 7 };
    for (const [categorie, nombre] of Object.entries(attendus)) {
      choisirCategorie(categorie);
      expect(articlesVisibles()).toHaveLength(nombre);
    }
    expect(document.getElementById('filtre-resultat').textContent).toBe('7 articles affichés.');
  });

  test('revenir à « Toutes les catégories » réaffiche tout', () => {
    choisirCategorie('outils');
    choisirCategorie('toutes');
    expect(articlesVisibles()).toHaveLength(7);
  });

  test('le filtre conserve l\'état « masqué » choisi par le lecteur', () => {
    const carte = document.querySelectorAll('[data-categorie="accessibilite"]')[0];
    carte.querySelector('.btn-replier').click();
    choisirCategorie('accessibilite');
    expect(carte.hidden).toBe(false);
    expect(carte.classList.contains('repliee')).toBe(true);
  });
});

describe('menu (tablette et smartphone)', () => {
  test('le bouton ouvre le menu, Échap le ferme et rend le focus au bouton', () => {
    chargerPage('index.html');
    const bouton = document.querySelector('.btn-menu');
    bouton.click();
    expect(bouton.getAttribute('aria-expanded')).toBe('true');
    expect(document.body.classList.contains('menu-ouvert')).toBe(true);
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    expect(bouton.getAttribute('aria-expanded')).toBe('false');
    expect(document.body.classList.contains('menu-ouvert')).toBe(false);
    expect(document.activeElement).toBe(bouton);
  });

  test('sur une page sans formulaire ni filtre, le script ne plante pas', () => {
    expect(() => chargerPage('a-propos.html')).not.toThrow();
    expect(() => chargerPage('article.html')).not.toThrow();
  });
});

/* ======================================================================
   3. Sécurité
   ====================================================================== */
describe('sécurité : injection de script (XSS)', () => {
  const ATTAQUES = [
    '<script>window.pirate = true</script>',
    '<img src=x onerror="window.pirate = true">',
    '<svg onload="window.pirate = true">',
    '"><b onmouseover="window.pirate = true">',
    'javascript:window.pirate=true',
  ];

  beforeEach(() => {
    delete window.pirate;
    chargerPage('index.html');
  });

  test.each(ATTAQUES)('la saisie %s est refusée par la validation', (attaque) => {
    envoyerPrenom(attaque);
    expect(document.getElementById('prenom-erreur').textContent).not.toBe('');
    expect(document.getElementById('message-bienvenue').textContent).toBe('');
    expect(window.pirate).toBeUndefined();
  });

  test.each(ATTAQUES)("même sans validation, l'affichage traite %s comme du texte", (attaque) => {
    const zone = document.getElementById('message-bienvenue');
    CarnetSobre.ecrireTexte(zone, CarnetSobre.messageBienvenue(attaque));
    expect(zone.children).toHaveLength(0);           // aucune balise créée
    expect(zone.textContent).toContain(attaque);     // le texte est affiché tel quel
    expect(window.pirate).toBeUndefined();           // aucun code exécuté
  });

  test('une valeur forgée dans la liste du filtre ne masque rien et ne fait pas planter', () => {
    const liste = document.getElementById('filtre-categorie');
    const fausse = document.createElement('option');
    fausse.value = '"><img src=x onerror="window.pirate = true">';
    liste.appendChild(fausse);                       // ajout d'une option, comme via les outils du navigateur
    choisirCategorie(fausse.value);
    expect(articlesVisibles()).toHaveLength(7);
    expect(document.querySelector('[data-filtrable] img')).toBeNull();
    expect(window.pirate).toBeUndefined();
  });
});

describe('sécurité : relecture automatique du code', () => {
  const PAGES = ['index.html', 'categorie.html', 'article.html', 'a-propos.html'];
  const source = lire('js/blog.js');

  test("le script n'utilise aucune fonction qui interprète du HTML ou du code", () => {
    for (const interdit of [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new Function/, /setTimeout\s*\(\s*['"`]/]) {
      expect(source).not.toMatch(interdit);
    }
  });

  test("le script n'enregistre ni n'envoie rien (pas de stockage, pas de requête)", () => {
    for (const interdit of [/localStorage/, /sessionStorage/, /document\.cookie/, /fetch\s*\(/, /XMLHttpRequest/, /sendBeacon/]) {
      expect(source).not.toMatch(interdit);
    }
  });

  test.each(PAGES)('%s : aucun script en ligne ni attribut onclick', (page) => {
    const html = lire(page);
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)[^>]*>/);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
  });

  test.each(PAGES)("%s : une politique de sécurité (CSP) n'autorise que les scripts du site", (page) => {
    const csp = lire(page).match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
    expect(csp).not.toBeNull();
    expect(csp[1]).toContain("default-src 'none'");
    expect(csp[1]).toContain("script-src 'self'");
    expect(csp[1]).not.toContain('unsafe-inline');
    expect(csp[1]).not.toContain('unsafe-eval');
  });

  test('la version minifiée chargée par les pages expose les mêmes fonctions', () => {
    const minifie = require('../js/blog.min.js');
    expect(Object.keys(minifie).sort()).toEqual(Object.keys(CarnetSobre).sort());
    expect(minifie.validerPrenom('<script>').ok).toBe(false);
    expect(minifie.messageBienvenue('Léa')).toBe(CarnetSobre.messageBienvenue('Léa'));
  });
});
