import { formatNombre } from '../data/metriques';
import { Icone } from './Icone';
import './chiffre.css';

interface Props {
  valeur: number;
  unite?: string;
  /** Écart signé contre une référence. 0 ou absent = pas de comparaison. */
  ecart?: number;
  /** Ce à quoi on compare, en toutes lettres. */
  reference?: string;
  taille?: 'hero' | 'grand' | 'moyen';
}

/**
 * Le chiffre qu'on vient chercher, et l'écart qui lui donne un sens.
 *
 * L'écart ne repose pas sur la couleur seule : la flèche et le signe disent
 * déjà le sens, la couleur ne fait que le confirmer d'un coup d'œil.
 */
export function Chiffre({ valeur, unite = 'kg', ecart, reference, taille = 'hero' }: Props) {
  const compare = ecart !== undefined && ecart !== 0;
  const monte = (ecart ?? 0) > 0;

  return (
    <div class="chiffre">
      <p class={`chiffre__valeur chiffre__valeur--${taille}`}>
        {formatNombre(valeur)}
        {unite && <span class="chiffre__unite">{unite}</span>}
      </p>

      {compare && (
        <p class="chiffre__ecart" data-sens={monte ? 'haut' : 'bas'}>
          <span class="chiffre__fleche" style={monte ? undefined : { transform: 'rotate(180deg)' }}>
            <Icone nom="fleche-haut" taille={14} />
          </span>
          <span class="donnee">
            {formatNombre(Math.abs(ecart!))} {unite}
          </span>
          {reference && <span class="chiffre__reference">{reference}</span>}
        </p>
      )}
    </div>
  );
}
