/* ==========================================================================
   Carnet Sobre — seul script du site (chargé avec defer, servi minifié)

   Amélioration progressive : sans JavaScript, tout le contenu reste lisible et
   le menu reste affiché. Les commandes interactives (bienvenue, filtre,
   masquer / afficher) sont présentes dans le HTML avec l'attribut hidden et
   ne sont révélées qu'une fois ce script chargé.

   Sécurité : aucune saisie n'est jamais insérée comme du HTML (textContent
   uniquement), le prénom n'est ni stocké ni envoyé, et les valeurs reçues
   du formulaire sont comparées à des listes autorisées.

   Éco-conception : aucune bibliothèque, aucun minuteur, aucune requête
   réseau ; un écouteur par fonctionnalité (délégation d'événements) et des
   changements limités à l'attribut hidden, sans reconstruire la page.
   ========================================================================== */
const CarnetSobre = (() => {
  'use strict';

  /* ---------- 1. Fonctions pures (sans DOM, testées unitairement) ---------- */

  const PRENOM_MAX = 40;
  // une lettre (accentuée ou non), puis lettres, espaces, tirets ou apostrophes
  const MOTIF_PRENOM = /^\p{L}[\p{L}' -]*$/u;

  /**
   * Nettoie et valide le prénom saisi.
   * @param {*} saisie valeur brute du champ
   * @returns {{ok: true, valeur: string} | {ok: false, erreur: string}}
   */
  function validerPrenom(saisie) {
    const valeur = String(saisie ?? '').replace(/’/g, "'").trim().replace(/\s+/g, ' ');
    if (valeur === '') {
      return { ok: false, erreur: 'Saisissez votre prénom.' };
    }
    if (valeur.length > PRENOM_MAX) {
      return { ok: false, erreur: `Votre prénom doit faire ${PRENOM_MAX} caractères au plus.` };
    }
    if (!MOTIF_PRENOM.test(valeur)) {
      return { ok: false, erreur: 'Utilisez seulement des lettres, des espaces, des tirets ou des apostrophes.' };
    }
    return { ok: true, valeur };
  }

  /** Message affiché une fois le prénom validé. */
  function messageBienvenue(prenom) {
    return `Bonjour ${prenom}, bienvenue sur Carnet Sobre !`;
  }

  /** Ramène une valeur de filtre inconnue (liste modifiée, valeur forgée) à « toutes ». */
  function normaliserChoix(choix, autorises) {
    return autorises.includes(choix) ? choix : 'toutes';
  }

  /** Un article reste affiché si « toutes » est choisi ou si sa catégorie correspond. */
  function estVisible(categorieArticle, choix) {
    return choix === 'toutes' || categorieArticle === choix;
  }

  /** Texte annoncé après un filtrage. */
  function texteResultat(nombre) {
    if (nombre === 0) return 'Aucun article dans cette catégorie.';
    return nombre === 1 ? '1 article affiché.' : `${nombre} articles affichés.`;
  }

  /* ---------- 2. Branchement sur la page ---------- */

  /** Écrit un texte dans un élément, sans jamais l'interpréter comme du HTML. */
  function ecrireTexte(element, texte) {
    element.textContent = texte;
  }

  /** Menu replié sur tablette et smartphone : ouverture, fermeture, touche Échap. */
  function initMenu(doc) {
    const bouton = doc.querySelector('.btn-menu');
    if (!bouton) return;
    const basculer = (ouvrir) => {
      bouton.setAttribute('aria-expanded', String(ouvrir));
      doc.body.classList.toggle('menu-ouvert', ouvrir);
    };
    bouton.addEventListener('click', () => basculer(bouton.getAttribute('aria-expanded') !== 'true'));
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && bouton.getAttribute('aria-expanded') === 'true') {
        basculer(false);
        bouton.focus();
      }
    });
  }

  /** Fonctionnalité 1 : message de bienvenue personnalisé. */
  function initBienvenue(doc) {
    const form = doc.getElementById('form-bienvenue');
    if (!form) return;
    const champ = doc.getElementById('prenom');
    const erreur = doc.getElementById('prenom-erreur');
    const message = doc.getElementById('message-bienvenue');
    form.closest('[hidden]')?.removeAttribute('hidden');

    form.addEventListener('submit', (e) => {
      e.preventDefault();  // rien n'est envoyé : tout se passe dans le navigateur
      const resultat = validerPrenom(champ.value);
      if (!resultat.ok) {
        ecrireTexte(erreur, resultat.erreur);
        ecrireTexte(message, '');
        champ.setAttribute('aria-invalid', 'true');
        champ.focus();
        return;
      }
      ecrireTexte(erreur, '');
      champ.removeAttribute('aria-invalid');
      ecrireTexte(message, messageBienvenue(resultat.valeur));
    });
  }

  /** Fonctionnalité 2 : masquer / afficher un article (un seul écouteur pour tous les boutons). */
  function initRepliables(doc) {
    const boutons = doc.querySelectorAll('.btn-replier');
    if (boutons.length === 0) return;
    boutons.forEach((b) => b.removeAttribute('hidden'));

    doc.addEventListener('click', (e) => {
      const bouton = e.target.closest?.('.btn-replier');
      if (!bouton) return;
      const ouvrir = bouton.getAttribute('aria-expanded') !== 'true';
      bouton.setAttribute('aria-expanded', String(ouvrir));
      ecrireTexte(bouton.querySelector('.libelle'), ouvrir ? 'Masquer' : 'Afficher');
      for (const id of bouton.getAttribute('aria-controls').split(' ')) {
        const zone = doc.getElementById(id);
        if (zone) zone.hidden = !ouvrir;
      }
      bouton.closest('[data-categorie], li')?.classList.toggle('repliee', !ouvrir);
    });
  }

  /** Fonctionnalité 3 : filtrer les articles par catégorie. */
  function initFiltre(doc) {
    const liste = doc.getElementById('filtre-categorie');
    if (!liste) return;
    const articles = doc.querySelectorAll('[data-filtrable] [data-categorie]');
    const resultat = doc.getElementById('filtre-resultat');
    const autorises = Array.from(liste.options, (o) => o.value);
    liste.closest('[hidden]')?.removeAttribute('hidden');

    liste.addEventListener('change', () => {
      const choix = normaliserChoix(liste.value, autorises);
      let visibles = 0;
      articles.forEach((article) => {
        const visible = estVisible(article.dataset.categorie, choix);
        article.hidden = !visible;
        if (visible) visibles += 1;
      });
      ecrireTexte(resultat, texteResultat(visibles));
    });
  }

  function initialiser(doc) {
    initMenu(doc);
    initBienvenue(doc);
    initRepliables(doc);
    initFiltre(doc);
  }

  return { validerPrenom, messageBienvenue, normaliserChoix, estVisible, texteResultat, ecrireTexte, initialiser, PRENOM_MAX };
})();

// Dans le navigateur : on branche la page. Sous Node (tests) : on exporte les fonctions.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CarnetSobre;
} else {
  CarnetSobre.initialiser(document);
}
