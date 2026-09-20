import { useEffect, useState } from 'preact/hooks';
import { useEcranAllume } from '../app/ecranAllume';
import { reveillerLeSon } from '../app/son';
import { resumerChargement } from '../data/disques';
import {
  comparer,
  formatCharge,
  formatDuree,
  formatNombre,
  pluriel,
  pourEgaler,
  produitTonnage,
  tonnageExercice,
  tonnageSerie,
  type Serie,
} from '../data/metriques';
import { fiche, type ExerciceFait, type SeanceEnCours } from '../data/modele';
import { BandeH } from '../ui/BandeH';
import { BarreChargee } from '../ui/BarreChargee';
import { Icone } from '../ui/Icone';
import { Illustration } from '../ui/Illustration';
import { Feuille } from '../ui/Feuille';
import { Pave } from '../ui/Pave';
import { Repos } from '../ui/Repos';
import './execution.css';

type Champ = 'reps' | 'charge';

interface Props {
  seance: SeanceEnCours;
  onChangement: (s: SeanceEnCours) => void;
  /** Sortie sans clore : la séance reste reprenable depuis l'accueil. */
  onQuitter: () => void;
  /** Abandon franc : la séance en cours est jetée. */
  onAbandonner: () => void;
  onTerminer: (note?: string) => void;
  avecSon: boolean;
}

