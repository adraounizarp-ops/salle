import { useState } from 'preact/hooks';
import { Planche } from './screens/Planche';
import { Programmer } from './screens/Programmer';
import { Seance } from './screens/Seance';
import './revue.css';

type Onglet = 'seance' | 'programmer' | 'planche';

const ONGLETS: { id: Onglet; nom: string }[] = [
  { id: 'seance', nom: 'Séance' },
  { id: 'programmer', nom: 'Programmer' },
  { id: 'planche', nom: 'Planche' },
];

/**
 * Coquille de revue du lot 0 : elle sert à regarder la direction visuelle sur
 * les écrans qui comptent. Elle disparaît au lot 1, remplacée par la vraie
 * navigation.
 */
export function Revue() {
  const [onglet, setOnglet] = useState<Onglet>('seance');
  const [clair, setClair] = useState(false);

  document.documentElement.dataset.theme = clair ? 'clair' : 'sombre';

  return (
    <div class="revue">
      <div class="revue__ecran">
        {onglet === 'seance' && <Seance />}
        {onglet === 'programmer' && <Programmer />}
        {onglet === 'planche' && <Planche />}
      </div>

      <nav class="revue__barre" aria-label="Écrans à revoir">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            class="revue__onglet"
            data-actif={onglet === o.id}
            onClick={() => setOnglet(o.id)}
          >
            {o.nom}
          </button>
        ))}
        <button type="button" class="revue__theme" onClick={() => setClair((c) => !c)}>
          {clair ? 'Sombre' : 'Clair'}
        </button>
      </nav>
    </div>
  );
}
