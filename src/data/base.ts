import Dexie, { type EntityTable } from 'dexie';
import type { Modele, SeanceEnCours, SeanceFaite } from './modele';

/**
 * La base locale. Tout vit dans l'iPhone : aucun compte, aucun serveur, aucune
 * requête réseau à l'exécution.
 *
 * Les formes stockées sont exactement celles de `modele.ts` — pas de couche de
 * traduction, donc l'export JSON est lisible et réimportable tel quel.
 */

/** Réglages de l'application, une seule ligne. */
export interface Reglages {
  prenom: string;
  /** Poids de la barre olympique, en kg. */
  barre: number;
  /** Disques disponibles dans la salle, du plus lourd au plus léger. */
  disques: number[];
  /** Horodatage du dernier export, pour le rappel mensuel. */
  dernierExport: number | null;
}

export const REGLAGES_PAR_DEFAUT: Reglages = {
  prenom: '',
  barre: 20,
  disques: [25, 20, 15, 10, 5, 2.5, 1.25],
  dernierExport: null,
};

/**
 * Le fourre-tout à clé : réglages et séance en cours. Deux objets uniques qui
 * ne méritent pas chacun leur table.
 */
interface Entree {
  cle: string;
  valeur: unknown;
}

const base = new Dexie('salle') as Dexie & {
  modeles: EntityTable<Modele, 'id'>;
  seances: EntityTable<SeanceFaite, 'id'>;
  entrees: EntityTable<Entree, 'cle'>;
};

// `date` et `modeleId` sont indexés : l'historique se trie et se filtre dessus
// à chaque écran.
base.version(1).stores({
  modeles: 'id, nom, favorite',
  seances: 'id, date, modeleId',
  entrees: 'cle',
});

export { base };

// --- Accès ---------------------------------------------------------------

export const lireModeles = () => base.modeles.toArray();

/** L'historique, du plus ancien au plus récent : l'ordre que tout attend. */
export const lireHistorique = () => base.seances.orderBy('date').toArray();

export const ecrireModele = (m: Modele) => base.modeles.put(m);
export const effacerModele = (id: string) => base.modeles.delete(id);

export const ecrireSeance = (s: SeanceFaite) => base.seances.put(s);
export const effacerSeance = (id: string) => base.seances.delete(id);

async function lireEntree<T>(cle: string, defaut: T): Promise<T> {
  const e = await base.entrees.get(cle);
  return e === undefined ? defaut : (e.valeur as T);
}

const ecrireEntree = (cle: string, valeur: unknown) => base.entrees.put({ cle, valeur });

export const lireReglages = () =>
  lireEntree<Reglages>('reglages', REGLAGES_PAR_DEFAUT).then((r) => ({
    ...REGLAGES_PAR_DEFAUT,
    ...r,
  }));
export const ecrireReglages = (r: Reglages) => ecrireEntree('reglages', r);

export const lireEnCours = () => lireEntree<SeanceEnCours | null>('enCours', null);
export const ecrireEnCours = (s: SeanceEnCours | null) => ecrireEntree('enCours', s);

/** Vrai au tout premier lancement : rien n'a encore été écrit. */
export async function baseVierge(): Promise<boolean> {
  return (await base.modeles.count()) === 0 && (await base.seances.count()) === 0;
}

export async function toutEffacer(): Promise<void> {
  await base.transaction('rw', base.modeles, base.seances, base.entrees, async () => {
    await base.modeles.clear();
    await base.seances.clear();
    await base.entrees.clear();
  });
}

// --- Sauvegarde ----------------------------------------------------------

export interface Sauvegarde {
  format: 'salle';
  version: 1;
  exporteLe: number;
  modeles: Modele[];
  seances: SeanceFaite[];
  reglages: Reglages;
}

export async function exporter(): Promise<Sauvegarde> {
  return {
    format: 'salle',
    version: 1,
    exporteLe: Date.now(),
    modeles: await lireModeles(),
    seances: await lireHistorique(),
    reglages: await lireReglages(),
  };
}

/**
 * Remplace tout le contenu par celui de la sauvegarde. On écrase plutôt qu'on
 * fusionne : fusionner deux historiques sans clé stable inventerait des
 * séances en double, ce qui fausserait chaque comparaison de tonnage.
 */
export async function importer(brut: unknown): Promise<{ modeles: number; seances: number }> {
  const s = brut as Partial<Sauvegarde>;
  if (!s || s.format !== 'salle' || !Array.isArray(s.modeles) || !Array.isArray(s.seances)) {
    throw new Error("Ce fichier n'est pas une sauvegarde de Salle.");
  }

  await base.transaction('rw', base.modeles, base.seances, base.entrees, async () => {
    await base.modeles.clear();
    await base.seances.clear();
    await base.modeles.bulkPut(s.modeles as Modele[]);
    await base.seances.bulkPut(s.seances as SeanceFaite[]);
    if (s.reglages) await ecrireEntree('reglages', { ...REGLAGES_PAR_DEFAUT, ...s.reglages });
  });

  return { modeles: s.modeles.length, seances: s.seances.length };
}

/**
 * Demande à iOS de ne pas purger le stockage. Sans cela, Safari efface les
 * données d'un site non visité pendant sept jours ; une app installée sur
 * l'écran d'accueil en est exemptée, et cet appel renforce la protection.
 */
export async function demanderPersistance(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}
