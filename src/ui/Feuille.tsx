import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { Icone } from './Icone';
import './feuille.css';

interface Props {
  titre: string;
  sous?: string;
  /** Au-dessus d'une feuille déjà ouverte. */
  haute?: boolean;
  onFermer: () => void;
  children: ComponentChildren;
}

/**
 * La feuille basse. Elle sert aux choix courts qui ne méritent pas un écran :
 * démarrer une séance, régler un exercice. On la ferme par le bouton, par le
 * voile, ou par Échap.
 */
export function Feuille({ titre, sous, haute, onFermer, children }: Props) {
  useEffect(() => {
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    addEventListener('keydown', touche);
    return () => removeEventListener('keydown', touche);
  }, [onFermer]);

  return (
    <div
      class="feuille"
      data-haute={haute ? 'true' : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={titre}
    >
      <button type="button" class="feuille__voile" onClick={onFermer} aria-label="Fermer" />

      <div class="feuille__panneau">
        <span class="feuille__poignee" aria-hidden="true" />

        <header class="feuille__entete">
          <div>
            <h2 class="feuille__titre">{titre}</h2>
            {sous && <p class="feuille__sous">{sous}</p>}
          </div>
          <button type="button" class="feuille__croix" onClick={onFermer} aria-label="Fermer">
            <Icone nom="croix" taille={20} />
          </button>
        </header>

        <div class="feuille__corps">{children}</div>
      </div>
    </div>
  );
}
