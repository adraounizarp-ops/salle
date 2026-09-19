import { signal } from '@preact/signals';

/**
 * Routeur minimal sur l'API History.
 *
 * Chaque écran a une URL et le retour marche : bouton du navigateur, balayage
 * iOS depuis le bord, et le bouton « ‹ » de l'app font tous la même chose.
 * Un routeur maison plutôt qu'une librairie : il n'y a qu'une dizaine de
 * routes et aucune n'est dynamique au-delà d'un identifiant.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const versChemin = (url: string) => {
  const p = url.startsWith(BASE) ? url.slice(BASE.length) : url;
  return p === '' ? '/' : p;
};

export const chemin = signal(versChemin(location.pathname));

addEventListener('popstate', () => {
  chemin.value = versChemin(location.pathname);
});

/** Empile un écran. Le retour ramène au précédent. */
export function aller(vers: string) {
  if (vers === chemin.value) return;
  history.pushState(null, '', BASE + vers);
  chemin.value = vers;
  scrollTo(0, 0);
}

/**
 * Change d'onglet sans empiler : passer d'Accueil à Progrès puis revenir en
 * arrière doit sortir de l'app, pas parcourir les onglets visités.
 */
export function allerOnglet(vers: string) {
  if (vers === chemin.value) return;
  history.replaceState(null, '', BASE + vers);
  chemin.value = vers;
  scrollTo(0, 0);
}

export function retour() {
  history.back();
}

/** `/seances/12` contre `/seances/:id` → `{ id: '12' }`, ou null. */
export function apparier(motif: string, actuel = chemin.value): Record<string, string> | null {
  const m = motif.split('/');
  const a = actuel.split('/');
  if (m.length !== a.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < m.length; i++) {
    if (m[i].startsWith(':')) params[m[i].slice(1)] = decodeURIComponent(a[i]);
    else if (m[i] !== a[i]) return null;
  }
  return params;
}

/** L'onglet à allumer dans la barre du bas pour le chemin courant. */
export function ongletDe(actuel = chemin.value): string {
  const racine = '/' + actuel.split('/')[1];
  return ['/seances', '/historique', '/progres'].includes(racine) ? racine : '/';
}
