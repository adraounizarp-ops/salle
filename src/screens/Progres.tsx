import { useState } from 'preact/hooks';
import { Courbe } from '../charts/Courbe';
import { formatCharge, formatNombre, pluriel, unRmEpley } from '../data/metriques';
import {
  CHAMPS_MESURE,
  fiche,
  nomGroupe,
  type CleMesure,
  type Mesure,
  type Modele,
  type SeanceFaite,
} from '../data/modele';
import {
  ilYA,
  nomMoisCourt,
  nombreDe,
  records,
  serieTonnage,
  volumeParGroupe,
} from '../data/selection';
import { BandeH } from '../ui/BandeH';
import { Confirmation } from '../ui/Confirmation';
import { Ecran, Section } from '../ui/Ecran';
import { FeuilleMesure } from '../ui/FeuilleMesure';
import { Icone } from '../ui/Icone';
import { Segmente } from '../ui/Segmente';
import './progres.css';

type Vue = 'seance' | 'exercice' | 'muscle' | 'corps';

interface Props {
  modeles: Modele[];
  historique: SeanceFaite[];
  mesures: Mesure[];
  onMesure: (m: Mesure) => void;
  onSupprimerMesure: (id: string) => void;
}

const moyenneMobile = (v: number[], n: number) =>
  v.map((_, i) => {
    const t = v.slice(Math.max(0, i - n + 1), i + 1);
    return t.reduce((s, x) => s + x, 0) / t.length;
  });

/** Repères d'hypertrophie : sous 10 séries on est léger, au-delà de 20 on sature. */
const ZONE = [10, 20] as const;

export function Progres({ modeles, historique, mesures, onMesure, onSupprimerMesure }: Props) {
  const [vue, setVue] = useState<Vue>('seance');
  // `null` : la feuille est fermée. Un objet vide : on crée. Un relevé : on le
  // reprend.
  const [saisie, setSaisie] = useState<Mesure | 'nouveau' | null>(null);

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
          { id: 'corps', nom: 'Corps' },
        ]}
      />

      {vue === 'seance' && <ParSeance modeles={modeles} historique={historique} />}
      {vue === 'exercice' && <ParExercice historique={historique} />}
      {vue === 'muscle' && <ParMuscle historique={historique} />}
      {vue === 'corps' && (
        <ParCorps
          mesures={mesures}
          onAjouter={() => setSaisie('nouveau')}
          onModifier={setSaisie}
          onSupprimer={(m) => onSupprimerMesure(m.id)}
        />
      )}

      {saisie && (
        <FeuilleMesure
          mesure={saisie === 'nouveau' ? undefined : saisie}
          precedent={mesures[mesures.length - 1]}
          onEnregistrer={(m) => {
            onMesure(m);
            setSaisie(null);
          }}
          onFermer={() => setSaisie(null)}
        />
      )}
    </Ecran>
  );
}

// --- Par séance ---------------------------------------------------------------

