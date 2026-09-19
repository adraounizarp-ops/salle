import { formatNombre } from '../data/metriques';
import './barre-chargee.css';

/** Un tronçon de la barre : un exercice de la séance. */
export interface Troncon {
  id: string;
  libelle: string;
  tonnage: number;
}

interface Props {
  troncons: Troncon[];
  /** Tonnage de référence. 0 ou absent = pas de comparaison. */
  reference?: number;
  taille?: 'hero' | 'rail';
  /** Ce que marque le repère, dit en toutes lettres sous la barre. */
  libelleReference?: string;
}

/** Cinq paliers, puis on recommence. L'ordre encodé est celui des exercices. */
const PALIERS = 5;

/**
 * La barre chargée.
 *
 * Le tonnage ne se lit pas comme une jauge : chaque tronçon est un exercice, sa
 * largeur son tonnage. Un seul ton, décliné en paliers de clarté — l'identité
 * d'un exercice ne vient jamais d'une couleur mais de son étiquette. Le repère
 * blanc marque la référence : le dépasser se voit sans lire un chiffre.
 */
export function BarreChargee({ troncons, reference = 0, taille = 'hero', libelleReference }: Props) {
  const total = troncons.reduce((s, t) => s + t.tonnage, 0);
  // Toujours de la marge à droite : on doit voir qu'il reste à charger.
  const echelle = Math.max(total, reference) * 1.1 || 1;

  return (
    <div class={`barre barre--${taille}`}>
      <div class="barre__piste">
        {troncons.map((t, i) => (
          <div
            key={t.id}
            class="barre__troncon"
            style={{
              width: `${(t.tonnage / echelle) * 100}%`,
              background: `var(--vert-${(i % PALIERS) + 1})`,
            }}
            title={`${t.libelle} — ${formatNombre(t.tonnage)} kg`}
          />
        ))}

        {reference > 0 && (
          <span class="barre__repere" style={{ left: `${(reference / echelle) * 100}%` }} aria-hidden="true" />
        )}
      </div>

      {reference > 0 && libelleReference && (
        <p class="barre__legende">
          <span class="barre__marque" aria-hidden="true" />
          {libelleReference} · <span class="donnee">{formatNombre(reference)} kg</span>
        </p>
      )}
    </div>
  );
}
