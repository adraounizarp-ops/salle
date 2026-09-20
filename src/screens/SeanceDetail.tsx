import { comparer, formatCharge, formatNombre, pluriel, produitTonnage } from '../data/metriques';
import { fiche, type Modele, type SeanceFaite } from '../data/modele';
import { derniereDe, ilYA, nombreDe, serieTonnage, tonnageSeance } from '../data/selection';
import { Courbe } from '../charts/Courbe';
import { Ecran, Section } from '../ui/Ecran';
import { Icone } from '../ui/Icone';
import { Illustration } from '../ui/Illustration';
import './seance-detail.css';

interface Props {
  modele: Modele;
  historique: SeanceFaite[];
  onRetour: () => void;
  onFavorite: () => void;
  onModifier: () => void;
  onDemarrer: () => void;
}

const moyenneMobile = (v: number[], n: number) =>
  v.map((_, i) => {
    const t = v.slice(Math.max(0, i - n + 1), i + 1);
    return t.reduce((s, x) => s + x, 0) / t.length;
  });

export function SeanceDetail({ modele, historique, onRetour, onFavorite, onModifier, onDemarrer }: Props) {
  const derniere = derniereDe(historique, modele.id);
  const fois = nombreDe(historique, modele.id);
  const tonnages = serieTonnage(historique, modele.id);

  const tonnageVise = modele.lignes.reduce(
    (t, l) => t + (produitTonnage(fiche(l.slug).type) ? l.series * l.reps[1] * l.charge : 0),
    0,
  );

  // La même mise en garde que dans l'éditeur : une séance dont le programme
  // est passé sous la dernière exécution doit se voir ici aussi, sinon on la
  // lance sans savoir qu'on part perdant.
  const reference = derniere ? tonnageSeance(derniere) : 0;
  const comparaison = comparer(tonnageVise, reference);

  const dureeMoy = fois
    ? Math.round(
        historique.filter((s) => s.modeleId === modele.id).reduce((t, s) => t + s.dureeSec, 0) / fois / 60,
      )
    : 0;

  return (
    <Ecran
      surtitre="Séance"
      titre={modele.nom}
      onRetour={onRetour}
      action={
        <button
          type="button"
          class="bouton-rond"
          data-actif={modele.favorite}
          onClick={onFavorite}
          aria-pressed={modele.favorite}
          aria-label={modele.favorite ? 'Retirer des favorites' : 'Mettre en favorite'}
        >
          <Icone nom="etoile" taille={20} pleine={modele.favorite} />
        </button>
      }
      pied={
        <div class="detail__actions">
          <button type="button" class="bouton bouton--fantome" onClick={onModifier}>
            Modifier
          </button>
          <button type="button" class="bouton bouton--vert bouton--plein" onClick={onDemarrer}>
            <Icone nom="lecture" taille={16} pleine />
            Démarrer
          </button>
        </div>
      }
    >
      <ul class="stats">
        <li class="stats__case">
          <span class="stats__valeur donnee">{fois}</span>
          <span class="stats__nom">{pluriel(fois, 'fois réalisée', 'fois réalisées')}</span>
        </li>
        <li class="stats__case">
          <span class="stats__valeur donnee">{derniere ? formatNombre(tonnageSeance(derniere)) : '—'}</span>
          <span class="stats__nom">kg la dernière fois</span>
        </li>
        <li class="stats__case">
          <span class="stats__valeur donnee">{dureeMoy || '—'}</span>
          <span class="stats__nom">min en moyenne</span>
        </li>
      </ul>

      {derniere && <p class="detail__quand">Dernière exécution {ilYA(derniere.date)}</p>}

      {comparaison.etat === 'derriere' && (
        <p class="detail__manque">
          Le programme vise {formatNombre(Math.abs(comparaison.ecart))} kg sous la dernière
          exécution ({formatNombre(reference)} kg). Monte une charge ou ajoute une série avant de
          partir.
        </p>
      )}

      <Section
        titre={`${modele.lignes.length} ${pluriel(modele.lignes.length, 'exercice')}`}
        suffixe={
          <span class="section__compte donnee" data-etat={comparaison.etat}>
            {formatNombre(tonnageVise)} kg visés
          </span>
        }
      >
        <ol class="exos">
          {modele.lignes.map((l, i) => {
            const f = fiche(l.slug);
            return (
              <li key={l.slug} class="exo">
                <span class="exo__rang donnee">{i + 1}</span>
                <Illustration slug={f.slug} nom={f.nomFr} taille={40} />
                <span class="exo__nommage">
                  <span class="exo__nom">{f.nomFr}</span>
                  <span class="exo__sous">
                    {f.nomEn} · {f.materiel}
                  </span>
                </span>
                <span class="exo__cible">
                  <span class="exo__series donnee">
                    {l.series} × {l.reps[0]}–{l.reps[1]}
                  </span>
                  <span class="exo__charge donnee">
                    {produitTonnage(f.type) ? `${formatCharge(l.charge)} kg` : '—'}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </Section>

      {tonnages.length >= 3 && (
        <Section titre="Évolution du tonnage">
          <div class="carte">
            <Courbe
              titre={`${fois} ${pluriel(fois, 'exécution')}`}
              points={tonnages.map((v, i) => ({ etiquette: `${i + 1}`, valeur: v }))}
              tendance={moyenneMobile(tonnages, 3)}
            />
          </div>
        </Section>
      )}
    </Ecran>
  );
}
