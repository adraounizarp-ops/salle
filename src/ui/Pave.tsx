import './pave.css';

interface Props {
  /** Pas du champ en cours : 2,5 kg sur une charge, 1 sur des répétitions. */
  pas: number;
  /** Désactive « idem » quand il n'y a pas de série précédente à recopier. */
  idemPossible?: boolean;
  onTouche: (t: string) => void;
  onValider: () => void;
  libelleValider?: string;
}

const CHIFFRES = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', 'effacer'];

const fmtPas = (n: number) => n.toString().replace('.', ',');

/**
 * Le pavé intégré. Le clavier iOS n'ouvre jamais : il masque la moitié de
 * l'écran, décale la mise en page et n'a pas de pas de 2,5 kg. Ici tout tient
 * sous le pouce et chaque cible fait au moins 48 px.
 */
export function Pave({ pas, idemPossible = false, onTouche, onValider, libelleValider = 'Valider la série' }: Props) {
  return (
    <div class="pave">
      <div class="pave__grille">
        <div class="pave__chiffres">
          {CHIFFRES.map((c) => (
            <button
              key={c}
              type="button"
              class={`pave__touche ${c === 'effacer' ? 'pave__touche--effacer' : 'donnee'}`}
              onClick={() => onTouche(c)}
              aria-label={c === 'effacer' ? 'Effacer le dernier chiffre' : c === ',' ? 'Virgule' : c}
            >
              {c === 'effacer' ? '⌫' : c}
            </button>
          ))}
        </div>

        <div class="pave__actions">
          <button type="button" class="pave__touche pave__touche--pas donnee" onClick={() => onTouche('+')}>
            +{fmtPas(pas)}
          </button>
          <button type="button" class="pave__touche pave__touche--pas donnee" onClick={() => onTouche('-')}>
            −{fmtPas(pas)}
          </button>
          <button
            type="button"
            class="pave__touche pave__touche--idem"
            onClick={() => onTouche('idem')}
            disabled={!idemPossible}
          >
            <span class="pave__idem-signe" aria-hidden="true">
              ⟲
            </span>
            <span class="pave__idem-texte">idem</span>
          </button>
        </div>
      </div>

      <button type="button" class="pave__valider" onClick={onValider}>
        {libelleValider}
      </button>
    </div>
  );
}
