import { useMemo, useState } from 'preact/hooks';
import { EXERCICES, GROUPES, fiche, type FicheExercice } from '../data/modele';
import { BandeH } from './BandeH';
import { Icone } from './Icone';
import { Illustration } from './Illustration';
import './choix-exercice.css';

const sansAccents = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Au-delà, la liste ne sert plus à rien : on affine la recherche. */
const PLAFOND = 80;

interface Props {
  /** Slugs déjà dans la séance : on les marque plutôt que de les cacher. */
  dejaLa?: string[];
  /** Ce qu'on pratique déjà, du plus récent au plus ancien. */
  connus?: string[];
  onChoisir: (f: FicheExercice) => void;
  onFermer: () => void;
}

/**
 * Le sélecteur d'exercices, en plein écran.
 *
 * Le catalogue en compte 302 ; dans les faits on refait toujours les mêmes.
 * Sans recherche ni filtre, la liste s'ouvre donc sur son répertoire personnel
 * plutôt que sur les abducteurs à la machine, premiers dans l'alphabet.
 *
 * La recherche ignore les accents et regarde les deux langues, plus le muscle
 * et le matériel : l'exercice vu sur une vidéo en anglais se retrouve sans
 * traduire, et « poulie » ramène tout ce qui s'y accroche.
 */
export function ChoixExercice({ dejaLa = [], connus = [], onChoisir, onFermer }: Props) {
  const [texte, setTexte] = useState('');
  const [groupe, setGroupe] = useState<string | null>(null);

  const q = sansAccents(texte.trim());
  const filtre = Boolean(q) || Boolean(groupe);

  const correspond = useMemo(
    () => (e: FicheExercice) => {
      if (groupe && e.groupe !== groupe) return false;
      if (!q) return true;
      return sansAccents(`${e.nomFr} ${e.nomEn} ${e.muscle} ${e.materiel}`).includes(q);
    },
    [q, groupe],
  );

  // Le répertoire personnel n'a de sens qu'en vue d'ensemble : dès qu'on
  // cherche ou qu'on filtre, on veut le catalogue entier, sans doublon en tête.
  const repertoire = useMemo(() => {
    if (filtre) return [];
    return connus
      .filter((slug) => EXERCICES.some((e) => e.slug === slug))
      .map((slug) => fiche(slug));
  }, [connus, filtre]);

  const resultats = useMemo(() => {
    const deja = new Set(repertoire.map((e) => e.slug));
    return EXERCICES.filter((e) => !deja.has(e.slug) && correspond(e)).slice(0, PLAFOND);
  }, [correspond, repertoire]);

  const ligne = (e: FicheExercice) => {
    const deja = dejaLa.includes(e.slug);
    return (
      <li key={e.slug}>
        <button type="button" class="choix__item pressable" onClick={() => onChoisir(e)}>
          <Illustration slug={e.slug} nom={e.nomFr} taille={40} />
          <span class="choix__nommage">
            <span class="choix__nom">{e.nomFr}</span>
            <span class="choix__sous">
              {e.nomEn} · {e.muscle} · {e.materiel}
            </span>
          </span>
          <span class="choix__marque" data-deja={deja}>
            <Icone nom={deja ? 'coche' : 'plus'} taille={18} />
          </span>
        </button>
      </li>
    );
  };

  return (
    <div class="choix">
      <header class="choix__entete">
        <div class="choix__barre">
          <span class="choix__loupe">
            <Icone nom="recherche" taille={18} />
          </span>
          <input
            class="choix__recherche"
            type="search"
            placeholder="Chercher un exercice"
            value={texte}
            onInput={(e) => setTexte((e.target as HTMLInputElement).value)}
            autoFocus
          />
          <button type="button" class="choix__fermer" onClick={onFermer}>
            Fermer
          </button>
        </div>

        <BandeH class="choix__filtres">
          {GROUPES.map((g) => (
            <button
              key={g.id}
              type="button"
              class="filtre"
              data-actif={groupe === g.id}
              aria-pressed={groupe === g.id}
              onClick={() => setGroupe(groupe === g.id ? null : g.id)}
            >
              {g.nom}
            </button>
          ))}
        </BandeH>
      </header>

      <ul class="choix__liste">
        {repertoire.length > 0 && (
          <>
            <li class="choix__rubrique">
              <span class="etiquette">Tes exercices</span>
            </li>
            {repertoire.map(ligne)}
            <li class="choix__rubrique">
              <span class="etiquette">Tout le catalogue</span>
            </li>
          </>
        )}

        {resultats.map(ligne)}

        {repertoire.length === 0 && resultats.length === 0 && (
          <li class="choix__vide">
            <p class="vide__titre">Aucun exercice</p>
            <p class="vide__texte">Essaie un autre mot, ou retire le filtre de muscle.</p>
          </li>
        )}
      </ul>
    </div>
  );
}
