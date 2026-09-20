/**
 * Les règles de calcul. Une seule définition du tonnage dans toute l'app.
 *
 * Tonnage = Σ(répétitions × charge) sur les séries de travail.
 *   · l'échauffement est enregistré mais exclu ;
 *   · le poids du corps est exclu : sur une traction ou des dips lestés, seul
 *     le lest compte en kilos, les répétitions sont comptées à part ;
 *   · un exercice au poids du corps, en durée ou en distance ne produit pas de
 *     tonnage — il compte en répétitions et en séries dures.
 */

export type TypeExercice = 'charge_reps' | 'poids_corps' | 'assiste' | 'duree' | 'distance_duree';

export interface Serie {
  reps: number;
  /** Kilos saisis. Sur un exercice lesté, c'est le lest seul. */
  charge: number;
  echauffement: boolean;
  rpe?: number;
  faite: boolean;
}

export const produitTonnage = (type: TypeExercice): boolean => type === 'charge_reps';

export function tonnageSerie(s: Serie, type: TypeExercice): number {
  if (!produitTonnage(type) || s.echauffement) return 0;
  return s.reps * s.charge;
}

export function tonnageExercice(series: readonly Serie[], type: TypeExercice, seulementFaites = false): number {
  return series
    .filter((s) => !seulementFaites || s.faite)
    .reduce((total, s) => total + tonnageSerie(s, type), 0);
}

/** Séries dures : séries de travail réalisées, hors échauffement. */
export function seriesDures(series: readonly Serie[]): number {
  return series.filter((s) => s.faite && !s.echauffement).length;
}

/** 1RM estimé, formule d'Epley. Au-delà de ~10 répétitions elle dérive : on s'arrête là. */
export function unRmEpley(charge: number, reps: number): number | null {
  if (charge <= 0 || reps <= 0 || reps > 12) return null;
  return Math.round(charge * (1 + reps / 30) * 10) / 10;
}

// --- Comparaison à la séance précédente --------------------------------------

export type Etat = 'devant' | 'derriere' | 'egal' | 'sans_reference';

export interface Comparaison {
  etat: Etat;
  projete: number;
  reference: number;
  ecart: number;
  /** Pourcentage d'écart, négatif quand on est en dessous. */
  pourcent: number;
}

/** Sous ce seuil, l'écart est du bruit de mesure : on ne dit rien. */
const SEUIL = 0.02;

export function comparer(projete: number, reference: number): Comparaison {
  if (reference <= 0) {
    return { etat: 'sans_reference', projete, reference, ecart: 0, pourcent: 0 };
  }
  const ecart = projete - reference;
  const pourcent = (ecart / reference) * 100;
  const etat: Etat = pourcent < -SEUIL * 100 ? 'derriere' : pourcent > SEUIL * 100 ? 'devant' : 'egal';
  return { etat, projete, reference, ecart, pourcent };
}

/**
 * De quoi rendre l'alerte actionnable : ce qu'il reste à faire pour égaler.
 * Renvoie null quand il n'y a rien à rattraper.
 */
export function pourEgaler(
  comparaison: Comparaison,
  reps: number,
  charge: number,
): { series: number; reps: number; charge: number } | null {
  if (comparaison.etat !== 'derriere') return null;
  const parSerie = reps * charge;
  if (parSerie <= 0) return null;
  return { series: Math.ceil(-comparaison.ecart / parSerie), reps, charge };
}

/** Trois séances de suite en baisse : ce n'est plus une mauvaise journée. */
export function baisseInstallee(tonnagesRecents: readonly number[]): boolean {
  if (tonnagesRecents.length < 4) return false;
  const derniers = tonnagesRecents.slice(-4);
  return derniers.every((t, i) => i === 0 || t < derniers[i - 1]);
}

// --- Mise en forme -----------------------------------------------------------

/**
 * Séparateur de milliers : espace insécable. L'espace fine (U+202F) serait plus
 * juste typographiquement mais manque au sous-ensemble latin de Geist, où elle
 * disparaît purement et simplement.
 */
export const formatNombre = (n: number): string =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/**
 * Accord au pluriel. « 1 minutes » et « 1 exercices » sont les deux fautes que
 * produit mécaniquement un carnet qui compte, et elles sautent aux yeux sur la
 * toute première séance — celle où il n'y a justement qu'un exercice.
 */
export const pluriel = (n: number, mot: string, forme = `${mot}s`): string =>
  Math.abs(n) >= 2 ? forme : mot;

export const formatCharge = (n: number): string =>
  (Math.round(n * 100) / 100).toString().replace('.', ',');

export function formatDuree(secondes: number): string {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  const s = Math.floor(secondes % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
