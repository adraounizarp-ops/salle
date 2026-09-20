import { Feuille } from './Feuille';
import { Icone, type NomIcone } from './Icone';
import './confirmation.css';

interface Props {
  titre: string;
  /** Ce qu'on perd, et ce qu'on garde. */
  texte: string;
  /** Le libellé du bouton qui détruit. Jamais « OK ». */
  action: string;
  icone?: NomIcone;
  onConfirmer: () => void;
  onFermer: () => void;
}

/**
 * La demande de confirmation avant un geste irréversible.
 *
 * Elle remplace `window.confirm`, qui n'est pas fiable : certains navigateurs
 * embarqués — dont celui de cet atelier — suppriment les boîtes natives et
 * renvoient `false` sans rien afficher. L'appui tombait alors dans le vide,
 * sans le moindre signe, et aucune suppression n'était possible.
 *
 * Elle est aussi plus juste : le bouton nomme ce qu'il fait au lieu de dire
 * « OK », et la feuille tient dans la direction visuelle de l'app.
 */
export function Confirmation({ titre, texte, action, icone, onConfirmer, onFermer }: Props) {
  return (
    <Feuille
      titre={titre}
      onFermer={onFermer}
      haute
      pied={
        <>
          <button type="button" class="bouton bouton--corail bouton--plein" onClick={onConfirmer}>
            {icone && <Icone nom={icone} taille={16} />}
            {action}
          </button>

          <button type="button" class="bouton bouton--fantome bouton--plein" onClick={onFermer}>
            Annuler
          </button>
        </>
      }
    >
      <div class="confirmation">
        <p class="confirmation__texte">{texte}</p>
      </div>
    </Feuille>
  );
}
