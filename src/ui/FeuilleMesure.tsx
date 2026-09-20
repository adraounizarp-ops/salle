import { useRef, useState } from 'preact/hooks';
import { poidsKo, reduirePhoto } from '../data/photo';
import { CHAMPS_MESURE, type CleMesure, type Mesure } from '../data/modele';
import { Feuille } from './Feuille';
import { Icone } from './Icone';
import './feuille-mesure.css';

interface Props {
  /** Le relevé qu'on reprend, ou rien pour en créer un. */
  mesure?: Mesure;
  /** Le relevé précédent : ses valeurs servent de repère gris dans les champs. */
  precedent?: Mesure;
  onEnregistrer: (m: Mesure) => void;
  onFermer: () => void;
}

const jourISO = (t: number) => {
  const d = new Date(t);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

/** « 78,4 » comme « 78.4 » : la virgule est ce qu'on tape sur un clavier français. */
const nombre = (texte: string): number | undefined => {
  const n = Number(texte.replace(',', '.').trim());
  return texte.trim() === '' || !Number.isFinite(n) || n <= 0 ? undefined : n;
};

const texteDe = (v: number | undefined) => (v === undefined ? '' : String(v).replace('.', ','));

/**
 * La saisie d'un relevé.
 *
 * Champs libres plutôt que le pavé de séance : celui-ci compte en répétitions
 * entières, alors qu'un poids se note à la centaine de grammes. Aucun champ
 * n'est requis, et la feuille ne le dit pas — on remplit ce qu'on a mesuré, le
 * reste reste vide.
 */
export function FeuilleMesure({ mesure, precedent, onEnregistrer, onFermer }: Props) {
  const [date, setDate] = useState(jourISO(mesure?.date ?? Date.now()));
  const [valeurs, setValeurs] = useState<Record<string, string>>(() =>
    Object.fromEntries(CHAMPS_MESURE.map((c) => [c.cle, texteDe(mesure?.[c.cle])])),
  );
  const [photo, setPhoto] = useState(mesure?.photo);
  const [erreur, setErreur] = useState<string | null>(null);
  const fichier = useRef<HTMLInputElement>(null);

  const chiffres = Object.fromEntries(
    CHAMPS_MESURE.map((c) => [c.cle, nombre(valeurs[c.cle] ?? '')]),
  ) as Record<CleMesure, number | undefined>;

  const rempli = Object.values(chiffres).some((v) => v !== undefined) || Boolean(photo);

  const prendrePhoto = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    (e.target as HTMLInputElement).value = '';
    if (!f) return;
    setErreur(null);
    try {
      setPhoto(await reduirePhoto(f));
    } catch {
      setErreur("Cette photo n'a pas pu être lue.");
    }
  };

  const enregistrer = () => {
    // Midi plutôt que minuit : un relevé daté du jour ne doit pas basculer la
    // veille selon le fuseau au moment de la relecture.
    const [a, m, j] = date.split('-').map(Number);
    const quand = new Date(a, m - 1, j, 12).getTime();

    onEnregistrer({
      id: mesure?.id ?? `me${Date.now()}`,
      date: quand,
      ...chiffres,
      photo,
    });
  };

  return (
    <Feuille
      titre={mesure ? 'Modifier le relevé' : 'Nouveau relevé'}
      onFermer={onFermer}
      pied={
        <button
          type="button"
          class="bouton bouton--vert bouton--plein"
          disabled={!rempli}
          onClick={enregistrer}
        >
          Enregistrer le relevé
        </button>
      }
    >
      <div class="mesure">
        <label class="champ">
          <span class="etiquette">Date</span>
          <input
            class="champ__saisie"
            type="date"
            value={date}
            max={jourISO(Date.now())}
            onInput={(e) => setDate((e.target as HTMLInputElement).value)}
          />
        </label>

        <div class="mesure__grille">
          {CHAMPS_MESURE.map((c) => (
            <label key={c.cle} class="champ">
              <span class="etiquette">
                {c.nom} · {c.unite}
              </span>
              <input
                class="champ__saisie donnee"
                type="text"
                inputMode="decimal"
                enterKeyHint="next"
                placeholder={texteDe(precedent?.[c.cle]) || '—'}
                value={valeurs[c.cle]}
                onInput={(e) => {
                  const v = (e.target as HTMLInputElement).value;
                  // Forme fonctionnelle : deux champs modifiés dans le même
                  // tour — collage, remplissage automatique — se perdraient
                  // l'un l'autre en repartant d'un instantané périmé.
                  setValeurs((precedentes) => ({ ...precedentes, [c.cle]: v }));
                }}
              />
            </label>
          ))}
        </div>

        <div class="mesure__photo">
          {photo ? (
            <figure class="mesure__vignette">
              <img src={photo} alt="Photo de suivi" />
              <figcaption class="mesure__poids">{poidsKo(photo)} ko</figcaption>
              <button
                type="button"
                class="mesure__retirer"
                onClick={() => setPhoto(undefined)}
                aria-label="Retirer la photo"
              >
                <Icone nom="croix" taille={16} />
              </button>
            </figure>
          ) : (
            <button
              type="button"
              class="bouton bouton--fantome bouton--plein"
              onClick={() => fichier.current?.click()}
            >
              <Icone nom="appareil" taille={16} />
              Ajouter une photo
            </button>
          )}

          <input
            ref={fichier}
            type="file"
            accept="image/*"
            class="mesure__fichier"
            onChange={prendrePhoto}
          />
        </div>

        {erreur && <p class="mesure__erreur">{erreur}</p>}
      </div>
    </Feuille>
  );
}
