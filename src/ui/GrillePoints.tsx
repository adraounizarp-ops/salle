import type { JourCalendrier } from '../data/selection';
import './grille-points.css';

const ENTETES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface Props {
  cases: JourCalendrier[];
  onJour?: (jour: JourCalendrier) => void;
  /** Sans numéros de jour ni entêtes : pour un bandeau de plusieurs mois. */
  compact?: boolean;
}

/**
 * Le mois en points. Un point plein par jour d'entraînement, un point creux
 * sinon : la régularité se lit d'un coup d'œil, sans compter, sans objectif à
 * tenir et donc sans échec affiché.
 */
export function GrilleMois({ cases, onJour, compact }: Props) {
  return (
    <div class="grille" data-compact={compact ? 'true' : undefined}>
      {!compact && (
        <div class="grille__entetes" aria-hidden="true">
          {ENTETES.map((j, i) => (
            <span key={i}>{j}</span>
          ))}
        </div>
      )}

      <div class="grille__jours">
        {cases.map((c) => {
          const fait = c.seances.length > 0;
          const libelle = `${c.date.getDate()} — ${
            fait ? c.seances.map((s) => s.nom).join(', ') : 'repos'
          }`;

          // En compact, une case fait 15 × 18 px : trop petite pour être visée
          // au pouce. Le bandeau est une vue de densité, pas une liste de
          // liens ; on ouvre une séance depuis la liste juste en dessous.
          if (compact) {
            return (
              <span
                key={c.date.getTime()}
                class="grille__jour"
                data-fait={fait}
                data-hors={c.horsMois}
                data-aujourdhui={c.aujourdhui}
                title={libelle}
              >
                <span class="grille__point" />
              </span>
            );
          }

          return (
            <button
              key={c.date.getTime()}
              type="button"
              class="grille__jour"
              data-fait={fait}
              data-hors={c.horsMois}
              data-aujourdhui={c.aujourdhui}
              disabled={!fait || !onJour}
              onClick={() => onJour?.(c)}
              aria-label={libelle}
              title={libelle}
            >
              <span class="grille__point" />
              <span class="grille__numero donnee">{c.date.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
