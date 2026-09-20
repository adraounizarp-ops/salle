/**
 * Met les illustrations en cache avant d'en avoir besoin.
 *
 * Le service worker range les fichiers de `/ex/` au premier affichage. Ça ne
 * suffit pas : en salle, le réseau est souvent absent, et un exercice jamais
 * ouvert s'afficherait vide. On tire donc les images des séances qu'on est sur
 * le point de faire pendant qu'on a encore du réseau.
 *
 * Un simple `fetch` suffit : la requête traverse le service worker, dont la
 * règle « cache d'abord » la range au passage. Inutile de connaître le nom du
 * cache ni de le manipuler à la main.
 */

const FRONT = 6;

/** Ce qui a déjà été demandé dans cette session : on ne redemande pas. */
const demandes = new Set<string>();

async function tirer(url: string): Promise<void> {
  if (demandes.has(url)) return;
  demandes.add(url);
  try {
    await fetch(url, { cache: 'force-cache' });
  } catch {
    // Hors-ligne ou fichier absent : l'illustration se chargera plus tard.
    demandes.delete(url);
  }
}

/**
 * Précharge les trois images de chaque exercice donné.
 * Silencieux et sans attente : l'app ne doit jamais patienter là-dessus.
 */
export function prechargerIllustrations(slugs: readonly string[]): void {
  if (!navigator.onLine) return;

  const urls = [...new Set(slugs)].flatMap((slug) =>
    [1, 2, 3].map((n) => `${import.meta.env.BASE_URL}ex/${slug}/${n}.svg`),
  );

  // Par vagues : on ne veut pas ouvrir cinquante requêtes d'un coup et gêner
  // le chargement de l'écran en cours.
  void (async () => {
    for (let i = 0; i < urls.length; i += FRONT) {
      await Promise.all(urls.slice(i, i + FRONT).map(tirer));
    }
  })();
}
