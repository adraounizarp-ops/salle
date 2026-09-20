import catalogue from '../catalog/exercices.json';
import type { Serie, TypeExercice } from './metriques';

/**
 * Les formes de données de l'app. Elles sont pensées pour passer telles quelles
 * dans IndexedDB au lot suivant : un modèle et une séance faite sont déjà des
 * objets autonomes, identifiés, sérialisables.
 */

export interface FicheExercice {
  slug: string;
  nomFr: string;
  nomEn: string;
  type: TypeExercice;
  leste: boolean;
  materiel: string;
  muscle: string;
  groupe: string;
  secondaires: string[];
  etirement: boolean;
}

export const EXERCICES = catalogue.exercices as FicheExercice[];
export const GROUPES = catalogue.groupes as { id: string; nom: string }[];

const PAR_SLUG = new Map(EXERCICES.map((e) => [e.slug, e]));

export function fiche(slug: string): FicheExercice {
  const f = PAR_SLUG.get(slug);
  if (!f) throw new Error(`Exercice inconnu : ${slug}`);
  return f;
}

export const nomGroupe = (id: string) => GROUPES.find((g) => g.id === id)?.nom ?? id;

/** Une ligne de modèle : l'objectif, pas le réalisé. */
export interface LigneModele {
  slug: string;
  series: number;
  reps: [number, number];
  charge: number;
  reposSec: number;
}

export interface Modele {
  id: string;
  nom: string;
  favorite: boolean;
  lignes: LigneModele[];
  /** Rang d'affichage dans la liste des séances. */
  ordre?: number;
}

/** Un exercice tel qu'il a été fait, séries comprises. */
export interface ExerciceFait {
  slug: string;
  series: Serie[];
}

export interface SeanceFaite {
  id: string;
  modeleId: string | null;
  nom: string;
  /** Horodatage de fin. */
  date: number;
  dureeSec: number;
  note?: string;
  exercices: ExerciceFait[];
}

/**
 * Un relevé du corps. Tous les champs sont indépendants et aucun n'est requis :
 * on pèse souvent, on mesure rarement, et un relevé où seul le poids est rempli
 * vaut mieux qu'un relevé qu'on a renoncé à saisir.
 */
export interface Mesure {
  id: string;
  date: number;
  /** Kilogrammes. */
  poids?: number;
  /** Tour de taille, en centimètres. */
  taille?: number;
  /** Tour de bras contracté, en centimètres. */
  bras?: number;
  /** Tour de cuisse, en centimètres. */
  cuisse?: number;
  /** Photo de suivi, déjà réduite, en data URL JPEG. */
  photo?: string;
}

/** Les champs chiffrés d'un relevé, dans l'ordre où on les saisit. */
export const CHAMPS_MESURE = [
  { cle: 'poids', nom: 'Poids', unite: 'kg', pas: 0.1 },
  { cle: 'taille', nom: 'Tour de taille', unite: 'cm', pas: 0.5 },
  { cle: 'bras', nom: 'Tour de bras', unite: 'cm', pas: 0.5 },
  { cle: 'cuisse', nom: 'Tour de cuisse', unite: 'cm', pas: 0.5 },
] as const;

export type CleMesure = (typeof CHAMPS_MESURE)[number]['cle'];

/** Une séance en cours de saisie : un modèle déplié, plus l'heure de départ. */
export interface SeanceEnCours {
  modeleId: string | null;
  nom: string;
  debut: number;
  exercices: ExerciceFait[];
  /** Tonnage de la dernière exécution, par exercice puis pour la séance. */
  referenceExercice: Record<string, number>;
  referenceSeance: number;
  /** Repos voulu, par exercice, repris du modèle. */
  reposParExercice: Record<string, number>;
}