function ParSeance({ modeles, historique }: { modeles: Modele[]; historique: SeanceFaite[] }) {
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
      <BandeH class="puces">
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
      </BandeH>

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
      <BandeH class="puces">
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
      </BandeH>

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

// --- Le corps -----------------------------------------------------------------

const dateCourte = (t: number) =>
  `${new Date(t).getDate()} ${nomMoisCourt(new Date(t).getMonth())}`;

/**
 * Le résumé d'une ligne de relevé.
 *
 * Dix mesures alignées ne tiennent pas sur une rangée d'iPhone et finiraient
 * élidées au milieu d'un chiffre. On montre donc le poids — le seul qu'on
 * relève à chaque fois — et on compte les tours ; le détail s'ouvre d'un tap.
 */
function resumerMesure(m: Mesure): string {
  const tours = CHAMPS_MESURE.filter((c) => c.cle !== 'poids' && m[c.cle] !== undefined).length;
  const morceaux: string[] = [];

  if (m.poids !== undefined) morceaux.push(`${formatCharge(m.poids)} kg`);
  if (tours > 0) morceaux.push(`${tours} ${pluriel(tours, 'tour')}`);
  if (morceaux.length === 0) return 'photo seule';

  return morceaux.join(' · ');
}

/**
 * Le poids et les tours de bras.
 *
 * Le carnet ne suivait que ce qui se soulève. Or un tonnage qui monte pendant
 * que le poids de corps monte plus vite ne raconte pas la même histoire qu'un
 * tonnage qui monte à poids constant — et c'est exactement ce qu'on vient
 * vérifier ici.
 */
function ParCorps({
  mesures,
  onAjouter,
  onModifier,
  onSupprimer,
}: {
  mesures: Mesure[];
  onAjouter: () => void;
  onModifier: (m: Mesure) => void;
  onSupprimer: (m: Mesure) => void;
}) {
  const [cle, setCle] = useState<CleMesure>('poids');
  const [aEffacer, setAEffacer] = useState<Mesure | null>(null);

  const champ = CHAMPS_MESURE.find((c) => c.cle === cle) ?? CHAMPS_MESURE[0];
  const renseignes = mesures.filter((m) => m[cle] !== undefined);
  const recents = [...mesures].reverse();

  if (mesures.length === 0) {
    return (
      <>
        <Section>
          <div class="vide">
            <p class="vide__titre">Rien de relevé</p>
            <p class="vide__texte">
              Le poids et les tours complètent le tonnage : ils disent si le volume qui monte
              construit du muscle ou seulement des chiffres.
            </p>
          </div>
        </Section>
        <Section>
          <button type="button" class="bouton bouton--vert bouton--plein" onClick={onAjouter}>
            <Icone nom="plus" taille={16} />
            Premier relevé
          </button>
        </Section>
      </>
    );
  }

  const premier = renseignes[0]?.[cle];
  const dernier = renseignes[renseignes.length - 1]?.[cle];
  const ecart = premier !== undefined && dernier !== undefined ? dernier - premier : 0;

  return (
    <>
      <BandeH class="puces">
        {CHAMPS_MESURE.map((c) => (
          <button
            key={c.cle}
            type="button"
            class="filtre"
            data-actif={c.cle === cle}
            aria-pressed={c.cle === cle}
            onClick={() => setCle(c.cle)}
          >
            {c.nom}
          </button>
        ))}
      </BandeH>

      <Section titre={champ.nom}>
        <div class="carte">
          {renseignes.length >= 2 ? (
            <>
              <Courbe
                titre={`${formatCharge(dernier as number)} ${champ.unite}`}
                unite={champ.unite}
                serie={champ.nom}
                pas="relevés"
                decimale
                points={renseignes.map((m) => ({
                  etiquette: dateCourte(m.date),
                  valeur: m[cle] as number,
                }))}
                tendance={moyenneMobile(
                  renseignes.map((m) => m[cle] as number),
                  3,
                )}
              />
              <p class="corps__ecart" data-sens={ecart >= 0 ? 'haut' : 'bas'}>
                {/* « +0 cm » ne veut rien dire : au centimètre près, c'est
                    stable, et c'est ce qu'il faut lire. */}
                {Math.abs(ecart) < 0.05
                  ? 'Stable'
                  : `${ecart > 0 ? '+' : '−'}${formatCharge(Math.abs(ecart))} ${champ.unite}`}
                <span class="corps__depuis">
                  depuis le {dateCourte(renseignes[0].date)}, sur{' '}
                  {renseignes.length} {pluriel(renseignes.length, 'relevé')}
                </span>
              </p>
            </>
          ) : (
            <p class="carte__note carte__note--seule">
              Un deuxième relevé et la courbe se dessine. Pour l'instant :{' '}
              {dernier === undefined
                ? 'rien de noté pour cette mesure.'
                : `${formatCharge(dernier)} ${champ.unite}.`}
            </p>
          )}
        </div>
      </Section>

      <Section titre="Relevés">
        <ul class="releves">
          {recents.map((m) => (
            <li key={m.id} class="releve">
              <button type="button" class="releve__zone" onClick={() => onModifier(m)}>
                {m.photo ? (
                  <img class="releve__photo" src={m.photo} alt="" />
                ) : (
                  <span class="releve__photo releve__photo--vide" aria-hidden="true" />
                )}
                <span class="releve__nommage">
                  <span class="releve__date">{dateCourte(m.date)}</span>
                  <span class="releve__chiffres donnee">{resumerMesure(m)}</span>
                </span>
                <Icone nom="chevron-droit" taille={16} />
              </button>
              <button
                type="button"
                class="releve__supprimer"
                aria-label={`Supprimer le relevé du ${dateCourte(m.date)}`}
                onClick={() => setAEffacer(m)}
              >
                <Icone nom="corbeille" taille={16} />
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          class="bouton bouton--fantome bouton--plein corps__ajouter"
          onClick={onAjouter}
        >
          <Icone nom="plus" taille={16} />
          Ajouter un relevé
        </button>
      </Section>

      {aEffacer && (
        <Confirmation
          titre={`Supprimer le relevé du ${dateCourte(aEffacer.date)} ?`}
          texte="Les courbes se redessinent sans lui. La photo qui l'accompagne part avec."
          action="Supprimer le relevé"
          icone="corbeille"
          onConfirmer={() => {
            onSupprimer(aEffacer);
            setAEffacer(null);
          }}
          onFermer={() => setAEffacer(null)}
        />
      )}
    </>
  );
}
