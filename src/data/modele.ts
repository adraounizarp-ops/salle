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
