import { useEffect, useState } from 'preact/hooks';
import { formatCharge, formatDuree, formatNombre } from '../data/metriques';
import './repos.css';

interface Props {
  total: number;
  /** Écart de tonnage sur l'exercice, pour situer sans avoir à chercher. */
  ecart: number;
  prochaine: { reps: number; charge: number; leste: boolean } | null;
  onFini: () => void;
}

const RAYON = 86;
const CIRCONFERENCE = 2 * Math.PI * RAYON;

/**
 * Le repos. Plein écran, lisible à bout de bras, posé sur un banc.
 * Le temps restant vient d'un horodatage et non d'un compteur : si l'app passe
 * en arrière-plan, on retrouve le bon chiffre au retour.
 */
export function Repos({ total, ecart, prochaine, onFini }: Props) {
  const [fin, setFin] = useState(() => Date.now() + total * 1000);
  const [restant, setRestant] = useState(total);

  useEffect(() => {
    const battre = () => setRestant(Math.max(0, Math.ceil((fin - Date.now()) / 1000)));
    battre();
    const t = setInterval(battre, 250);
    const auRetour = () => battre();
    document.addEventListener('visibilitychange', auRetour);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', auRetour);
    };
  }, [fin]);

  const ecoule = 1 - restant / total;
  const fini = restant === 0;
  const devant = ecart >= 0;

  return (
    <div class="repos" role="dialog" aria-label="Repos entre deux séries">
      <div class="repos__contenu">
        <p class="etiquette">Repos</p>

        <div class="repos__anneau">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle class="repos__piste" cx="100" cy="100" r={RAYON} />
            <circle
              class="repos__arc"
              cx="100"
              cy="100"
              r={RAYON}
              stroke-dasharray={CIRCONFERENCE}
              stroke-dashoffset={CIRCONFERENCE * ecoule}
              data-fini={fini}
            />
          </svg>
          <span class="repos__temps donnee" data-fini={fini}>
            {formatDuree(restant)}
          </span>
        </div>

        <p class="repos__ecart donnee" style={{ color: devant ? 'var(--disque-10)' : 'var(--disque-15)' }}>
          {devant ? '+' : '−'}
          {formatNombre(Math.abs(ecart))} kg <span class="repos__ecart-ref">sur cet exercice</span>
        </p>

        {prochaine && (
          <p class="repos__prochaine">
            Prochaine série{' '}
            <strong class="donnee">
              {prochaine.reps} × {formatCharge(prochaine.charge)} {prochaine.leste ? 'de lest' : 'kg'}
            </strong>
          </p>
        )}

        <div class="repos__boutons">
          <button type="button" class="repos__bouton" onClick={() => setFin((f) => f + 30_000)}>
            +30 s
          </button>
          <button type="button" class="repos__bouton repos__bouton--principal" onClick={onFini}>
            {fini ? 'Reprendre' : 'Passer le repos'}
          </button>
        </div>
      </div>
    </div>
  );
}
