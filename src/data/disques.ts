/** Disques olympiques standard, du plus lourd au plus léger. */
export const DISQUES_PAR_DEFAUT = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export const BARRE_PAR_DEFAUT = 20;

export interface Chargement {
  /** Ce qu'il faut enfiler de chaque côté, du plus lourd au plus léger. */
  parCote: { poids: number; nombre: number }[];
  /** Ce qui n'est pas atteignable avec les disques disponibles, en kg. */
  reste: number;
  /** false quand la charge est inférieure à la barre seule. */
  possible: boolean;
}

/**
 * Décompose une charge en disques par côté.
 *
 * Glouton : c'est exactement ce qu'on fait devant le rack, et avec des
 * dénominations 25/20/15/10/5/2,5/1,25 le glouton donne le chargement minimal.
 */
export function calculerDisques(
  charge: number,
  barre: number = BARRE_PAR_DEFAUT,
  disponibles: readonly number[] = DISQUES_PAR_DEFAUT,
): Chargement {
  if (charge < barre) return { parCote: [], reste: 0, possible: false };

  let parCote = (charge - barre) / 2;
  const plan: { poids: number; nombre: number }[] = [];

  for (const poids of [...disponibles].sort((a, b) => b - a)) {
    const nombre = Math.floor(parCote / poids + 1e-9);
    if (nombre > 0) {
      plan.push({ poids, nombre });
      parCote -= nombre * poids;
    }
  }

  return { parCote: plan, reste: Math.round(parCote * 2 * 100) / 100, possible: true };
}

const fmt = (n: number) => n.toString().replace('.', ',');

/** « barre 20 + 20 · 5 · 2,5 » — la phrase qu'on lit en chargeant. */
export function resumerChargement(charge: number, barre = BARRE_PAR_DEFAUT, disponibles = DISQUES_PAR_DEFAUT): string {
  const { parCote, reste, possible } = calculerDisques(charge, barre, disponibles);
  if (!possible) return `moins que la barre (${fmt(barre)} kg)`;
  if (parCote.length === 0) return `barre ${fmt(barre)} à vide`;

  const cote = parCote
    .flatMap(({ poids, nombre }) => Array.from({ length: nombre }, () => fmt(poids)))
    .join(' · ');

  return `barre ${fmt(barre)} + ${cote} par côté${reste > 0 ? ` (${fmt(reste)} kg en trop)` : ''}`;
}
