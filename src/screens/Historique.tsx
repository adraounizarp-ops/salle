import { formatNombre, pluriel } from '../data/metriques';
import type { SeanceFaite } from '../data/modele';
import {
  grilleDuMois,
  nomJourCourt,
  nomMois,
  seriesSeance,
  tonnageSeance,
} from '../data/selection';
import { BandeH } from '../ui/BandeH';
import { Ecran, Section } from '../ui/Ecran';
import { GrilleMois } from '../ui/GrillePoints';
import { Icone } from '../ui/Icone';
import './historique.css';

interface Props {
  historique: SeanceFaite[];
  onOuvrir: (s: SeanceFaite) => void;
  onDemarrer: () => void;
}

/** Les séances groupées par mois, du plus récent au plus ancien. */
function parMois(historique: readonly SeanceFaite[]) {
  const groupes = new Map<string, { annee: number; mois: number; seances: SeanceFaite[] }>();

  for (const s of [...historique].sort((a, b) => b.date - a.date)) {
    const d = new Date(s.date);
    const cle = `${d.getFullYear()}-${d.getMonth()}`;
    const g = groupes.get(cle) ?? { annee: d.getFullYear(), mois: d.getMonth(), seances: [] };
    g.seances.push(s);
    groupes.set(cle, g);
  }
  return [...groupes.values()];
}

/** L'écart avec l'exécution précédente du même modèle. */
function ecartAvecPrecedente(historique: readonly SeanceFaite[], s: SeanceFaite): number | null {
  const memes = historique
    .filter((x) => x.modeleId === s.modeleId && x.date < s.date)
    .sort((a, b) => b.date - a.date);
  if (memes.length === 0) return null;
  return tonnageSeance(s) - tonnageSeance(memes[0]);
}

export function Historique({ historique, onOuvrir, onDemarrer }: Props) {
  if (historique.length === 0) {
    return (
      <Ecran titre="Historique">
        <div class="vide">
          <p class="vide__titre">Aucune séance enregistrée</p>
          <p class="vide__texte">
            Tout ce que tu termines atterrit ici, série par série, et sert de référence à la fois
            suivante.
          </p>
          <button type="button" class="bouton bouton--vert" onClick={onDemarrer}>
            <Icone nom="lecture" taille={16} pleine />
            Démarrer une séance
          </button>
        </div>
      </Ecran>
    );
  }

  const groupes = parMois(historique);
  // Les quatre derniers mois en bandeau, du plus ancien au plus récent.
  const bandeau = groupes.slice(0, 4).reverse();

  // Le mois courant est au bout à droite : c'est lui qu'on vient regarder, pas
  // celui d'il y a trois mois. D'où `aLaFin` sur la bande.

  const total = historique.reduce((t, s) => t + tonnageSeance(s), 0);

  return (
    <Ecran
      titre="Historique"
      sous={`${historique.length} séances · ${formatNombre(total)} kg au total`}
    >
      <Section plein>
        <BandeH class="bandeau-mois" aLaFin>
          {bandeau.map((g) => (
            <div key={`${g.annee}-${g.mois}`} class="bandeau-mois__case">
              <p class="etiquette">{nomMois(g.mois).slice(0, 4)}</p>
              <GrilleMois compact cases={grilleDuMois(historique, g.annee, g.mois)} />
              <p class="bandeau-mois__compte donnee">{g.seances.length}</p>
            </div>
          ))}
        </BandeH>
      </Section>

      {groupes.map((g) => {
        const tonnageMois = g.seances.reduce((t, s) => t + tonnageSeance(s), 0);
        return (
          <Section
            key={`${g.annee}-${g.mois}`}
            titre={nomMois(g.mois)}
            suffixe={
              <span class="section__compte donnee">
                {g.seances.length} · {formatNombre(tonnageMois)} kg
              </span>
            }
          >
            <ul class="hist-liste">
              {g.seances.map((s) => {
                const d = new Date(s.date);
                const ecart = ecartAvecPrecedente(historique, s);
                return (
                  <li key={s.id}>
                    <button type="button" class="hist-ligne pressable" onClick={() => onOuvrir(s)}>
                      <span class="hist-ligne__date">
                        <span class="hist-ligne__jour donnee">{d.getDate()}</span>
                        <span class="hist-ligne__sem">{nomJourCourt(d)}</span>
                      </span>

                      <span class="hist-ligne__nommage">
                        <span class="hist-ligne__nom">{s.nom}</span>
                        <span class="hist-ligne__meta">
                          {Math.round(s.dureeSec / 60)} min · {seriesSeance(s)}{' '}
                          {pluriel(seriesSeance(s), 'série')}
                        </span>
                      </span>

                      <span class="hist-ligne__chiffres">
                        <span class="hist-ligne__tonnage donnee">{formatNombre(tonnageSeance(s))} kg</span>
                        {ecart !== null && ecart !== 0 && (
                          <span class="hist-ligne__ecart donnee" data-sens={ecart > 0 ? 'haut' : 'bas'}>
                            <span
                              class="hist-ligne__fleche"
                              style={ecart > 0 ? undefined : { transform: 'rotate(180deg)' }}
                            >
                              <Icone nom="fleche-haut" taille={11} />
                            </span>
                            {formatNombre(Math.abs(ecart))}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      })}
    </Ecran>
  );
}
