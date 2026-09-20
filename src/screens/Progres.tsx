import { useState } from 'preact/hooks';
import { Courbe } from '../charts/Courbe';
import { formatNombre, pluriel, unRmEpley } from '../data/metriques';
import { fiche, nomGroupe, type Modele, type SeanceFaite } from '../data/modele';
import { ilYA, nombreDe, records, serieTonnage, volumeParGroupe } from '../data/selection';
import { Ecran, Section } from '../ui/Ecran';
import { Segmente } from '../ui/Segmente';
import './progres.css';

type Vue = 'seance' | 'exercice' | 'muscle';

interface Props {
  modeles: Modele[];
  historique: SeanceFaite[];
}

const moyenneMobile = (v: number[], n: number) =>
  v.map((_, i) => {
    const t = v.slice(Math.max(0, i - n + 1), i + 1);
    return t.reduce((s, x) => s + x, 0) / t.length;
  });

/** Repères d'hypertrophie : sous 10 séries on est léger, au-delà de 20 on sature. */
const ZONE = [10, 20] as const;

export function Progres({ modeles, historique }: Props) {
  const [vue, setVue] = useState<Vue>('seance');

  return (
    <Ecran titre="Progrès" sous="13 dernières semaines">
      <Segmente
        etiquette="Ce qu'on regarde"
        valeur={vue}
        onChange={setVue}
        options={[
          { id: 'seance', nom: 'Séance' },
          { id: 'exercice', nom: 'Exercice' },
          { id: 'muscle', nom: 'Muscle' },
        ]}
      />

      {vue === 'seance' && <ParSeance modeles={modeles} historique={historique} />}
      {vue === 'exercice' && <ParExercice historique={historique} />}
      {vue === 'muscle' && <ParMuscle historique={historique} />}
    </Ecran>
  );
}

// --- Par séance ---------------------------------------------------------------

function ParSeance({ modeles, historique }: Props) {
  const faits = modeles.filter((m) => nombreDe(historique, m.id) >= 3);
  const [id, setId] = useState(faits[0]?.id ?? '');
  const choisi = faits.find((m) => m.id === id) ?? faits[0];

  if (!choisi) {
    return (
      <Section>
        <div class="vide">
          <p class="vide__titre">Pas encore de courbe</p>
          <p class="vide__texte">Il faut trois exécutions d'une même séance pour dessiner une tendance.</p>
        </div>
      </Section>
    );
  }

  const tonnages = serieTonnage(historique, choisi.id);
  const dernier = tonnages[tonnages.length - 1];
  const premier = tonnages[0];

  return (
    <>
      <div class="puces bande-h">
        {faits.map((m) => (
          <button
            key={m.id}
            type="button"
            class="filtre"
            data-actif={m.id === choisi.id}
            aria-pressed={m.id === choisi.id}
            onClick={() => setId(m.id)}
          >
            {m.nom}
          </button>
        ))}
      </div>

      <Section titre="Tonnage par exécution">
        <div class="carte">
          <Courbe
            titre={choisi.nom}
            points={tonnages.map((v, i) => ({ etiquette: `${i + 1}`, valeur: v }))}
            tendance={moyenneMobile(tonnages, 3)}
          />
        </div>
      </Section>

      <Section titre="Depuis la première fois">
        <div class="carte">
          <p class="bilan donnee" data-sens={dernier >= premier ? 'haut' : 'bas'}>
            {dernier >= premier ? '+' : '−'}
            {formatNombre(Math.abs(dernier - premier))} kg
          </p>
          <p class="bilan__note">
            {formatNombre(premier)} kg la première fois, {formatNombre(dernier)} kg la dernière —
            sur {tonnages.length} {pluriel(tonnages.length, 'exécution')}.
          </p>
        </div>
      </Section>
    </>
  );
}

// --- Par exercice -------------------------------------------------------------

