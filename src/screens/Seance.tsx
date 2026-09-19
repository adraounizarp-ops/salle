import { useEffect, useMemo, useState } from 'preact/hooks';
import { BarreChargee, type Troncon } from '../ui/BarreChargee';
import { Illustration } from '../ui/Illustration';
import { Pave } from '../ui/Pave';
import { Repos } from '../ui/Repos';
import { resumerChargement } from '../data/disques';
import { SEANCE_DEMO, fiche, type LigneSeance } from '../data/demo';
import {
  comparer,
  formatCharge,
  formatDuree,
  formatNombre,
  pourEgaler,
  produitTonnage,
  tonnageExercice,
  tonnageSerie,
  type Serie,
} from '../data/metriques';
import './seance.css';

type Champ = 'reps' | 'charge';

export function Seance() {
  const [lignes, setLignes] = useState<LigneSeance[]>(() =>
    SEANCE_DEMO.lignes.map((l) => ({ ...l, series: l.series.map((s) => ({ ...s })) })),
  );
  const [iExo, setIExo] = useState(2);
  const [champ, setChamp] = useState<Champ>('reps');
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const [repos, setRepos] = useState<{ total: number } | null>(null);
  const [chrono, setChrono] = useState(() => Math.floor((Date.now() - SEANCE_DEMO.debut) / 1000));

  useEffect(() => {
    const t = setInterval(() => setChrono((c) => c + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const ligne = lignes[iExo];
  const exo = fiche(ligne.slug);
  const iSerie = ligne.series.findIndex((s) => !s.faite);
  const serieActive: Serie | undefined = iSerie === -1 ? undefined : ligne.series[iSerie];
  const precedente = iSerie > 0 ? ligne.series[iSerie - 1] : undefined;

  // --- Tonnages
  const faitExo = tonnageExercice(ligne.series, exo.type, true);
  const projeteExo = tonnageExercice(ligne.series, exo.type);
  const comparaisonExo = comparer(projeteExo, ligne.reference);
  const rattrapage = serieActive
    ? pourEgaler(comparaisonExo, serieActive.reps, serieActive.charge)
    : null;

  const troncons: Troncon[] = useMemo(
    () =>
      lignes
        .map((l) => {
          const f = fiche(l.slug);
          return {
            id: l.slug,
            libelle: f.nomFr,
            groupe: f.groupe,
            tonnage: tonnageExercice(l.series, f.type, true),
          };
        })
        .filter((t) => t.tonnage > 0),
    [lignes],
  );

  const tonnageSeance = troncons.reduce((t, x) => t + x.tonnage, 0);

  // --- Saisie
  const valeurAffichee = (c: Champ): string => {
    if (!serieActive) return '—';
    if (brouillon !== null && c === champ) return brouillon || '0';
    return c === 'reps' ? String(serieActive.reps) : formatCharge(serieActive.charge);
  };

  const majSerie = (modif: Partial<Serie>) =>
    setLignes((ls) =>
      ls.map((l, i) =>
        i !== iExo ? l : { ...l, series: l.series.map((s, j) => (j === iSerie ? { ...s, ...modif } : s)) },
      ),
    );

  const pas = champ === 'reps' ? 1 : 2.5;

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
      const base = brouillon ?? '';
      const court = base.slice(0, -1);
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

  const appliquer = (texte: string) => {
    const n = Number(texte.replace(',', '.'));
    const v = Number.isFinite(n) ? n : 0;
    majSerie(champ === 'reps' ? { reps: Math.round(v) } : { charge: v });
  };

  const choisirChamp = (c: Champ) => {
    setChamp(c);
    setBrouillon(null);
  };

  const valider = () => {
    if (!serieActive) return;
    majSerie({ faite: true });
    setBrouillon(null);
    setChamp('reps');
    setRepos({ total: ligne.reposSec });
  };

  const finExo = iSerie === -1;
  const exoSuivant = lignes[iExo + 1];

  return (
    <div class="seance">
      <header class="seance__entete">
        <div class="seance__titre-ligne">
          <h1 class="seance__nom">{SEANCE_DEMO.nom}</h1>
          <span class="seance__chrono donnee" title="Chronomètre de séance">
            {formatDuree(chrono)}
          </span>
          <button class="seance__action" type="button" aria-label="Mettre la séance en pause">
            ⏸
          </button>
        </div>

        <div class="seance__compte">
          <span class="donnee seance__tonnage">
            {formatNombre(tonnageSeance)} <span class="seance__unite">kg</span>
          </span>
          <span class="seance__cible donnee">
            / {formatNombre(SEANCE_DEMO.reference)} la dernière fois
          </span>
        </div>
        <BarreChargee troncons={troncons} reference={SEANCE_DEMO.reference} taille="rail" />
      </header>

      <main class="seance__corps">
        <section class="carte-exo">
          <div class="carte-exo__tete">
            <Illustration slug={exo.slug} nom={exo.nomFr} anime taille={64} />
            <div class="carte-exo__nommage">
              <h2 class="carte-exo__nom">{exo.nomFr}</h2>
              <p class="carte-exo__sous">
                {exo.nomEn} · {exo.materiel}
              </p>
            </div>
            <span class="carte-exo__rang etiquette">
              {iExo + 1}/{lignes.length}
            </span>
          </div>

          <ol class="series">
            {ligne.series.map((s, j) => {
              const actif = j === iSerie;
              const numero = ligne.series.slice(0, j + 1).filter((x) => !x.echauffement).length;
              return (
                <li key={j} class="serie" data-etat={s.faite ? 'faite' : actif ? 'active' : 'a-venir'}>
                  <span class="serie__rang donnee">{s.echauffement ? 'W' : numero}</span>

                  {actif ? (
                    <>
                      <button
                        type="button"
                        class="serie__champ donnee"
                        data-choisi={champ === 'reps'}
                        onClick={() => choisirChamp('reps')}
                      >
                        {valeurAffichee('reps')}
                        <span class="serie__unite">reps</span>
                      </button>
                      <span class="serie__croix" aria-hidden="true">
                        ×
                      </span>
                      <button
                        type="button"
                        class="serie__champ donnee"
                        data-choisi={champ === 'charge'}
                        onClick={() => choisirChamp('charge')}
                      >
                        {valeurAffichee('charge')}
                        <span class="serie__unite">{exo.leste ? 'lest' : 'kg'}</span>
                      </button>
                    </>
                  ) : (
                    <span class="serie__valeurs donnee">
                      {s.reps} <span class="serie__croix">×</span> {formatCharge(s.charge)}
                      <span class="serie__unite">{exo.leste ? 'lest' : 'kg'}</span>
                    </span>
                  )}

                  <span class="serie__tonnage donnee">
                    {s.echauffement || !produitTonnage(exo.type)
                      ? '·'
                      : `${formatNombre(tonnageSerie(s, exo.type))}`}
                  </span>

                  {s.faite && s.rpe !== undefined && <span class="serie__rpe donnee">RPE {s.rpe}</span>}
                  {s.faite && <span class="serie__coche" aria-label="Série validée">✓</span>}
                </li>
              );
            })}
          </ol>

          {exo.materiel === 'Barre' && serieActive && (
            <p class="chargement donnee">
              {formatCharge(serieActive.charge)} kg = {resumerChargement(serieActive.charge)}
            </p>
          )}
        </section>

        {comparaisonExo.etat === 'derriere' && rattrapage && (
          <aside class="alerte alerte--baisse" role="status">
            <span class="alerte__pastille" aria-hidden="true" />
            <div>
              <p class="alerte__titre">
                {formatNombre(Math.abs(comparaisonExo.ecart))} kg sous la dernière fois
              </p>
              <p class="alerte__detail">
                {rattrapage.series} série{rattrapage.series > 1 ? 's' : ''} de {rattrapage.reps} ×{' '}
                {formatCharge(rattrapage.charge)} kg pour égaler les {formatNombre(ligne.reference)} kg.
              </p>
            </div>
          </aside>
        )}

        {comparaisonExo.etat === 'devant' && faitExo >= ligne.reference && (
          <aside class="alerte alerte--devant" role="status">
            <span class="alerte__pastille" aria-hidden="true" />
            <div>
              <p class="alerte__titre">Dernière fois dépassée</p>
              <p class="alerte__detail">
                +{formatNombre(faitExo - ligne.reference)} kg sur {exo.nomFr.toLowerCase()}.
              </p>
            </div>
          </aside>
        )}

        {finExo && exoSuivant && (
          <button class="suivant" type="button" onClick={() => setIExo(iExo + 1)}>
            <span class="etiquette">Exercice suivant</span>
            <span class="suivant__nom">{fiche(exoSuivant.slug).nomFr}</span>
          </button>
        )}
      </main>

      {serieActive && (
        <Pave
          pas={pas}
          idemPossible={Boolean(precedente)}
          onTouche={touche}
          onValider={valider}
          libelleValider={`Valider · ${formatNombre(tonnageSerie(serieActive, exo.type))} kg`}
        />
      )}

      {repos && (
        <Repos
          total={repos.total}
          ecart={faitExo - ligne.reference}
          prochaine={
            iSerie === -1
              ? null
              : { reps: ligne.series[iSerie].reps, charge: ligne.series[iSerie].charge, leste: exo.leste }
          }
          onFini={() => setRepos(null)}
        />
      )}
    </div>
  );
}
