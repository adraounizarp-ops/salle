import { Icone, type NomIcone } from './Icone';
import './onglets.css';

interface Props {
  actif: string;
  onOnglet: (vers: string) => void;
  onDemarrer: () => void;
}

const GAUCHE: { vers: string; nom: string; icone: NomIcone }[] = [
  { vers: '/', nom: 'Accueil', icone: 'accueil' },
  { vers: '/seances', nom: 'Séances', icone: 'seances' },
];

const DROITE: { vers: string; nom: string; icone: NomIcone }[] = [
  { vers: '/historique', nom: 'Historique', icone: 'historique' },
  { vers: '/progres', nom: 'Progrès', icone: 'progres' },
];

/**
 * La barre du bas. Quatre destinations et un bouton d'action au centre : partir
 * en séance est la seule chose qu'on fait vraiment en arrivant dans l'app, elle
 * mérite le pouce.
 */
export function Onglets({ actif, onOnglet, onDemarrer }: Props) {
  const onglet = (o: (typeof GAUCHE)[number]) => (
    <button
      key={o.vers}
      type="button"
      class="onglet"
      data-actif={actif === o.vers}
      aria-current={actif === o.vers ? 'page' : undefined}
      onClick={() => onOnglet(o.vers)}
    >
      <Icone nom={o.icone} taille={22} />
      <span class="onglet__nom">{o.nom}</span>
    </button>
  );

  return (
    <nav class="onglets" aria-label="Navigation principale">
      {GAUCHE.map(onglet)}

      <button type="button" class="onglets__demarrer" onClick={onDemarrer}>
        <Icone nom="plus" taille={26} titre="Démarrer une séance" />
      </button>

      {DROITE.map(onglet)}
    </nav>
  );
}
