import { formatCharge } from '../data/metriques';
import { Icone } from './Icone';
import './reglette.css';

interface Props {
  nom: string;
  valeur: number;
  pas: number;
  min: number;
  max: number;
  unite?: string;
  /** Précision à droite du nom, par exemple le plancher d'une fourchette. */
  suffixeValeur?: string;
  onChange: (v: number) => void;
}

/**
 * Un réglage par incréments. Pas de champ de saisie : le clavier iOS n'a pas de
 * pas de 2,5 kg, et deux gros boutons vont plus vite que taper un nombre.
 */
export function Reglette({ nom, valeur, pas, min, max, unite, suffixeValeur, onChange }: Props) {
  const borne = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));

  return (
    <div class="reglette">
      <div class="reglette__nommage">
        <span class="reglette__nom">{nom}</span>
        {suffixeValeur && <span class="reglette__suffixe">{suffixeValeur}</span>}
      </div>

      <div class="reglette__commandes">
        <button
          type="button"
          class="reglette__pas"
          disabled={valeur <= min}
          onClick={() => onChange(borne(valeur - pas))}
          aria-label={`Diminuer ${nom}`}
        >
          <Icone nom="moins" taille={18} />
        </button>

        <span class="reglette__valeur donnee" aria-live="polite">
          {formatCharge(valeur)}
          {unite && <span class="reglette__unite">{unite}</span>}
        </span>

        <button
          type="button"
          class="reglette__pas"
          disabled={valeur >= max}
          onClick={() => onChange(borne(valeur + pas))}
          aria-label={`Augmenter ${nom}`}
        >
          <Icone nom="plus" taille={18} />
        </button>
      </div>
    </div>
  );
}
