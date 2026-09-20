import { formatNombre } from '../data/metriques';
import { fiche, nomGroupe, type Modele } from '../data/modele';
import { ilYA } from '../data/selection';
import { Icone } from './Icone';
import { Illustration } from './Illustration';
import './carte-seance.css';

/** Les groupes musculaires travaillés, du plus au moins représenté. */
function groupesDe(m: Modele): string[] {
  const compte = new Map<string, number>();
  for (const l of m.lignes) {
    const g = fiche(l.slug).groupe;
    compte.set(g, (compte.get(g) ?? 0) + l.series);
  }
  // Deux groupes, pas trois : à 375 pt la troisième étiquette sort de la
  // rangée et se fait couper au milieu d'un mot. Les deux qui portent le plus
  // de séries disent déjà ce qu'est la séance.
  return [...compte.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([g]) => nomGroupe(g));
}

const dureeEstimee = (m: Modele) =>
  Math.round(m.lignes.reduce((t, l) => t + l.series * (l.reposSec + 40), 0) / 60 / 5) * 5;

interface Commun {
  modele: Modele;
  dernierTonnage?: number;
  derniereDate?: number;
  onOuvrir: () => void;
}

/**
 * La carte compacte de l'accueil. Elle porte l'illustration de son premier
 * exercice : deux séances ne se ressemblent jamais, sans avoir besoin de
 * photos.
 */
export function CarteFavorite({ modele, dernierTonnage, derniereDate, onOuvrir }: Commun) {
  return (
    <button type="button" class="favorite pressable" onClick={onOuvrir}>
      <span class="favorite__illu">
        <Illustration slug={modele.lignes[0].slug} nom={fiche(modele.lignes[0].slug).nomFr} taille={54} />
      </span>

      <span class="favorite__nom">{modele.nom}</span>

      {dernierTonnage ? (
        <span class="favorite__tonnage donnee">
          {formatNombre(dernierTonnage)}
          <span class="favorite__unite">kg</span>
        </span>
      ) : (
        <span class="favorite__tonnage favorite__tonnage--vide">jamais faite</span>
      )}

      <span class="favorite__quand">{derniereDate ? ilYA(derniereDate) : `${modele.lignes.length} exercices`}</span>
    </button>
  );
}

interface LigneProps extends Commun {
  nombreFois?: number;
  onFavorite?: () => void;
}

/** La ligne de la liste « Séances » : dense, 76 px, tout le nécessaire. */
export function LigneModele({
  modele,
  dernierTonnage,
  derniereDate,
  nombreFois,
  onOuvrir,
  onFavorite,
}: LigneProps) {
  const groupes = groupesDe(modele);

  return (
    <li class="ligne-modele">
      <button type="button" class="ligne-modele__zone pressable" onClick={onOuvrir}>
        <Illustration slug={modele.lignes[0].slug} nom={fiche(modele.lignes[0].slug).nomFr} taille={42} />

        <span class="ligne-modele__nommage">
          <span class="ligne-modele__nom">{modele.nom}</span>
          <span class="ligne-modele__meta">
            {modele.lignes.length} exos · ~{dureeEstimee(modele)} min · {groupes.join(', ')}
          </span>
          <span class="ligne-modele__chiffres donnee">
            {dernierTonnage ? `${formatNombre(dernierTonnage)} kg` : 'jamais faite'}
            {derniereDate && ` · ${ilYA(derniereDate)}`}
            {nombreFois ? ` · ${nombreFois} fois` : ''}
          </span>
        </span>

        <span class="ligne-modele__chevron">
          <Icone nom="chevron-droit" taille={18} />
        </span>
      </button>

      {onFavorite && (
        <button
          type="button"
          class="ligne-modele__etoile"
          data-active={modele.favorite}
          onClick={onFavorite}
          aria-label={modele.favorite ? 'Retirer des favorites' : 'Mettre en favorite'}
          aria-pressed={modele.favorite}
        >
          <Icone nom="etoile" taille={18} pleine={modele.favorite} />
        </button>
      )}
    </li>
  );
}
