import './segmente.css';

interface Props<T extends string> {
  options: { id: T; nom: string }[];
  valeur: T;
  onChange: (v: T) => void;
  etiquette: string;
}

/** Sélecteur segmenté : deux à quatre vues d'un même écran. */
export function Segmente<T extends string>({ options, valeur, onChange, etiquette }: Props<T>) {
  return (
    <div class="segmente" role="tablist" aria-label={etiquette}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          class="segmente__option"
          data-actif={valeur === o.id}
          aria-selected={valeur === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.nom}
        </button>
      ))}
    </div>
  );
}
