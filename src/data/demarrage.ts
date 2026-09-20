import type { Serie } from './metriques';
import { fiche, type ExerciceFait, type Modele, type SeanceFaite } from './modele';

/**
 * Ce que contient une base neuve, et ce qu'on peut y verser pour essayer.
 *
 * Les trois modèles sont semés au premier lancement : une app de suivi vide au
 * premier écran ne se laisse pas essayer. L'historique, lui, n'est jamais semé
 * — de fausses séances fausseraient toutes les comparaisons de tonnage. Il
 * s'engendre uniquement à la demande, depuis les réglages.
 */

export const MODELES_DE_DEPART: Modele[] = [
  {
    id: 'push',
    ordre: 0,
    nom: 'Push A',
    favorite: true,
    lignes: [
      { slug: 'bench-press', series: 4, reps: [6, 8], charge: 80, reposSec: 150 },
      { slug: 'incline-dumbbell-press', series: 3, reps: [8, 12], charge: 28, reposSec: 120 },
      { slug: 'machine-shoulder-press', series: 3, reps: [8, 12], charge: 45, reposSec: 120 },
      { slug: 'lateral-raise', series: 4, reps: [12, 15], charge: 10, reposSec: 75 },
      { slug: 'rope-tricep-pushdown', series: 3, reps: [10, 14], charge: 30, reposSec: 75 },
    ],
  },
  {
    id: 'pull',
    ordre: 1,
    nom: 'Pull B',
    favorite: true,
    lignes: [
      { slug: 'barbell-row', series: 4, reps: [6, 8], charge: 70, reposSec: 150 },
      { slug: 'lat-pulldown', series: 3, reps: [8, 12], charge: 60, reposSec: 120 },
      { slug: 'seated-row', series: 3, reps: [8, 12], charge: 55, reposSec: 120 },
      { slug: 'face-pull', series: 3, reps: [12, 15], charge: 25, reposSec: 75 },
      { slug: 'ez-bar-curl', series: 3, reps: [8, 12], charge: 30, reposSec: 90 },
      { slug: 'hammer-curl', series: 3, reps: [10, 12], charge: 14, reposSec: 75 },
    ],
  },
  {
    id: 'jambes',
    ordre: 2,
    nom: 'Jambes',
    favorite: true,
    lignes: [
      { slug: 'squat', series: 4, reps: [5, 8], charge: 100, reposSec: 180 },
      { slug: 'romanian-deadlift', series: 3, reps: [8, 10], charge: 90, reposSec: 150 },
      { slug: 'leg-press', series: 3, reps: [10, 12], charge: 160, reposSec: 120 },
      { slug: 'seated-leg-curl', series: 3, reps: [10, 12], charge: 45, reposSec: 90 },
      { slug: 'standing-calf-raise', series: 4, reps: [12, 15], charge: 60, reposSec: 60 },
    ],
  },
];

const modele = (id: string) => MODELES_DE_DEPART.find((m) => m.id === id);

// --- Engendrement d'un historique d'essai ------------------------------------

/** Générateur déterministe : le jeu de démo est le même à chaque rechargement. */
function alea(graine: number) {
  let x = graine;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

const JOUR = 86_400_000;
const arrondi2_5 = (n: number) => Math.round(n / 2.5) * 2.5;

/** Les jours d'entraînement : lundi, mercredi, vendredi (parfois samedi). */
const ROTATION = ['push', 'pull', 'jambes'];

/**
 * Un trimestre de séances plausibles : progression d'environ 1,2 % par semaine,
 * une semaine de décharge, un peu de bruit. Le générateur est déterministe,
 * donc deux chargements donnent le même jeu.
 */
export function historiqueDeDemonstration(): SeanceFaite[] {
  const r = alea(20_260_920);
  const seances: SeanceFaite[] = [];

  // 13 semaines, calées sur des lundis pour que la grille du mois montre un
  // vrai rythme lundi / mercredi / vendredi.
  const aujourdhui = new Date();
  aujourdhui.setHours(19, 30, 0, 0);
  const lundiCourant = new Date(aujourdhui);
  lundiCourant.setDate(lundiCourant.getDate() - ((lundiCourant.getDay() + 6) % 7));
  const debut = lundiCourant.getTime() - 12 * 7 * JOUR;

  let n = 0;
  for (let semaine = 0; semaine < 13; semaine++) {
    // Semaine 9 : décharge. Charges réduites, une séance sautée.
    const decharge = semaine === 9;
    const seancesSemaine = decharge ? 2 : r() < 0.15 ? 2 : 3;

    for (let i = 0; i < seancesSemaine; i++) {
      const m = modele(ROTATION[n % ROTATION.length])!;
      const date = debut + semaine * 7 * JOUR + [0, 2, 4][i] * JOUR + Math.round((r() - 0.5) * 3 * 3_600_000);
      if (date > Date.now()) continue;

      // Progression : environ +1,2 % de charge par semaine, moins la décharge.
      const facteur = (1 + semaine * 0.012) * (decharge ? 0.85 : 1) * (0.985 + r() * 0.03);

      const exercices: ExerciceFait[] = m.lignes.map((l, iLigne) => {
        const charge = Math.max(2.5, arrondi2_5(l.charge * facteur));
        const series: Serie[] = [];

        // Un échauffement sur le premier exercice seulement, comme dans la vraie vie.
        if (iLigne === 0) {
          series.push({ reps: 12, charge: arrondi2_5(charge * 0.5), echauffement: true, faite: true });
        }
        for (let s = 0; s < l.series; s++) {
          // Les répétitions s'érodent série après série.
          const haut = l.reps[1] - Math.floor(s * 0.6);
          const reps = Math.max(l.reps[0], haut - (r() < 0.35 ? 1 : 0));
          series.push({
            reps,
            charge,
            echauffement: false,
            faite: true,
            rpe: Math.min(10, 7 + s + (r() < 0.3 ? 1 : 0)),
          });
        }
        return { slug: l.slug, series };
      });

      seances.push({
        id: `s${n}`,
        modeleId: m.id,
        nom: m.nom,
        date,
        dureeSec: Math.round((48 + r() * 22) * 60),
        note: decharge && i === 0 ? 'Semaine de décharge, charges volontairement basses.' : undefined,
        exercices,
      });
      n++;
    }
  }

  return seances.sort((a, b) => a.date - b.date);
}

// Garde-fou : une faute de frappe dans un slug ne doit pas passer inaperçue
// jusqu'à l'écran.
for (const m of MODELES_DE_DEPART) for (const l of m.lignes) fiche(l.slug);