export function Execution({
  seance,
  onChangement,
  onQuitter,
  onAbandonner,
  onTerminer,
  avecSon,
}: Props) {
  const [iExo, setIExo] = useState(() => {
    const i = seance.exercices.findIndex((e) => e.series.some((s) => !s.faite));
    return i === -1 ? 0 : i;
  });
  const [champ, setChamp] = useState<Champ>('reps');
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const [repos, setRepos] = useState<number | null>(null);
  const [bilan, setBilan] = useState(false);
  const [note, setNote] = useState('');
  const [chrono, setChrono] = useState(() => Math.floor((Date.now() - seance.debut) / 1000));

  // Tant qu'on est sur cet écran, l'iPhone ne s'endort pas.
  useEcranAllume(true);

  useEffect(() => {
    const t = setInterval(() => setChrono(Math.floor((Date.now() - seance.debut) / 1000)), 1000);
    return () => clearInterval(t);
  }, [seance.debut]);

  const exo = seance.exercices[iExo];
  const f = fiche(exo.slug);
  const iSerie = exo.series.findIndex((s) => !s.faite);
  const serieActive: Serie | undefined = iSerie === -1 ? undefined : exo.series[iSerie];
  const precedente = iSerie > 0 ? exo.series[iSerie - 1] : undefined;

  // --- Tonnages
  const reference = seance.referenceExercice[exo.slug] ?? 0;
  const projete = tonnageExercice(exo.series, f.type);
  const fait = tonnageExercice(exo.series, f.type, true);
  const comparaison = comparer(projete, reference);
  const rattrapage = serieActive ? pourEgaler(comparaison, serieActive.reps, serieActive.charge) : null;

  const troncons = seance.exercices
    .map((e) => ({
      id: e.slug,
      libelle: fiche(e.slug).nomFr,
      tonnage: tonnageExercice(e.series, fiche(e.slug).type, true),
    }))
    .filter((t) => t.tonnage > 0);
  const tonnageSeance = troncons.reduce((t, x) => t + x.tonnage, 0);

  // --- Saisie
  const majSerie = (modif: Partial<Serie>) => {
    const exercices: ExerciceFait[] = seance.exercices.map((e, i) =>
      i !== iExo ? e : { ...e, series: e.series.map((s, j) => (j === iSerie ? { ...s, ...modif } : s)) },
    );
    onChangement({ ...seance, exercices });
  };

  const pas = champ === 'reps' ? 1 : 2.5;

  const appliquer = (texte: string) => {
    const n = Number(texte.replace(',', '.'));
    const v = Number.isFinite(n) ? n : 0;
    majSerie(champ === 'reps' ? { reps: Math.round(v) } : { charge: v });
  };

  const touche = (t: string) => {
    if (!serieActive) return;

    if (t === '+' || t === '-') {
      const actuel = champ === 'reps' ? serieActive.reps : serieActive.charge;
      const suivant = Math.max(0, Math.round((actuel + (t === '+' ? pas : -pas)) * 100) / 100);
      setBrouillon(null);
      majSerie(champ === 'reps' ? { reps: suivant } : { charge: suivant });
      return;
    }

    if (t === 'idem') {
      if (precedente) {
        setBrouillon(null);
        majSerie({ reps: precedente.reps, charge: precedente.charge });
      }
      return;
    }

    if (t === 'effacer') {
      const court = (brouillon ?? '').slice(0, -1);
      setBrouillon(court);
      appliquer(court);
      return;
    }

    if (t === ',' && champ === 'reps') return; // pas de demi-répétition
    const base = brouillon ?? '';
    if (t === ',' && base.includes(',')) return;
    const long = (base + t).slice(0, 6);
    setBrouillon(long);
    appliquer(long);
  };

  const valeurAffichee = (c: Champ): string => {
    if (!serieActive) return '—';
    if (brouillon !== null && c === champ) return brouillon || '0';
    return c === 'reps' ? String(serieActive.reps) : formatCharge(serieActive.charge);
  };

  const valider = () => {
    if (!serieActive) return;
    // Le contexte audio ne peut naître que d'un geste : celui-ci précède
    // toujours le repos, c'est le bon moment.
    if (avecSon) reveillerLeSon();
    majSerie({ faite: true });
    setBrouillon(null);
    setChamp('reps');
    setRepos(seance.reposParExercice?.[exo.slug] ?? 120);
  };

  const finExo = iSerie === -1;
  const dernierExo = iExo === seance.exercices.length - 1;
  const toutFini = seance.exercices.every((e) => e.series.every((s) => s.faite));

  // Le nombre compte : « 2 séries » se laisse tomber sans réfléchir, « 17 »
  // veut dire qu'on s'apprête à jeter la moitié de la séance.
  const enAttente = seance.exercices.reduce(
    (n, e) => n + e.series.filter((s) => !s.faite).length,
    0,
  );

  return (
    <div class="exec">
      <header class="exec__entete">
        <div class="exec__barre">
          <button
            type="button"
            class="exec__quitter pressable"
            onClick={onQuitter}
            aria-label="Mettre la séance de côté"
            title="La séance reste reprenable depuis l'accueil"
          >
            <Icone nom="chevron-gauche" taille={22} />
          </button>
          <h1 class="exec__nom">{seance.nom}</h1>
          <span class="exec__chrono mono" title="Durée de la séance">
            {formatDuree(chrono)}
          </span>
        </div>

        <div class="exec__compte">
          <span class="exec__tonnage donnee">
            {formatNombre(tonnageSeance)} <span class="exec__unite">kg</span>
          </span>
          {seance.referenceSeance > 0 && (
            <span class="exec__reference donnee">/ {formatNombre(seance.referenceSeance)} la dernière fois</span>
          )}
        </div>

        <BarreChargee troncons={troncons} reference={seance.referenceSeance} taille="rail" />
      </header>

      {/* Le rail d'exercices : on saute d'un exercice à l'autre sans revenir en arrière. */}
      <BandeH class="rail" etiquette="Exercices de la séance">
        {seance.exercices.map((e, i) => {
          const fini = e.series.every((s) => s.faite);
          return (
            <button
              key={e.slug}
              type="button"
              class="rail__pastille"
              data-actif={i === iExo}
              data-fini={fini}
              onClick={() => setIExo(i)}
              aria-current={i === iExo ? 'true' : undefined}
              aria-label={fiche(e.slug).nomFr}
              title={fiche(e.slug).nomFr}
            >
              <Illustration slug={e.slug} nom={fiche(e.slug).nomFr} taille={28} />
              {fini && (
                <span class="rail__coche">
                  <Icone nom="coche" taille={11} />
                </span>
              )}
            </button>
          );
        })}
      </BandeH>

      <main class="exec__corps">
        <section class="bloc-exo">
          <div class="bloc-exo__tete">
            <span class="bloc-exo__illu">
              <Illustration slug={f.slug} nom={f.nomFr} anime taille={60} />
            </span>
            <div class="bloc-exo__nommage">
              <h2 class="bloc-exo__nom">{f.nomFr}</h2>
              <p class="bloc-exo__sous">
                {f.nomEn} · {f.materiel}
              </p>
            </div>
            <span class="bloc-exo__rang etiquette">
              {iExo + 1}/{seance.exercices.length}
            </span>
          </div>

          <ol class="series">
            {exo.series.map((s, j) => {
              const actif = j === iSerie;
              const numero = exo.series.slice(0, j + 1).filter((x) => !x.echauffement).length;
              return (
                <li key={j} class="serie" data-etat={s.faite ? 'faite' : actif ? 'active' : 'a-venir'}>
                  <span class="serie__rang mono">{s.echauffement ? 'W' : numero}</span>

                  {actif ? (
                    <>
                      <button
                        type="button"
                        class="serie__champ mono"
                        data-choisi={champ === 'reps'}
                        onClick={() => {
                          setChamp('reps');
                          setBrouillon(null);
                        }}
                      >
                        {valeurAffichee('reps')}
                        <span class="serie__unite">reps</span>
                      </button>
                      <span class="serie__croix" aria-hidden="true">
                        ×
                      </span>
                      <button
                        type="button"
                        class="serie__champ mono"
                        data-choisi={champ === 'charge'}
                        onClick={() => {
                          setChamp('charge');
                          setBrouillon(null);
                        }}
                      >
                        {valeurAffichee('charge')}
                        <span class="serie__unite">{f.leste ? 'lest' : 'kg'}</span>
                      </button>
                    </>
                  ) : (
                    <span class="serie__valeurs mono">
                      {s.reps} <span class="serie__croix">×</span> {formatCharge(s.charge)}
                      <span class="serie__unite">{f.leste ? 'lest' : 'kg'}</span>
                    </span>
                  )}

                  <span class="serie__tonnage mono">
                    {s.echauffement || !produitTonnage(f.type) ? '·' : formatNombre(tonnageSerie(s, f.type))}
                  </span>

                  {s.faite && s.rpe !== undefined && <span class="serie__rpe">RPE {s.rpe}</span>}
                  {s.faite && (
                    <span class="serie__coche" aria-label="Série validée">
                      <Icone nom="coche" taille={14} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          {f.materiel === 'Barre' && serieActive && (
            <p class="chargement">
              {formatCharge(serieActive.charge)} kg = {resumerChargement(serieActive.charge)}
            </p>
          )}
        </section>

        {comparaison.etat === 'derriere' && rattrapage && (
          <aside class="bandeau bandeau--baisse" role="status">
            <span class="bandeau__pastille" aria-hidden="true" />
            <div>
              <p class="bandeau__titre">
                {formatNombre(Math.abs(comparaison.ecart))} kg sous la dernière fois
              </p>
              <p class="bandeau__detail">
                {rattrapage.series} série{rattrapage.series > 1 ? 's' : ''} de {rattrapage.reps} ×{' '}
                {formatCharge(rattrapage.charge)} kg pour égaler les {formatNombre(reference)} kg.
              </p>
            </div>
          </aside>
        )}

        {comparaison.etat === 'devant' && fait >= reference && reference > 0 && (
          <aside class="bandeau bandeau--devant" role="status">
            <span class="bandeau__pastille" aria-hidden="true" />
            <div>
              <p class="bandeau__titre">Dernière fois dépassée</p>
              <p class="bandeau__detail">
                +{formatNombre(fait - reference)} kg sur {f.nomFr.toLowerCase()}.
              </p>
            </div>
          </aside>
        )}

        {finExo && !dernierExo && (
          <button type="button" class="suivant" onClick={() => setIExo(iExo + 1)}>
            <span class="etiquette">Exercice suivant</span>
            <span class="suivant__nom">{fiche(seance.exercices[iExo + 1].slug).nomFr}</span>
            <span class="suivant__chevron">
              <Icone nom="chevron-droit" taille={20} />
            </span>
          </button>
        )}

        <button
          type="button"
          class={`bouton bouton--plein ${toutFini ? 'bouton--vert' : 'bouton--fantome'}`}
          onClick={() => setBilan(true)}
        >
          {toutFini ? 'Terminer la séance' : 'Terminer maintenant'}
        </button>
      </main>

      {serieActive && (
        <Pave
          pas={pas}
          idemPossible={Boolean(precedente)}
          onTouche={touche}
          onValider={valider}
          libelleValider={`Valider · ${formatNombre(tonnageSerie(serieActive, f.type))} kg`}
        />
      )}

      {bilan && (
        <Feuille
          titre="Fin de séance"
          sous={`${formatNombre(tonnageSeance)} kg en ${formatDuree(chrono)}`}
          onFermer={() => setBilan(false)}
        >
          <div class="fin">
            {!toutFini && (
              <p class="fin__avertissement">
                {enAttente} {pluriel(enAttente, 'série non validée', 'séries non validées')} ne
                {enAttente >= 2 ? ' seront' : ' sera'} pas {pluriel(enAttente, 'enregistrée')}.
              </p>
            )}

            <label class="champ">
              <span class="etiquette">Note (facultatif)</span>
              <textarea
                class="champ__saisie champ__saisie--texte"
                rows={3}
                placeholder="Mal dormi, dos sensible, dernière série à l'échec…"
                value={note}
                onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)}
              />
            </label>

            <button
              type="button"
              class="bouton bouton--vert bouton--plein"
              onClick={() => onTerminer(note)}
            >
              Enregistrer la séance
            </button>

            <button
              type="button"
              class="bouton bouton--corail bouton--plein"
              onClick={() => {
                if (confirm('Abandonner cette séance ? Rien ne sera enregistré.')) onAbandonner();
              }}
            >
              Abandonner sans enregistrer
            </button>
          </div>
        </Feuille>
      )}

      {repos !== null && (
        <Repos
          total={repos}
          ecart={projete - reference}
          avecSon={avecSon}
          prochaine={
            iSerie === -1
              ? null
              : { reps: exo.series[iSerie].reps, charge: exo.series[iSerie].charge, leste: f.leste }
          }
          onFini={() => setRepos(null)}
        />
      )}
    </div>
  );
}
