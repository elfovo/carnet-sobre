/* Seul script du site : ouvrir et fermer le menu sur tablette et smartphone.
   Sans JavaScript, le menu reste affiché en entier (voir la balise noscript). */
var bouton = document.querySelector('.btn-menu');

function basculerMenu(ouvrir) {
  bouton.setAttribute('aria-expanded', String(ouvrir));
  document.body.classList.toggle('menu-ouvert', ouvrir);
}

bouton.addEventListener('click', function () {
  basculerMenu(bouton.getAttribute('aria-expanded') !== 'true');
});

/* Échap referme le menu et rend le focus au bouton */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && bouton.getAttribute('aria-expanded') === 'true') {
    basculerMenu(false);
    bouton.focus();
  }
});
