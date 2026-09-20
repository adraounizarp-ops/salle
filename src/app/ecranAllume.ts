import { useEffect } from 'preact/hooks';

/**
 * Garde l'écran allumé pendant une séance.
 *
 * Sans cela l'iPhone s'éteint au bout de trente secondes, et on rallume à
 * chaque série avec les mains pleines de magnésie.
 *
 * Deux précautions : l'API n'existe pas partout, et iOS relâche le verrou dès
 * que l'app passe en arrière-plan — il faut le reprendre au retour. Tout échec
 * est silencieux : un écran qui s'éteint est un désagrément, pas une panne.
 */
export function useEcranAllume(actif: boolean): void {
  useEffect(() => {
    if (!actif || !('wakeLock' in navigator)) return;

    let verrou: WakeLockSentinel | null = null;
    let vivant = true;

    const prendre = async () => {
      if (!vivant || document.visibilityState !== 'visible' || verrou) return;
      try {
        verrou = await navigator.wakeLock.request('screen');
        verrou.addEventListener('release', () => {
          verrou = null;
        });
      } catch {
        // Batterie faible, économiseur d'énergie, onglet en arrière-plan.
      }
    };

    const auRetour = () => {
      if (document.visibilityState === 'visible') void prendre();
    };

    void prendre();
    document.addEventListener('visibilitychange', auRetour);

    return () => {
      vivant = false;
      document.removeEventListener('visibilitychange', auRetour);
      void verrou?.release();
      verrou = null;
    };
  }, [actif]);
}
