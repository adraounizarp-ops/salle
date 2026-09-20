import { seriesDures, tonnageExercice, unRmEpley } from './metriques';
import { fiche, type ExerciceFait, type Modele, type SeanceFaite } from './modele';

/**
 * Les questions que les écrans posent aux données.
 *
 * Tout passe par ici plutôt que par des calculs éparpillés dans les vues :
 * quand IndexedDB remplacera le tableau de démonstration, seules ces fonctions
 * changeront de source.
 */

const JOUR = 86_400_000;

export const tonnageExerciceFait = (e: ExerciceFait): number =>
  tonnageExercice(e.series, fiche(e.slug).type, true);

export const tonnageSeance = (s: SeanceFaite): number =>
  s.exercices.reduce((t, e) => t + tonnageExerciceFait(e), 0);

export const seriesSeance = (s: SeanceFaite): number =>
  s.exercices.reduce((n, e) => n + seriesDures(e.series), 0);

/** Kilos par minute : même tonnage en moins de temps, c'est un progrès. */
export const densite = (s: SeanceFaite): number => (tonnageSeance(s) / s.dureeSec) * 60;

// --- Fenêtres de temps -------------------------------------------------------

/** Les séances d'une fenêtre glissante. `recul` = 0 pour les 7 derniers jours,
 *  1 pour les 7 jours d'avant. */
export function dansLaFenetre(
  historique: readonly SeanceFaite[],
  jours = 7,
  recul = 0,
): SeanceFaite[] {
  const fin = Date.now() - recul * jours * JOUR;
  const debut = fin - jours * JOUR;
  return historique.filter((s) => s.date > debut && s.date <= fin);
}

export const tonnageFenetre = (historique: readonly SeanceFaite[], jours = 7, recul = 0): number =>
  dansLaFenetre(historique, jours, recul).reduce((t, s) => t + tonnageSeance(s), 0);

/** La dernière exécution d'un modèle, ou undefined s'il n'a jamais été fait. */
export function derniereDe(
  historique: readonly SeanceFaite[],
  modeleId: string,
): SeanceFaite | undefined {
  let derniere: SeanceFaite | undefined;
  for (const s of historique) if (s.modeleId === modeleId && (!derniere || s.date > derniere.date)) derniere = s;
  return derniere;
}

export const nombreDe = (historique: readonly SeanceFaite[], modeleId: string): number =>
  historique.filter((s) => s.modeleId === modeleId).length;

/** Suite des tonnages d'un modèle, du plus ancien au plus récent. */
export const serieTonnage = (historique: readonly SeanceFaite[], modeleId: string): number[] =>
  historique
    .filter((s) => s.modeleId === modeleId)
    .sort((a, b) => a.date - b.date)
    .map(tonnageSeance);

// --- Calendrier --------------------------------------------------------------

export interface JourCalendrier {
  date: Date;
  /** Les séances de ce jour. Vide un jour de repos. */
  seances: SeanceFaite[];
  horsMois: boolean;
  aujourdhui: boolean;
}

const memeJour = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * La grille d'un mois, alignée sur des semaines qui commencent le lundi.
 * Les jours de débordement sont marqués plutôt qu'omis : la grille garde sept
 * colonnes, donc l'œil garde ses repères d'un mois à l'autre.
 */
export function grilleDuMois(historique: readonly SeanceFaite[], annee: number, mois: number): JourCalendrier[] {
  const premier = new Date(annee, mois, 1);
  const decalage = (premier.getDay() + 6) % 7; // lundi = 0
  const depart = new Date(annee, mois, 1 - decalage);
  const maintenant = new Date();

  const cases: JourCalendrier[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(depart.getFullYear(), depart.getMonth(), depart.getDate() + i);
    cases.push({
      date,
      seances: historique.filter((s) => memeJour(new Date(s.date), date)),
      horsMois: date.getMonth() !== mois,
      aujourdhui: memeJour(date, maintenant),
    });
    // On s'arrête dès que la semaine entamée dépasse le mois.
    if (i % 7 === 6 && date.getMonth() !== mois && date > premier) break;
  }
  return cases;
}

export const seancesDuMois = (historique: readonly SeanceFaite[], annee: number, mois: number): SeanceFaite[] =>
  historique.filter((s) => {
    const d = new Date(s.date);
    return d.getFullYear() === annee && d.getMonth() === mois;
  });

// --- Records -----------------------------------------------------------------

