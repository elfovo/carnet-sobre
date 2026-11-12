# Carnet Sobre — blog statique et fonctionnalités dynamiques

Devoirs ECF TP DWWM, CCP1 n°2 (interface statique) et n°3 (JavaScript) — Eliott Foveau.

## Contenu

| Fichier | Rôle |
|---|---|
| `index.html` | Accueil : message de bienvenue, articles récents filtrables, catégories |
| `categorie.html` | Liste des articles d'une catégorie (articles repliables) |
| `article.html` | Détail d'un article |
| `a-propos.html` | Page « À propos » |
| `css/style.css` | Feuille de style source, commentée (mobile first) |
| `css/style.min.css` | Même feuille, minifiée : c'est elle que chargent les pages |
| `js/blog.js` | Script source, commenté : menu, bienvenue, masquer / afficher, filtre |
| `js/blog.min.js` | Même script, minifié : c'est lui que chargent les pages |
| `tests/blog.test.js` | Tests unitaires (Jest + jsdom) |
| `tests/navigateur.mjs` | Tests dans un vrai navigateur (Playwright + Chromium) |
| `img/` | Capture de l'article, en AVIF, WebP et JPEG, en 1x et 2x |
| `favicon.svg`, `robots.txt` | Icône de l'onglet, consignes aux robots d'indexation |

## Ouvrir le site

Aucune installation : ouvrir `index.html` dans un navigateur. Le site n'a aucune dépendance.

## Lancer les tests

Les outils de test ne servent qu'au développement (ils ne sont jamais envoyés au visiteur) :

```
npm install
npm test                    # 53 tests unitaires
npm run test:couverture     # mêmes tests + taux de couverture de js/blog.js
npx playwright install chromium
npm run test:navigateur     # 10 tests dans Chromium
```

## Points d'attention

- Après une modification de `css/style.css` ou de `js/blog.js`, régénérer les versions minifiées
  (`npx csso css/style.css -o css/style.min.css` et `npx terser js/blog.js -c -m -o js/blog.min.js`).
- Chaque page déclare une politique de sécurité (CSP) qui n'autorise que les fichiers du site : aucun
  script en ligne ni attribut `onclick` n'est possible.
- Les liens vers des pages hors du périmètre des devoirs pointent vers `#`.

## Maquettes (devoir n°1)

Le dossier `maquettes/` garde les captures annotées et le wireflow du devoir n°1. Chaque devoir a son
étiquette (`ccp1-devoir-1`, `ccp1-devoir-2`, `ccp1-devoir-3`) pour retrouver le code exact rendu.

---

# Carnet Sobre — static blog with dynamic features

Four pages of an eco-designed and accessible blog, plus three JavaScript features: a personal
welcome message, a button to hide or show an article, and a category filter.

- No dependency, no build step: open `index.html` in a browser.
- One small script (`js/blog.js`, about 2.7 KB minified). Without JavaScript, all the content
  stays readable; only the interactive controls are missing.
- User input is always written as text (`textContent`), never as HTML; nothing is stored or sent.
- Tests: `npm install`, then `npm test` (unit tests) and `npm run test:navigateur` (browser tests).
