/**
 * Construit le catalogue d'exercices.
 *
 *   node scripts/build-catalog.mjs [--force]
 *
 * Source : bryllim/workout-guide — 302 exercices, 3 images SVG transparentes
 * chacune, dérivées du fonds Everkinetic. Licence CC BY-SA 4.0 (voir CREDITS.md).
 *
 * Deux transformations rendent ces images utilisables dans l'app :
 *   1. SVGO à précision réduite — le trait ne bouge pas, le poids fond.
 *   2. fill="#fff" → currentColor — l'illustration prend la couleur du texte,
 *      donc elle marche en mode sombre comme en mode clair, et on peut la
 *      teinter (disque vert sur un record, jaune sur une alerte).
 *
 * Sortie :
 *   public/ex/<slug>/1.svg 2.svg 3.svg
 *   src/catalog/exercices.json
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE_IMAGES = resolve(RACINE, 'public/ex');
const SORTIE_CATALOGUE = resolve(RACINE, 'src/catalog/exercices.json');

const MANIFESTE = 'https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/manifest.json';
const IMAGES = 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@main/packages/workout-guide/assets';

const FORCE = process.argv.includes('--force');
const PARALLELE = 12;

// --- Vocabulaire -------------------------------------------------------------

const MATERIEL_FR = {
  Barbell: 'Barre',
  Bench: 'Banc',
  Bodyweight: 'Poids du corps',
  Box: 'Box',
  Cable: 'Poulie',
  Cardio: 'Cardio',
  Chair: 'Chaise',
  Doorway: 'Embrasure',
  Dumbbell: 'Haltères',
  Kettlebell: 'Kettlebell',
  Machine: 'Machine',
  Plate: 'Disque',
  'Pull-up Bar': 'Barre de traction',
  'Resistance Band': 'Élastique',
  'Stability Ball': 'Swiss ball',
  Towel: 'Serviette',
  Wall: 'Mur',
};

const MUSCLE_FR = {
  Adductors: 'Adducteurs',
  Back: 'Dos',
  Biceps: 'Biceps',
  Calves: 'Mollets',
  Cardio: 'Cardio',
  Chest: 'Pectoraux',
  Core: 'Sangle abdominale',
  Forearms: 'Avant-bras',
  Glutes: 'Fessiers',
  Grip: 'Grip',
  Groin: 'Adducteurs',
  Hamstrings: 'Ischio-jambiers',
  Hips: 'Hanches',
  Lats: 'Grand dorsal',
  Legs: 'Jambes',
  'Lower Back': 'Lombaires',
  Mobility: 'Mobilité',
  'Posterior Chain': 'Chaîne postérieure',
  Quads: 'Quadriceps',
  'Rear Delts': 'Deltoïdes postérieurs',
  Shoulders: 'Épaules',
  Triceps: 'Triceps',
  'Upper Back': 'Haut du dos',
};

/**
 * Regroupement pour les graphiques. L'ordre est FIXE et correspond à
 * --serie-1 … --serie-6 : une couleur suit toujours le même groupe, jamais
 * son rang dans un filtre.
 */
const GROUPES = [
  { id: 'pectoraux', nom: 'Pectoraux', muscles: ['Chest'] },
  { id: 'dos', nom: 'Dos', muscles: ['Back', 'Lats', 'Upper Back', 'Lower Back', 'Posterior Chain'] },
  { id: 'jambes', nom: 'Jambes', muscles: ['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors', 'Hips'] },
  { id: 'epaules', nom: 'Épaules', muscles: ['Shoulders', 'Rear Delts'] },
  { id: 'bras', nom: 'Bras', muscles: ['Biceps', 'Triceps', 'Forearms'] },
  { id: 'tronc', nom: 'Tronc', muscles: ['Core'] },
];
const GROUPE_HORS = { id: 'mobilite', nom: 'Mobilité & cardio' };

const groupeDe = (muscle) => GROUPES.find((g) => g.muscles.includes(muscle))?.id ?? GROUPE_HORS.id;

const TYPE_FR = {
  weight_reps: 'charge_reps',
  bodyweight_reps: 'poids_corps',
  assisted_bodyweight: 'assiste',
  duration: 'duree',
  distance_duration: 'distance_duree',
};

/** Exercices où la charge saisie est un LEST, pas la charge totale déplacée. */
const EST_LESTE = (slug) => slug.startsWith('weighted-');

// --- Traitement d'une image --------------------------------------------------

const CONFIG_SVGO = {
  multipass: true,
  floatPrecision: 1,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // On garde le viewBox : l'illustration doit rester redimensionnable.
          removeViewBox: false,
          cleanupNumericValues: { floatPrecision: 1 },
          convertPathData: { floatPrecision: 1 },
        },
      },
    },
    'removeDimensions', // la taille vient du CSS, pas du fichier
  ],
};

