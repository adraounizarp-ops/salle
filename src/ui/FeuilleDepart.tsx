import { formatDuree, formatNombre } from '../data/metriques';
import { fiche, type Modele, type SeanceEnCours, type SeanceFaite } from '../data/modele';
import { derniereDe, ilYA, tonnageSeance } from '../data/selection';
import { Feuille } from './Feuille';
import { Icone } from './Icone';
import { Illustration } from './Illustration';
import './feuille-depart.css';

interface Props {
  modeles: Modele[];
  historique: SeanceFaite[];
  enCours: SeanceEnCours | null;
  onReprendre: () => void;
  onDemarrer: (m: Modele) => void;
  onLibre: () => void;
  onFermer: () => void;
}

/**
 * Ce qui s'ouvre sous le bouton central : deux taps entre l'accueil et la
 * première série. Les favorites d'abord, parce que c'est ce qu'on lance
 * neuf fois sur dix.
 */
export function FeuilleDepart({
  modeles,
  historique,
  enCours,
  onReprendre,
  onDemarrer,
  onLibre,
  onFermer,
}: Props) {
  const favorites = modeles.filter((m) => m.favorite);
  const autres = modeles.filter((m) => !m.favorite);

  const ligne = (m: Modele) => {
    const derniere = derniereDe(historique, m.id);
    return (
      <li key={m.id}>
        <button type="button" class="depart__ligne pressable" onClick={() => onDemarrer(m)}>
          <Illustration slug={m.lignes[0].slug} nom={fiche(m.lignes[0].slug).nomFr} taille={36} />
          <span class="depart__nommage">
            <span class="depart__nom">{m.nom}</span>
            <span class="depart__meta">
              {m.lignes.length} exercices
              {derniere ? ` · ${formatNombre(tonnageSeance(derniere))} kg · ${ilYA(derniere.date)}` : ''}
            </span>
          </span>
          <span class="depart__chevron">
            <Icone nom="chevron-droit" taille={18} />
          </span>
        </button>
      </li>
    );
  };

  return (
    <Feuille titre="Démarrer" sous="Choisis une séance et c'est parti" onFermer={onFermer}>
      {enCours && (
        <button type="button" class="depart__reprendre" onClick={onReprendre}>
          <span class="depart__reprendre-icone">
            <Icone nom="lecture" taille={16} pleine />
          </span>
          <span class="depart__nommage">
            <span class="depart__nom">Reprendre {enCours.nom}</span>
            <span class="depart__meta">séance déjà commencée</span>
          </span>
          <span class="depart__chrono mono">
            {formatDuree(Math.floor((Date.now() - enCours.debut) / 1000))}
          </span>
        </button>
      )}

      {favorites.length > 0 && (
        <>
          <p class="etiquette depart__titre">Favorites</p>
          <ul class="depart__liste">{favorites.map(ligne)}</ul>
        </>
      )}

      {autres.length > 0 && (
        <>
          <p class="etiquette depart__titre">Autres séances</p>
          <ul class="depart__liste">{autres.map(ligne)}</ul>
        </>
      )}

      <button type="button" class="depart__libre" onClick={onLibre}>
        <Icone nom="plus" taille={18} />
        Séance libre
        <span class="depart__libre-note">on ajoute les exercices en route</span>
      </button>
    </Feuille>
  );
}
