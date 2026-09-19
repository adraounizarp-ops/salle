/**
 * Données de démonstration — lot 0 uniquement.
 * Sert à regarder les écrans avec du contenu réaliste avant de brancher
 * IndexedDB. À supprimer au lot 1.
 */
import catalogue from '../catalog/exercices.json';
import type { Serie, TypeExercice } from './metriques';

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

export const fiche = (slug: string): FicheExercice => {
  const f = EXERCICES.find((e) => e.slug === slug);
  if (!f) throw new Error(`Exercice inconnu : ${slug}`);
  return f;
};

export interface LigneSeance {
  slug: string;
  cibleSeries: number;
  cibleReps: [number, number];
  cibleCharge: number;
  reposSec: number;
  /** Tonnage réalisé sur cet exercice la dernière fois. */
  reference: number;
  series: Serie[];
}

const serie = (reps: number, charge: number, faite: boolean, echauffement = false, rpe?: number): Serie => ({
  reps,
  charge,
  echauffement,
  faite,
  rpe,
});

/** « Push A » en cours : deux exercices bouclés, le troisième entamé. */
export const SEANCE_DEMO = {
  nom: 'Push A',
  debut: Date.now() - 42 * 60_000 - 17_000,
  reference: 7600,
  lignes: [
    {
      slug: 'bench-press',
      cibleSeries: 4,
      cibleReps: [6, 8] as [number, number],
      cibleCharge: 80,
      reposSec: 150,
      reference: 2720,
      series: [
        serie(12, 40, true, true),
        serie(8, 80, true, false, 7),
        serie(8, 80, true, false, 8),
        serie(8, 80, true, false, 9),
        serie(6, 80, false),
      ],
    },
    {
      slug: 'incline-dumbbell-press',
      cibleSeries: 3,
      cibleReps: [8, 12] as [number, number],
      cibleCharge: 28,
      reposSec: 120,
      reference: 1050,
      series: [serie(12, 28, true, false, 8), serie(11, 28, true, false, 9), serie(10, 28, true, false, 9)],
    },
    {
      slug: 'machine-shoulder-press',
      cibleSeries: 3,
      cibleReps: [8, 12] as [number, number],
      cibleCharge: 45,
      reposSec: 120,
      reference: 1680,
      series: [serie(12, 45, true, false, 8), serie(10, 45, false), serie(10, 45, false)],
    },
    {
      slug: 'lateral-raise',
      cibleSeries: 4,
      cibleReps: [12, 15] as [number, number],
      cibleCharge: 10,
      reposSec: 75,
      reference: 620,
      series: [serie(15, 10, false), serie(15, 10, false), serie(15, 10, false), serie(15, 10, false)],
    },
    {
      slug: 'rope-tricep-pushdown',
      cibleSeries: 3,
      cibleReps: [10, 14] as [number, number],
      cibleCharge: 30,
      reposSec: 75,
      reference: 1530,
      series: [serie(14, 30, false), serie(14, 30, false), serie(14, 30, false)],
    },
  ] satisfies LigneSeance[],
};

/** Historique d'une séance favorite, pour la carte et le graphique. */
export const HISTORIQUE_PUSH_A = [6_480, 6_920, 7_040, 6_880, 7_320, 7_600];