function themable(svg) {
  return svg
    .replace(/fill="(#fff|#ffffff|white)"/gi, 'fill="currentColor"')
    .replace(/fill:\s*(#fff|#ffffff|white)/gi, 'fill:currentColor');
}

async function existe(chemin) {
  try {
    await stat(chemin);
    return true;
  } catch {
    return false;
  }
}

async function telecharger(url, essais = 3) {
  for (let i = 1; i <= essais; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (i === essais) throw new Error(`${url} → ${e.message}`);
      await new Promise((ok) => setTimeout(ok, 400 * i));
    }
  }
  throw new Error('inatteignable');
}

/** @returns {Promise<{octetsSource: number, octetsSortie: number, telecharges: number}>} */
async function imagesDe(slug) {
  const dossier = resolve(SORTIE_IMAGES, slug);
  let octetsSource = 0;
  let octetsSortie = 0;
  let telecharges = 0;

  for (let n = 1; n <= 3; n++) {
    const destination = resolve(dossier, `${n}.svg`);
    if (!FORCE && (await existe(destination))) continue;

    const brut = await telecharger(`${IMAGES}/${slug}/frame-${n}.svg`);
    const { data } = optimize(brut, CONFIG_SVGO);
    const fini = themable(data);

    await mkdir(dossier, { recursive: true });
    await writeFile(destination, fini);

    octetsSource += Buffer.byteLength(brut);
    octetsSortie += Buffer.byteLength(fini);
    telecharges++;
  }
  return { octetsSource, octetsSortie, telecharges };
}

// --- Programme ---------------------------------------------------------------

async function main() {
  const nomsFr = JSON.parse(await readFile(resolve(RACINE, 'scripts/noms-fr.json'), 'utf8'));
  const source = await (await fetch(MANIFESTE)).json();

  const manquants = source.filter((e) => !nomsFr[e.slug]).map((e) => e.slug);
  if (manquants.length) {
    throw new Error(`Traduction manquante : ${manquants.join(', ')}`);
  }

  const catalogue = source
    .map((e) => ({
      slug: e.slug,
      nomFr: nomsFr[e.slug],
      nomEn: e.name,
      type: TYPE_FR[e.exerciseType] ?? e.exerciseType,
      leste: EST_LESTE(e.slug),
      materiel: MATERIEL_FR[e.equipment] ?? e.equipment,
      muscle: MUSCLE_FR[e.primaryMuscle] ?? e.primaryMuscle,
      groupe: groupeDe(e.primaryMuscle),
      secondaires: (e.secondaryMuscles ?? []).map((m) => MUSCLE_FR[m] ?? m),
      etirement: Boolean(e.isStretch),
    }))
    .sort((a, b) => a.nomFr.localeCompare(b.nomFr, 'fr'));

  // Téléchargement par vagues : jsDelivr encaisse, mais restons corrects.
  let source_o = 0;
  let sortie_o = 0;
  let telecharges = 0;
  let faits = 0;

  for (let i = 0; i < catalogue.length; i += PARALLELE) {
    const vague = catalogue.slice(i, i + PARALLELE);
    const bilans = await Promise.all(vague.map((e) => imagesDe(e.slug)));
    for (const b of bilans) {
      source_o += b.octetsSource;
      sortie_o += b.octetsSortie;
      telecharges += b.telecharges;
    }
    faits += vague.length;
    process.stdout.write(`\r  ${faits}/${catalogue.length} exercices`);
  }
  process.stdout.write('\n');

  await mkdir(dirname(SORTIE_CATALOGUE), { recursive: true });
  await writeFile(
    SORTIE_CATALOGUE,
    JSON.stringify(
      {
        _source: 'bryllim/workout-guide (CC BY-SA 4.0) — généré par scripts/build-catalog.mjs',
        groupes: [...GROUPES.map(({ id, nom }) => ({ id, nom })), GROUPE_HORS],
        exercices: catalogue,
      },
      null,
      1,
    ),
  );

  const mo = (o) => (o / 1048576).toFixed(1);
  console.log(`\n  ${catalogue.length} exercices, ${telecharges} images traitées`);
  if (telecharges) {
    console.log(`  ${mo(source_o)} Mo → ${mo(sortie_o)} Mo (${Math.round((1 - sortie_o / source_o) * 100)} % de moins)`);
  } else {
    console.log('  images déjà présentes (--force pour refaire)');
  }
  console.log(`  → ${SORTIE_CATALOGUE}`);
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