function ParExercice({ historique }: { historique: SeanceFaite[] }) {
  const meilleurs = [...records(historique).values()].sort((a, b) => (b.unRm ?? 0) - (a.unRm ?? 0));
  const [slug, setSlug] = useState(meilleurs[0]?.slug ?? '');
  const choisi = meilleurs.find((r) => r.slug === slug) ?? meilleurs[0];

  if (!choisi) {
    return (
      <Section>
        <div class="vide">
          <p class="vide__titre">Aucun record encore</p>
          <p class="vide__texte">Les records apparaissent dès la première séance enregistrée.</p>
        </div>
      </Section>
    );
  }

  // Le meilleur 1RM estimé de chaque séance où l'exercice apparaît.
  const suite = historique
    .filter((s) => s.exercices.some((e) => e.slug === choisi.slug))
    .sort((a, b) => a.date - b.date)
    .map((s) => {
      const e = s.exercices.find((x) => x.slug === choisi.slug)!;
      const meilleur = e.series
        .filter((x) => !x.echauffement && x.faite)
        .map((x) => unRmEpley(x.charge, x.reps) ?? 0)
        .reduce((m, v) => Math.max(m, v), 0);
      return meilleur;
    })
    .filter((v) => v > 0);

  return (
    <>
      <div class="puces bande-h">
        {meilleurs.slice(0, 8).map((r) => (
          <button
            key={r.slug}
            type="button"
            class="filtre"
            data-actif={r.slug === choisi.slug}
            aria-pressed={r.slug === choisi.slug}
            onClick={() => setSlug(r.slug)}
          >
            {fiche(r.slug).nomFr}
          </button>
        ))}
      </div>

      {suite.length >= 3 && (
        <Section titre="1RM estimé (Epley)">
          <div class="carte">
            <Courbe
              titre={fiche(choisi.slug).nomFr}
              points={suite.map((v, i) => ({ etiquette: `${i + 1}`, valeur: v }))}
              tendance={moyenneMobile(suite, 3)}
            />
            <p class="carte__note">
              Le 1RM estimé complète le tonnage : il repère un gain de force même quand le volume
              baisse.
            </p>
          </div>
        </Section>
      )}

      <Section titre="Records">
        <ul class="recs">
          {meilleurs.slice(0, 10).map((r) => (
            <li key={r.slug} class="rec">
              <span class="rec__nom">{fiche(r.slug).nomFr}</span>
              <span class="rec__perf donnee">
                {formatNombre(r.charge)} kg × {r.reps}
              </span>
              <span class="rec__rm donnee">{r.unRm ? `${formatNombre(r.unRm)} kg` : '—'}</span>
              <span class="rec__quand">{ilYA(r.date)}</span>
            </li>
          ))}
        </ul>
        <p class="legende-colonne">
          Colonne de droite : 1RM estimé.
        </p>
      </Section>
    </>
  );
}

// --- Par muscle ---------------------------------------------------------------

function ParMuscle({ historique }: { historique: SeanceFaite[] }) {
  const semaine = volumeParGroupe(historique, 7);
  const echelle = Math.max(ZONE[1] + 4, ...semaine.map((v) => v.series));

  return (
    <Section titre="Séries dures cette semaine">
      <div class="carte">
        <ul class="zones">
          {semaine.map((v) => {
            const dedans = v.series >= ZONE[0] && v.series <= ZONE[1];
            return (
              <li key={v.groupe} class="zone">
                <span class="zone__nom">{nomGroupe(v.groupe)}</span>
                <span class="zone__piste">
                  <span class="zone__barre" style={{ width: `${(v.series / echelle) * 100}%` }} />
                  {/* Les bornes de la fourchette, tracées par-dessus la barre pour
                      rester lisibles même quand elle les dépasse. */}
                  {ZONE.map((borne) => (
                    <span
                      key={borne}
                      class="zone__borne"
                      style={{ left: `${(borne / echelle) * 100}%` }}
                      aria-hidden="true"
                    />
                  ))}
                </span>
                <span class="zone__valeur donnee" data-dedans={dedans}>
                  {v.series}
                </span>
              </li>
            );
          })}
        </ul>

        <p class="zones__echelle">
          <span class="zones__borne-nom" style={{ left: `${(ZONE[0] / echelle) * 100}%` }}>
            {ZONE[0]}
          </span>
          <span class="zones__borne-nom" style={{ left: `${(ZONE[1] / echelle) * 100}%` }}>
            {ZONE[1]}
          </span>
        </p>

        <p class="carte__note">
          Entre les deux repères, de {ZONE[0]} à {ZONE[1]} séries par semaine : la fourchette où le
          volume paye le mieux en hypertrophie. Le tonnage peut grossir en empilant des séries
          faciles — cette vue l'arbitre.
        </p>
      </div>
    </Section>
  );
}
