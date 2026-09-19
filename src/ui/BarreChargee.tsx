import { formatNombre as formatKg } from '../data/metriques';
import './barre-chargee.css';

/** Un tronçon de la barre : un exercice de la séance. */
export interface Troncon {
  id: string;
  libelle: string;
  tonnage: number;
  /** Identifiant de groupe musculaire → --serie-1 … --serie-6, ou 'mobilite'. */
  groupe: string;
}

interface Props {
  troncons: Troncon[];
  /** Tonnage de la séance de référence. 0 ou absent = pas de comparaison. */
  reference?: number;
  taille?: 'hero' | 'rail';
  /** Étiquette du repère fantôme. Défaut : « dernière fois ». */
  libelleReference?: string;
}

const ORDRE_GROUPES = ['pectoraux', 'dos', 'jambes', 'epaules', 'bras', 'tronc'];

function couleurDe(groupe: string): string {
  const i = ORDRE_GROUPES.indexOf(groupe);
  return i === -1 ? 'var(--acier-sourd)' : `var(--serie-${i + 1})`;
}

/**
 * La barre chargée — signature de l'app.
 *
 * Le tonnage ne se lit pas comme une barre de progression : il se charge comme
 * une barre. Chaque tronçon est un exercice, sa largeur son tonnage, sa couleur
 * son groupe musculaire. Le repère fantôme marque la séance précédente : le
 * dépasser est la victoire du jour, visible sans lire un chiffre.
 */
export function BarreChargee({ troncons, reference = 0, taille = 'hero', libelleReference = 'dernière fois' }: Props) {
  const total = troncons.reduce((s, t) => s + t.tonnage, 0);
  // Toujours de la marge à droite : on doit voir qu'il reste à charger.
  const echelle = Math.max(total, reference) * 1.12 || 1;
  const devant = reference > 0 && total >= reference;
  const ecart = total - reference;

  const couleurRepere = devant ? 'var(--disque-10)' : 'var(--disque-15)';

  return (
    <div class={`barre barre--${taille}`}>
      <div class="barre__piste">
        <span class="barre__collier" aria-hidden="true" />
        <div class="barre__manchon">
          {troncons.map((t) => (
            <div
              key={t.id}
              class="barre__troncon"
              style={{
                width: `${(t.tonnage / echelle) * 100}%`,
                background: couleurDe(t.groupe),
              }}
              title={`${t.libelle} — ${formatKg(t.tonnage)} kg`}
            />
          ))}
          {reference > 0 && (
            <span
              class="barre__repere"
              style={{ left: `${(reference / echelle) * 100}%`, '--teinte': couleurRepere }}
              aria-hidden="true"
            />
          )}
        </div>
        <span class="barre__embout" aria-hidden="true" />
      </div>

      {taille === 'hero' && (
        <div class="barre__legende">
          <span class="donnee barre__total">
            {formatKg(total)} <span class="barre__unite">kg</span>
          </span>
          {reference > 0 && (
            <span class="barre__ecart donnee" style={{ color: couleurRepere }}>
              {ecart >= 0 ? '+' : '−'}
              {formatKg(Math.abs(ecart))} <span class="barre__ref">/ {libelleReference}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