export interface Record {
  slug: string;
  /** Charge la plus lourde jamais soulevée sur une série de travail. */
  charge: number;
  reps: number;
  /** 1RM estimé correspondant, formule d'Epley. */
  unRm: number | null;
  date: number;
}

/**
 * Le meilleur 1RM estimé par exercice. C'est le bon juge d'un record : 100 × 3
 * et 85 × 8 ne se comparent pas à la charge seule.
 */
export function records(historique: readonly SeanceFaite[]): Map<string, Record> {
  const meilleurs = new Map<string, Record>();

  for (const s of historique) {
    for (const e of s.exercices) {
      if (fiche(e.slug).type !== 'charge_reps') continue;
      for (const serie of e.series) {
        if (serie.echauffement || !serie.faite) continue;
        const unRm = unRmEpley(serie.charge, serie.reps);
        if (unRm === null) continue;

        const actuel = meilleurs.get(e.slug);
        if (!actuel || unRm > (actuel.unRm ?? 0)) {
          meilleurs.set(e.slug, { slug: e.slug, charge: serie.charge, reps: serie.reps, unRm, date: s.date });
        }
      }
    }
  }
  return meilleurs;
}

/** Les records tombés récemment, les plus frais d'abord. */
export function recordsRecents(historique: readonly SeanceFaite[], jours = 30): Record[] {
  const limite = Date.now() - jours * JOUR;
  return [...records(historique).values()]
    .filter((r) => r.date > limite)
    .sort((a, b) => b.date - a.date);
}

// --- Volume par groupe musculaire --------------------------------------------

export interface VolumeGroupe {
  groupe: string;
  nom: string;
  tonnage: number;
  series: number;
}

/**
 * Séries dures et tonnage par groupe musculaire sur une fenêtre.
 * Le tonnage seul peut grossir en empilant du volume inutile : le nombre de
 * séries dures est ce qui se compare aux repères d'hypertrophie.
 */
export function volumeParGroupe(
  historique: readonly SeanceFaite[],
  jours = 7,
  recul = 0,
): VolumeGroupe[] {
  const par = new Map<string, VolumeGroupe>();

  for (const s of dansLaFenetre(historique, jours, recul)) {
    for (const e of s.exercices) {
      const f = fiche(e.slug);
      const courant = par.get(f.groupe) ?? { groupe: f.groupe, nom: '', tonnage: 0, series: 0 };
      courant.tonnage += tonnageExerciceFait(e);
      courant.series += seriesDures(e.series);
      par.set(f.groupe, courant);
    }
  }

  return [...par.values()].sort((a, b) => b.series - a.series);
}

// --- Le répertoire personnel -------------------------------------------------

/**
 * Les exercices que l'on pratique déjà, du plus récemment fait au plus ancien,
 * puis ceux qui n'existent que sur le papier — présents dans un modèle mais
 * jamais encore exécutés.
 *
 * Le catalogue en compte 302 par ordre alphabétique ; dans les faits on en
 * refait toujours la même douzaine. C'est elle qu'il faut trouver en premier.
 */
export function exercicesConnus(
  historique: readonly SeanceFaite[],
  modeles: readonly Modele[],
): string[] {
  const vus: string[] = [];
  const dedans = new Set<string>();

  for (let i = historique.length - 1; i >= 0; i--) {
    for (const e of historique[i].exercices) {
      if (dedans.has(e.slug)) continue;
      dedans.add(e.slug);
      vus.push(e.slug);
    }
  }

  for (const m of modeles) {
    for (const l of m.lignes) {
      if (dedans.has(l.slug)) continue;
      dedans.add(l.slug);
      vus.push(l.slug);
    }
  }

  return vus;
}

// --- Mise en forme du temps --------------------------------------------------

export function ilYA(date: number): string {
  const jours = Math.floor((Date.now() - date) / JOUR);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return 'hier';
  if (jours < 7) return `il y a ${jours} j`;
  const semaines = Math.floor(jours / 7);
  if (semaines < 5) return `il y a ${semaines} sem.`;
  return `il y a ${Math.floor(jours / 30)} mois`;
}

const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export const nomMois = (mois: number) => MOIS[mois];
export const nomMoisCourt = (mois: number) => MOIS[mois].slice(0, 4).replace('juil', 'juil');
export const nomJourCourt = (d: Date) => JOURS[d.getDay()].slice(0, 3);

export const dateLongue = (d: Date) => `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
