import type { ComponentChildren } from 'preact';
import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Icone } from './Icone';
import './feuille.css';

/**
 * Combien de feuilles sont ouvertes.
 *
 * La coquille s'en sert pour retirer la barre d'onglets tant qu'il y en a une.
 * Sans cela, les deux se disputaient les mêmes pixels au bas de l'écran : le
 * bouton d'action d'une feuille tombe exactement dans la bande de la barre, et
 * `.onglets` porte un `backdrop-filter`, ce qui suffit à Safari pour la peindre
 * par-dessus. Plutôt que de parier sur l'ordre d'empilement, on ne rend tout
 * simplement pas la barre : ce qui n'est pas peint ne masque rien.
 *
 * Un compteur et non un booléen : une confirmation s'ouvre parfois au-dessus
 * d'une feuille, et la fermer ne doit pas faire réapparaître la barre sous
 * celle qui reste.
 */
export const feuillesOuvertes = signal(0);

interface Props {
  titre: string;
  sous?: string;
  /** Au-dessus d'une feuille déjà ouverte. */
  haute?: boolean;
  /**
   * L'action principale. Rendue hors de la zone qui défile : avec dix champs à
   * remplir, un bouton posé en fin de contenu passe sous la ligne de flottaison
   * et on cherche comment valider.
   */
  pied?: ComponentChildren;
  onFermer: () => void;
  children: ComponentChildren;
}

/**
 * La feuille basse. Elle sert aux choix courts qui ne méritent pas un écran :
 * démarrer une séance, régler un exercice. On la ferme par le bouton, par le
 * voile, ou par Échap.
 */
export function Feuille({ titre, sous, haute, pied, onFermer, children }: Props) {
  useEffect(() => {
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    addEventListener('keydown', touche);
    return () => removeEventListener('keydown', touche);
  }, [onFermer]);

  useEffect(() => {
    feuillesOuvertes.value++;
    return () => {
      feuillesOuvertes.value--;
    };
  }, []);

  return (
    <div
      class="feuille"
      data-haute={haute ? 'true' : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={titre}
    >
      <button type="button" class="feuille__voile" onClick={onFermer} aria-label="Fermer" />

      <div class="feuille__panneau" data-avec-pied={pied ? 'true' : undefined}>
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

        {pied && <div class="feuille__pied">{pied}</div>}
      </div>
    </div>
  );
}
