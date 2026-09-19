import type { ComponentChildren } from 'preact';
import { Icone } from './Icone';
import './ecran.css';

interface Props {
  titre: string;
  /** Petite ligne en capitales au-dessus du titre. */
  surtitre?: string;
  /** Ligne d'appoint sous le titre. */
  sous?: string;
  /** Bouton d'action en haut à droite. */
  action?: ComponentChildren;
  /** Présent sur les écrans de second niveau. */
  onRetour?: () => void;
  /** Barre collée en bas, au-dessus des onglets. */
  pied?: ComponentChildren;
  children: ComponentChildren;
}

/**
 * Le gabarit commun. L'entête défile avec le contenu : sur un écran de 874 pt,
 * une barre collante mange une place qui sert mieux aux données.
 */
export function Ecran({ titre, surtitre, sous, action, onRetour, pied, children }: Props) {
  return (
    <div class="ecran" data-pied={pied ? 'true' : undefined}>
      <div class="ecran__defile">
        <header class="ecran__entete">
          {onRetour && (
            <button type="button" class="ecran__retour pressable" onClick={onRetour}>
              <Icone nom="chevron-gauche" taille={22} titre="Retour" />
            </button>
          )}

          <div class="ecran__nommage">
            {surtitre && <p class="etiquette">{surtitre}</p>}
            <h1 class="ecran__titre">{titre}</h1>
            {sous && <p class="ecran__sous">{sous}</p>}
          </div>

          {action && <div class="ecran__action">{action}</div>}
        </header>

        {children}
      </div>

      {pied && <div class="ecran__pied">{pied}</div>}
    </div>
  );
}

/** Un bloc de contenu précédé de son étiquette, parfois d'un lien à droite. */
export function Section({
  titre,
  suffixe,
  plein,
  children,
}: {
  titre?: string;
  suffixe?: ComponentChildren;
  /** Laisse le contenu déborder dans les gouttières (défilement horizontal). */
  plein?: boolean;
  children: ComponentChildren;
}) {
  return (
    <section class="section" data-plein={plein ? 'true' : undefined}>
      {titre && (
        <div class="section__tete">
          <h2 class="etiquette">{titre}</h2>
          {suffixe}
        </div>
      )}
      {children}
    </section>
  );
}
