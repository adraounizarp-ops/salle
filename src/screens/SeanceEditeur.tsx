import { useState } from 'preact/hooks';
import { comparer, formatCharge, formatNombre, produitTonnage } from '../data/metriques';
import { fiche, type FicheExercice, type LigneModele, type Modele, type SeanceFaite } from '../data/modele';
import { derniereDe, exercicesConnus, tonnageSeance } from '../data/selection';
import { ChoixExercice } from '../ui/ChoixExercice';
import { Confirmation } from '../ui/Confirmation';
import { Ecran, Section } from '../ui/Ecran';
import { Feuille } from '../ui/Feuille';
import { Icone } from '../ui/Icone';
import { Illustration } from '../ui/Illustration';
import { Reglette } from '../ui/Reglette';
import './seance-editeur.css';

interface Props {
  modele: Modele;
  historique: SeanceFaite[];
  /** Tous les modèles : le sélecteur y puise le répertoire déjà pratiqué. */
  modeles: Modele[];
  /** true quand on part d'une séance vide. */
  nouvelle?: boolean;
  onAnnuler: () => void;
  onEnregistrer: (m: Modele) => void;
  /** Absent sur une séance qu'on vient de créer : il n'y a rien à supprimer. */
  onSupprimer?: () => void;
}

/** Le tonnage visé : les séries prévues au haut de la fourchette de répétitions. */
const tonnagePrevu = (lignes: LigneModele[]) =>
  lignes.reduce(
    (t, l) => t + (produitTonnage(fiche(l.slug).type) ? l.series * l.reps[1] * l.charge : 0),
    0,
  );

