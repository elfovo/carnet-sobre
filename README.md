# Carnet Sobre — interface statique (HTML / CSS)

Devoir ECF TP DWWM, CCP1 n°2 — Eliott Foveau.

## Contenu

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'accueil : articles récents et accès aux catégories |
| `categorie.html` | Liste des articles d'une catégorie (Éco-conception) |
| `article.html` | Détail d'un article |
| `a-propos.html` | Page « À propos » |
| `css/style.css` | Feuille de style source, commentée (mobile first) |
| `css/style.min.css` | Même feuille, minifiée : c'est elle que chargent les pages |
| `js/menu.js` | Seul script : ouverture du menu sur tablette et smartphone |
| `img/` | Capture de l'article, en AVIF, WebP et JPEG, en 1x et 2x |
| `favicon.svg` | Icône de l'onglet (évite une requête en erreur 404) |

## Ouvrir le site

Aucune installation : ouvrir `index.html` dans un navigateur. Pour un test plus proche de la
mise en ligne, servir le dossier avec un petit serveur local :

```
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000.

## Points d'attention

- Les liens vers des pages hors du périmètre du devoir (autres catégories, mentions légales,
  flux RSS, pages 2 et 3) pointent vers `#`.
- Après une modification de `css/style.css`, régénérer `css/style.min.css` (par exemple avec
  `npx csso css/style.css -o css/style.min.css`).

## Maquettes (devoir n°1)

Le dossier `maquettes/` garde les captures annotées et le wireflow du devoir n°1. Chaque devoir a son
étiquette (`ccp1-devoir-1`, `ccp1-devoir-2`, `ccp1-devoir-3`) pour retrouver le code exact rendu.

---

# Carnet Sobre — static interface (HTML / CSS)

Four static pages of an eco-designed and accessible blog: home page, article list, article
detail and "About" page. No build step and no dependency: open `index.html` in a browser.

- One stylesheet for the whole site, written mobile first (`css/style.css`), served minified
  (`css/style.min.css`).
- One small script (`js/menu.js`) to open the menu on small screens. Without JavaScript,
  the menu is simply displayed in full.
- System fonts, SVG icons, no tracker and no cookie.
- Checked with the W3C validator (HTML and CSS: no error) and Lighthouse (100 in the four
  categories on each page).
