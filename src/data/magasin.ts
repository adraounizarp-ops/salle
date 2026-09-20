import { signal } from '@preact/signals';
import * as db from './base';
import { REGLAGES_PAR_DEFAUT, type Reglages } from './base';
import { MODELES_DE_DEPART, historiqueDeDemonstration } from './demarrage';
import type { Modele, SeanceEnCours, SeanceFaite } from './modele';
import { prechargerIllustrations } from './precache';
import { tonnageExerciceFait, tonnageSeance } from './selection';

/**
 * Le magasin : l'état de l'application, et le seul endroit qui écrit dans la
 * base. Les écrans lisent des signaux et appellent des actions ; aucun d'eux
 * ne connaît Dexie.
 */

export const modeles = signal<Modele[]>([]);
export const historique = signal<SeanceFaite[]>([]);
export const enCours = signal<SeanceEnCours | null>(null);
export const reglages = signal<Reglages>(REGLAGES_PAR_DEFAUT);
export const pret = signal(false);

async function relireModeles() {
  const tous = await db.lireModeles();
  modeles.value = tous.sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
}

async function relireHistorique() {
  historique.value = await db.lireHistorique();
}

/** Au démarrage : on charge tout, et on sème les trois modèles au premier lancement. */
export async function demarrer(): Promise<void> {
  if (await db.baseVierge()) {
    for (const m of MODELES_DE_DEPART) await db.ecrireModele(m);
  }

  await Promise.all([relireModeles(), relireHistorique()]);
  reglages.value = await db.lireReglages();
  enCours.value = await db.lireEnCours();
  pret.value = true;

  // Sans attendre : l'app doit s'afficher, pas patienter sur une permission.
  void db.demanderPersistance();

  // Les favorites sont ce qu'on lancera en salle, souvent sans réseau.
  prechargerIllustrations(
    modeles.value.filter((m) => m.favorite).flatMap((m) => m.lignes.map((l) => l.slug)),
  );
}

// --- Modèles -----------------------------------------------------------------

export async function enregistrerModele(m: Modele): Promise<void> {
  const existe = modeles.value.some((x) => x.id === m.id);
  await db.ecrireModele({ ...m, ordre: m.ordre ?? (existe ? 0 : modeles.value.length) });
  await relireModeles();
  prechargerIllustrations(m.lignes.map((l) => l.slug));
}

export async function supprimerModele(id: string): Promise<void> {
  await db.effacerModele(id);
  await relireModeles();
}

export async function basculerFavorite(id: string): Promise<void> {
  const m = modeles.value.find((x) => x.id === id);
  if (!m) return;
  await db.ecrireModele({ ...m, favorite: !m.favorite });
  await relireModeles();
}

// --- Séance en cours ---------------------------------------------------------

/** Déplie un modèle en séance saisissable, avec ses références de tonnage. */
export function preparer(m: Modele): SeanceEnCours {
  prechargerIllustrations(m.lignes.map((l) => l.slug));
  const derniere = [...historique.value].reverse().find((s) => s.modeleId === m.id);

  const referenceExercice: Record<string, number> = {};
  for (const e of derniere?.exercices ?? []) referenceExercice[e.slug] = tonnageExerciceFait(e);

  return {
    modeleId: m.id,
    nom: m.nom,
    debut: Date.now(),
    exercices: m.lignes.map((l) => ({
      slug: l.slug,
      // Préremplies au haut de la fourchette et à la charge du modèle : un tap
      // sur « Valider » suffit quand la séance se passe comme prévu.
      series: Array.from({ length: l.series }, () => ({
        reps: l.reps[1],
        charge: l.charge,
        echauffement: false,
        faite: false,
      })),
    })),
    referenceExercice,
    referenceSeance: derniere ? tonnageSeance(derniere) : 0,
    reposParExercice: Object.fromEntries(m.lignes.map((l) => [l.slug, l.reposSec])),
  };
}

/**
 * Chaque frappe du pavé passe par ici. L'écriture est différée : on ne touche
 * la base qu'une fois la rafale de taps finie, mais assez tôt pour qu'une
 * fermeture de l'app ne perde rien.
 */
let differe: ReturnType<typeof setTimeout> | undefined;

export function majEnCours(s: SeanceEnCours | null): void {
  enCours.value = s;
  clearTimeout(differe);
  differe = setTimeout(() => void db.ecrireEnCours(s), 400);
}

/** Écrit tout de suite, sans attendre le délai. */
export async function viderLeDiffere(): Promise<void> {
  clearTimeout(differe);
  await db.ecrireEnCours(enCours.value);
}

export async function abandonner(): Promise<void> {
  clearTimeout(differe);
  enCours.value = null;
  await db.ecrireEnCours(null);
}

/** Clôt la séance en cours et la range dans l'historique. */
export async function terminer(note?: string): Promise<SeanceFaite | null> {
  const s = enCours.value;
  if (!s) return null;

  const faite: SeanceFaite = {
    id: `s${s.debut}`,
    modeleId: s.modeleId,
    nom: s.nom,
    date: Date.now(),
    dureeSec: Math.round((Date.now() - s.debut) / 1000),
    note: note?.trim() || undefined,
    // Les séries jamais validées ne sont pas des séries faites.
    exercices: s.exercices
      .map((e) => ({ ...e, series: e.series.filter((x) => x.faite) }))
      .filter((e) => e.series.length > 0),
  };

  clearTimeout(differe);
  await db.ecrireSeance(faite);
  await db.ecrireEnCours(null);
  enCours.value = null;
  await relireHistorique();
  return faite;
}

export async function supprimerSeance(id: string): Promise<void> {
  await db.effacerSeance(id);
  await relireHistorique();
}

// --- Réglages ----------------------------------------------------------------

export async function majReglages(modif: Partial<Reglages>): Promise<void> {
  const suivant = { ...reglages.value, ...modif };
  reglages.value = suivant;
  await db.ecrireReglages(suivant);
}

// --- Jeu de démonstration et remise à zéro -----------------------------------

/** Remplit un trimestre de séances pour essayer les écrans avec du contenu. */
export async function chargerDemonstration(): Promise<void> {
  for (const m of MODELES_DE_DEPART) await db.ecrireModele(m);
  for (const s of historiqueDeDemonstration()) await db.ecrireSeance(s);
  await Promise.all([relireModeles(), relireHistorique()]);
}

export async function remiseAZero(): Promise<void> {
  await db.toutEffacer();
  for (const m of MODELES_DE_DEPART) await db.ecrireModele(m);
  enCours.value = null;
  reglages.value = REGLAGES_PAR_DEFAUT;
  await Promise.all([relireModeles(), relireHistorique()]);
}

// --- Sauvegarde ---------------------------------------------------------------

export async function exporter(): Promise<Blob> {
  const donnees = await db.exporter();
  await majReglages({ dernierExport: donnees.exporteLe });
  return new Blob([JSON.stringify(donnees, null, 1)], { type: 'application/json' });
}

export async function importer(texte: string): Promise<{ modeles: number; seances: number }> {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new Error("Ce fichier n'est pas du JSON lisible.");
  }

  const bilan = await db.importer(brut);
  await Promise.all([relireModeles(), relireHistorique()]);
  reglages.value = await db.lireReglages();
  return bilan;
}

/** Un export vaut la peine d'être rappelé une fois par mois. */
export function exportDepasse(): boolean {
  const dernier = reglages.value.dernierExport;
  if (historique.value.length === 0) return false;
  return dernier === null || Date.now() - dernier > 30 * 86_400_000;
}
