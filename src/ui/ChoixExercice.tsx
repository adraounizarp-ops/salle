import { useMemo, useState } from 'preact/hooks';
import { EXERCICES, type FicheExercice } from '../data/modele';
import { Icone } from './Icone';
import { Illustration } from './Illustration';
import './choix-exercice.css';

const sansAccents = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const MATERIELS = ['Barre', 'Haltères', 'Poulie', 'Machine', 'Poids du corps', 'Élastique', 'Kettlebell'];

interface Props {
  /** Slugs déjà dans la séance : on les marque plutôt que de les cacher. */
  dejaLa?: string[];
  onChoisir: (f: FicheExercice) => void;
  onFermer: () => void;
}

/**
 * Le sélecteur d'exercices, en plein écran.
 *
 * La recherche ignore les accents et regarde les deux langues : l'exercice vu
 * sur une vidéo en anglais se retrouve sans traduire.
 */
export function ChoixExercice({ dejaLa = [], onChoisir, onFermer }: Props) {
  const [texte, setTexte] = useState('');
  const [materiel, setMateriel] = useState<string | null>(null);

  const resultats = useMemo(() => {
    const q = sansAccents(texte.trim());
    return EXERCICES.filter((e) => {
      if (materiel && e.materiel !== materiel) return false;
      if (!q) return true;
      return sansAccents(`${e.nomFr} ${e.nomEn} ${e.muscle} ${e.materiel}`).includes(q);
    }).slice(0, 80);
  }, [texte, materiel]);

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

        <div class="choix__filtres bande-h">
          {MATERIELS.map((m) => (
            <button
              key={m}
              type="button"
              class="filtre"
              data-actif={materiel === m}
              aria-pressed={materiel === m}
              onClick={() => setMateriel(materiel === m ? null : m)}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      <ul class="choix__liste">
        {resultats.map((e) => {
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
        })}

        {resultats.length === 0 && (
          <li class="choix__vide">
            <p class="vide__titre">Aucun exercice</p>
            <p class="vide__texte">Essaie un autre mot, ou retire le filtre de matériel.</p>
          </li>
        )}
      </ul>
    </div>
  );
}
