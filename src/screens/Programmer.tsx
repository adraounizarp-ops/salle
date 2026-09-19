import { useMemo, useState } from 'preact/hooks';
import { BarreChargee, type Troncon } from '../ui/BarreChargee';
import { Illustration } from '../ui/Illustration';
import { EXERCICES, SEANCE_DEMO, fiche, type FicheExercice } from '../data/demo';
import { comparer, formatCharge, formatNombre, produitTonnage } from '../data/metriques';
import './programmer.css';

interface LignePrevue {
  slug: string;
  series: number;
  reps: [number, number];
  charge: number;
  reference: number;
}

const sansAccents = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const MATERIELS = ['Barre', 'Haltères', 'Poulie', 'Machine', 'Poids du corps', 'Élastique', 'Kettlebell'];

export function Programmer() {
  const [lignes, setLignes] = useState<LignePrevue[]>(() =>
    SEANCE_DEMO.lignes.map((l) => ({
      slug: l.slug,
      series: l.cibleSeries,
      reps: l.cibleReps,
      charge: l.cibleCharge,
      reference: l.reference,
    })),
  );
  const [choix, setChoix] = useState(false);

  const prevu = lignes.reduce(
    (t, l) => t + (produitTonnage(fiche(l.slug).type) ? l.series * l.reps[1] * l.charge : 0),
    0,
  );
  const comparaison = comparer(prevu, SEANCE_DEMO.reference);

  // La même barre chargée que pendant la séance : on voit d'où vient le volume
  // avant même d'avoir soulevé quoi que ce soit.
  const troncons: Troncon[] = lignes
    .map((l) => {
      const f = fiche(l.slug);
      return {
        id: l.slug,
        libelle: f.nomFr,
        groupe: f.groupe,
        tonnage: produitTonnage(f.type) ? l.series * l.reps[1] * l.charge : 0,
      };
    })
    .filter((t) => t.tonnage > 0);

  const ajouter = (f: FicheExercice) => {
    setLignes((ls) => [...ls, { slug: f.slug, series: 3, reps: [8, 12], charge: 20, reference: 0 }]);
    setChoix(false);
  };

  if (choix) return <Choisir onAjouter={ajouter} onFermer={() => setChoix(false)} />;

  return (
    <div class="prog">
      <header class="prog__entete">
        <p class="etiquette">Séance favorite</p>
        <h1 class="prog__nom">{SEANCE_DEMO.nom}</h1>
        <p class="prog__meta">Réalisée 14 fois · dernière il y a 4 jours</p>
      </header>

      <main class="prog__corps">
        <ol class="prog__liste">
          {lignes.map((l, i) => {
            const f = fiche(l.slug);
            return (
              <li key={l.slug} class="prog__ligne">
                <span class="prog__poignee donnee" aria-hidden="true">
                  {i + 1}
                </span>
                <Illustration slug={f.slug} nom={f.nomFr} taille={44} />
                <div class="prog__nommage">
                  <p class="prog__exo">{f.nomFr}</p>
                  <p class="prog__sous">
                    {f.nomEn} · {f.materiel}
                  </p>
                </div>
                <div class="prog__cible">
                  <span class="donnee prog__cible-valeur">
                    {l.series} × {l.reps[0]}–{l.reps[1]}
                  </span>
                  <span class="donnee prog__cible-tonnage">
                    {produitTonnage(f.type) ? `${formatCharge(l.charge)} kg` : '—'}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <button type="button" class="prog__ajouter" onClick={() => setChoix(true)}>
          + Ajouter un exercice
        </button>
      </main>

      <footer class="prog__pied" data-etat={comparaison.etat}>
        <div class="prog__barre">
          <BarreChargee troncons={troncons} reference={SEANCE_DEMO.reference} taille="rail" />
        </div>
        <div>
          <p class="etiquette">Tonnage prévu</p>
          <p class="donnee prog__prevu">
            {formatNombre(prevu)} <span class="prog__unite">kg</span>
          </p>
        </div>
        <p class="prog__verdict">
          {comparaison.etat === 'derriere'
            ? `${formatNombre(Math.abs(comparaison.ecart))} kg sous la dernière séance (${formatNombre(SEANCE_DEMO.reference)} kg).`
            : `${formatNombre(Math.abs(comparaison.ecart))} kg au-dessus de la dernière séance.`}
        </p>
        <button type="button" class="prog__lancer">
          Commencer
        </button>
      </footer>
    </div>
  );
}

// --- Le sélecteur d'exercices ------------------------------------------------

function Choisir({ onAjouter, onFermer }: { onAjouter: (f: FicheExercice) => void; onFermer: () => void }) {
  const [texte, setTexte] = useState('');
  const [materiel, setMateriel] = useState<string | null>(null);

  const resultats = useMemo(() => {
    const q = sansAccents(texte.trim());
    return EXERCICES.filter((e) => {
      if (materiel && e.materiel !== materiel) return false;
      if (!q) return true;
      // On cherche dans les deux langues : l'exo vu sur YouTube se retrouve.
      return sansAccents(`${e.nomFr} ${e.nomEn} ${e.muscle} ${e.materiel}`).includes(q);
    }).slice(0, 60);
  }, [texte, materiel]);

  return (
    <div class="choix">
      <header class="choix__entete">
        <div class="choix__barre">
          <input
            class="choix__recherche"
            type="search"
            placeholder="Chercher un exercice"
            value={texte}
            onInput={(e) => setTexte((e.target as HTMLInputElement).value)}
            autoFocus
          />
          <button type="button" class="choix__fermer" onClick={onFermer}>
            Fermer
          </button>
        </div>
        <div class="choix__filtres">
          {MATERIELS.map((m) => (
            <button
              key={m}
              type="button"
              class="choix__filtre"
              data-actif={materiel === m}
              onClick={() => setMateriel(materiel === m ? null : m)}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      <ul class="choix__liste">
        {resultats.map((e) => (
          <li key={e.slug}>
            <button type="button" class="choix__item" onClick={() => onAjouter(e)}>
              <Illustration slug={e.slug} nom={e.nomFr} taille={44} />
              <span class="choix__nommage">
                <span class="choix__nom">{e.nomFr}</span>
                <span class="choix__sous">
                  {e.nomEn} · {e.muscle}
                </span>
              </span>
              <span class="etiquette choix__materiel">{e.materiel}</span>
            </button>
          </li>
        ))}
        {resultats.length === 0 && <li class="choix__vide">Aucun exercice ne correspond. Essaie un autre mot.</li>}
      </ul>
    </div>
  );
}
