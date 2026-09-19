/**
 * Le jeu d'icônes — tracés Lucide (licence ISC) recopiés en ligne, sans
 * dépendance. Une seule famille, un seul trait, une seule boîte : c'est ce qui
 * empêche une interface de partir en patchwork.
 */

export type NomIcone =
  | 'accueil'
  | 'seances'
  | 'plus'
  | 'moins'
  | 'historique'
  | 'progres'
  | 'reglages'
  | 'chevron-droit'
  | 'chevron-gauche'
  | 'etoile'
  | 'coche'
  | 'lecture'
  | 'pause'
  | 'minuteur'
  | 'croix'
  | 'fleche-haut'
  | 'poignee'
  | 'corbeille'
  | 'recherche';

/** Tracés à 24 × 24, trait uniquement, extrémités et jointures arrondies. */
const TRACES: Record<NomIcone, string> = {
  accueil: 'M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  seances: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  plus: 'M12 5v14M5 12h14',
  moins: 'M5 12h14',
  historique: 'M3 12a9 9 0 1 0 2.6-6.4M3 4v5h5M12 7.5V12l3 2',
  progres: 'M3 17l6-6 4 4 7.5-7.5M15 7.5h6v6',
  reglages:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  'chevron-droit': 'M9 18l6-6-6-6',
  'chevron-gauche': 'M15 18l-6-6 6-6',
  etoile: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z',
  coche: 'M20 6L9 17l-5-5',
  lecture: 'M7 4.5v15l12-7.5z',
  pause: 'M9 4.5v15M15 4.5v15',
  minuteur: 'M10 2h4M12 14V9M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  croix: 'M18 6L6 18M6 6l12 12',
  'fleche-haut': 'M12 19V5M5 12l7-7 7 7',
  poignee: 'M4 8h16M4 16h16',
  corbeille: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5',
  recherche: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
};

/** L'étoile pleine sert à l'état « favorite ». */
const REMPLISSABLES: NomIcone[] = ['etoile', 'lecture', 'pause'];

interface Props {
  nom: NomIcone;
  taille?: number;
  /** Étoile pleine plutôt que contour. */
  pleine?: boolean;
  /** Une icône seule et porteuse de sens a besoin d'un nom accessible. */
  titre?: string;
}

export function Icone({ nom, taille = 24, pleine = false, titre }: Props) {
  const remplie = pleine && REMPLISSABLES.includes(nom);
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill={remplie ? 'currentColor' : 'none'}
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      role={titre ? 'img' : undefined}
      aria-label={titre}
      aria-hidden={titre ? undefined : 'true'}
      style={{ flex: 'none', display: 'block' }}
    >
      <path d={TRACES[nom]} />
    </svg>
  );
}