export function SeanceEditeur({
  modele,
  historique,
  modeles,
  nouvelle,
  onAnnuler,
  onEnregistrer,
  onSupprimer,
}: Props) {
  const [nom, setNom] = useState(modele.nom);
  const [lignes, setLignes] = useState<LigneModele[]>(modele.lignes.map((l) => ({ ...l })));
  const [choix, setChoix] = useState(false);
  const [aSupprimer, setASupprimer] = useState(false);
  const [regle, setRegle] = useState<number | null>(null);

  const derniere = derniereDe(historique, modele.id);
  const reference = derniere ? tonnageSeance(derniere) : 0;
  const prevu = tonnagePrevu(lignes);
  const comparaison = comparer(prevu, reference);

  const majLigne = (i: number, modif: Partial<LigneModele>) =>
    setLignes((ls) => ls.map((l, j) => (i === j ? { ...l, ...modif } : l)));

  const deplacer = (i: number, pas: -1 | 1) =>
    setLignes((ls) => {
      const j = i + pas;
      if (j < 0 || j >= ls.length) return ls;
      const copie = [...ls];
      [copie[i], copie[j]] = [copie[j], copie[i]];
      return copie;
    });

  const ajouter = (f: FicheExercice) => {
    setLignes((ls) => [
      ...ls,
      { slug: f.slug, series: 3, reps: [8, 12], charge: produitTonnage(f.type) ? 20 : 0, reposSec: 90 },
    ]);
    setChoix(false);
  };

  const retirer = (i: number) => {
    setLignes((ls) => ls.filter((_, j) => j !== i));
    setRegle(null);
  };

  const valide = nom.trim().length > 0 && lignes.length > 0;

  return (
    <>
      <Ecran
        surtitre={nouvelle ? 'Nouvelle séance' : 'Modifier'}
        titre={nouvelle ? 'Composer la séance' : nom}
        onRetour={onAnnuler}
        pied={
          <div class="editeur__pied">
            <div class="editeur__verdict" data-etat={comparaison.etat}>
              <div>
                <p class="etiquette">Tonnage prévu</p>
                <p class="editeur__prevu donnee">
                  {formatNombre(prevu)} <span class="editeur__unite">kg</span>
                </p>
              </div>
              <p class="editeur__phrase">
                {reference === 0
                  ? 'Première version de cette séance.'
                  : comparaison.etat === 'derriere'
                    ? `${formatNombre(Math.abs(comparaison.ecart))} kg sous la dernière fois (${formatNombre(reference)} kg).`
                    : `${formatNombre(Math.abs(comparaison.ecart))} kg au-dessus de la dernière fois.`}
              </p>
            </div>

            <button
              type="button"
              class="bouton bouton--vert bouton--plein"
              disabled={!valide}
              onClick={() => onEnregistrer({ ...modele, nom: nom.trim(), lignes })}
            >
              Enregistrer
            </button>
          </div>
        }
      >
        <label class="champ">
          <span class="etiquette">Nom de la séance</span>
          <input
            class="champ__saisie"
            value={nom}
            placeholder="Push A"
            onInput={(e) => setNom((e.target as HTMLInputElement).value)}
          />
        </label>

        <Section titre={`${lignes.length} exercice${lignes.length > 1 ? 's' : ''}`}>
          {lignes.length === 0 ? (
            <div class="vide">
              <p class="vide__titre">Séance vide</p>
              <p class="vide__texte">Ajoute un premier exercice pour commencer.</p>
            </div>
          ) : (
            <ol class="edit-liste">
              {lignes.map((l, i) => {
                const f = fiche(l.slug);
                return (
                  <li key={`${l.slug}-${i}`}>
                    <button type="button" class="edit-ligne pressable" onClick={() => setRegle(i)}>
                      <span class="edit-ligne__rang donnee">{i + 1}</span>
                      <Illustration slug={f.slug} nom={f.nomFr} taille={38} />
                      <span class="edit-ligne__nommage">
                        <span class="edit-ligne__nom">{f.nomFr}</span>
                        <span class="edit-ligne__sous">
                          {l.series} séries · {l.reps[0]}–{l.reps[1]} reps
                          {produitTonnage(f.type) ? ` · ${formatCharge(l.charge)} kg` : ''} ·{' '}
                          {l.reposSec} s
                        </span>
                      </span>
                      <span class="edit-ligne__chevron">
                        <Icone nom="chevron-droit" taille={18} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          <button type="button" class="ajouter" onClick={() => setChoix(true)}>
            <Icone nom="plus" taille={18} />
            Ajouter un exercice
          </button>
        </Section>

        {onSupprimer && (
          <Section>
            <button
              type="button"
              class="bouton bouton--corail bouton--plein"
              onClick={() => setASupprimer(true)}
            >
              <Icone nom="corbeille" taille={16} />
              Supprimer la séance
            </button>
          </Section>
        )}
      </Ecran>

      {aSupprimer && onSupprimer && (
        <Confirmation
          titre={`Supprimer « ${modele.nom} » ?`}
          texte="Le modèle disparaît de tes séances. L'historique des exécutions déjà faites est conservé."
          action="Supprimer la séance"
          icone="corbeille"
          onConfirmer={onSupprimer}
          onFermer={() => setASupprimer(false)}
        />
      )}

      {choix && (
        <ChoixExercice
          dejaLa={lignes.map((l) => l.slug)}
          connus={exercicesConnus(historique, modeles)}
          onChoisir={ajouter}
          onFermer={() => setChoix(false)}
        />
      )}

      {regle !== null && lignes[regle] && (
        <ReglageExercice
          ligne={lignes[regle]}
          index={regle}
          total={lignes.length}
          onModifier={(m) => majLigne(regle, m)}
          onDeplacer={(pas) => {
            deplacer(regle, pas);
            setRegle(regle + pas);
          }}
          onRetirer={() => retirer(regle)}
          onFermer={() => setRegle(null)}
        />
      )}
    </>
  );
}

// --- La feuille de réglage d'un exercice -------------------------------------

interface ReglageProps {
  ligne: LigneModele;
  index: number;
  total: number;
  onModifier: (m: Partial<LigneModele>) => void;
  onDeplacer: (pas: -1 | 1) => void;
  onRetirer: () => void;
  onFermer: () => void;
}

function ReglageExercice({
  ligne,
  index,
  total,
  onModifier,
  onDeplacer,
  onRetirer,
  onFermer,
}: ReglageProps) {
  const f = fiche(ligne.slug);

  return (
    <Feuille titre={f.nomFr} sous={`${f.nomEn} · ${f.materiel}`} onFermer={onFermer}>
      <div class="reglage">
        <Reglette
          nom="Séries"
          valeur={ligne.series}
          pas={1}
          min={1}
          max={10}
          onChange={(v) => onModifier({ series: v })}
        />

        <Reglette
          nom="Répétitions min"
          valeur={ligne.reps[0]}
          pas={1}
          min={1}
          max={ligne.reps[1]}
          onChange={(v) => onModifier({ reps: [v, ligne.reps[1]] })}
        />

        <Reglette
          nom="Répétitions max"
          suffixeValeur="toutes les séries au max : +2,5 kg"
          valeur={ligne.reps[1]}
          pas={1}
          min={ligne.reps[0]}
          max={40}
          onChange={(v) => onModifier({ reps: [Math.min(ligne.reps[0], v), v] })}
        />

        {produitTonnage(f.type) && (
          <Reglette
            nom={f.leste ? 'Lest' : 'Charge'}
            unite="kg"
            valeur={ligne.charge}
            pas={2.5}
            min={0}
            max={400}
            onChange={(v) => onModifier({ charge: v })}
          />
        )}

        <Reglette
          nom="Repos"
          unite="s"
          valeur={ligne.reposSec}
          pas={15}
          min={15}
          max={300}
          onChange={(v) => onModifier({ reposSec: v })}
        />

        <div class="reglage__ordre">
          <button
            type="button"
            class="bouton bouton--fantome"
            disabled={index === 0}
            onClick={() => onDeplacer(-1)}
          >
            Monter
          </button>
          <button
            type="button"
            class="bouton bouton--fantome"
            disabled={index === total - 1}
            onClick={() => onDeplacer(1)}
          >
            Descendre
          </button>
        </div>

        <button type="button" class="bouton bouton--corail bouton--plein" onClick={onRetirer}>
          <Icone nom="corbeille" taille={16} />
          Retirer de la séance
        </button>
      </div>
    </Feuille>
  );
}
