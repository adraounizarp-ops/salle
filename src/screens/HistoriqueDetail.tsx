import {
  formatCharge,
  formatNombre,
  pluriel,
  produitTonnage,
  seriesDures,
} from '../data/metriques';
import { fiche, type SeanceFaite } from '../data/modele';
import {
  dateLongue,
  densite,
  seriesSeance,
  tonnageExerciceFait,
  tonnageSeance,
} from '../data/selection';
import { BarreChargee } from '../ui/BarreChargee';
import { Chiffre } from '../ui/Chiffre';
import { Ecran, Section } from '../ui/Ecran';
import { Icone } from '../ui/Icone';
import { Illustration } from '../ui/Illustration';
import './historique-detail.css';

interface Props {
  seance: SeanceFaite;
  historique: SeanceFaite[];
  onRetour: () => void;
  onRefaire: () => void;
  onSupprimer: () => void;
}

export function HistoriqueDetail({ seance, historique, onRetour, onRefaire, onSupprimer }: Props) {
  const tonnage = tonnageSeance(seance);

  // La même séance, la fois d'avant.
  const precedente = historique
    .filter((s) => s.modeleId === seance.modeleId && s.date < seance.date)
    .sort((a, b) => b.date - a.date)[0];
  const reference = precedente ? tonnageSeance(precedente) : 0;

  const troncons = seance.exercices
    .map((e) => ({ id: e.slug, libelle: fiche(e.slug).nomFr, tonnage: tonnageExerciceFait(e) }))
    .filter((t) => t.tonnage > 0);

  const minutes = Math.round(seance.dureeSec / 60);
  const series = seriesSeance(seance);

  return (
    <Ecran
      surtitre={dateLongue(new Date(seance.date))}
      titre={seance.nom}
      onRetour={onRetour}
      pied={
        <button type="button" class="bouton bouton--vert bouton--plein" onClick={onRefaire}>
          <Icone nom="lecture" taille={16} pleine />
          Refaire cette séance
        </button>
      }
    >
      <div class="carte carte--hero">
        <Chiffre
          valeur={tonnage}
          ecart={reference ? tonnage - reference : undefined}
          reference="vs la fois d'avant"
        />
        <div class="carte__barre">
          <BarreChargee
            troncons={troncons}
            reference={reference}
            libelleReference={precedente ? 'exécution précédente' : undefined}
          />
        </div>
      </div>

      <ul class="stats stats--detail">
        <li class="stats__case">
          <span class="stats__valeur donnee">{minutes}</span>
          <span class="stats__nom">{pluriel(minutes, 'minute')}</span>
        </li>
        <li class="stats__case">
          <span class="stats__valeur donnee">{series}</span>
          <span class="stats__nom">{pluriel(series, 'série')} dures</span>
        </li>
        <li class="stats__case">
          <span class="stats__valeur donnee">{formatNombre(densite(seance))}</span>
          <span class="stats__nom">kg / minute</span>
        </li>
      </ul>

      {seance.note && (
        <aside class="note">
          <p class="etiquette">Note de fin de séance</p>
          <p class="note__texte">{seance.note}</p>
        </aside>
      )}

      <Section titre={`${seance.exercices.length} ${pluriel(seance.exercices.length, 'exercice')}`}>
        <ul class="detail-exos">
          {seance.exercices.map((e) => {
            const f = fiche(e.slug);
            const t = tonnageExerciceFait(e);
            return (
              <li key={e.slug} class="detail-exo">
                <div class="detail-exo__tete">
                  <Illustration slug={f.slug} nom={f.nomFr} taille={36} />
                  <div class="detail-exo__nommage">
                    <p class="detail-exo__nom">{f.nomFr}</p>
                    <p class="detail-exo__meta">
                      {seriesDures(e.series)} {pluriel(seriesDures(e.series), 'série')}
                      {produitTonnage(f.type) ? ` · ${formatNombre(t)} kg` : ''}
                    </p>
                  </div>
                </div>

                <ol class="detail-series">
                  {e.series.map((s, j) => (
                    <li key={j} class="detail-serie" data-echauffement={s.echauffement}>
                      <span class="detail-serie__rang mono">
                        {s.echauffement
                          ? 'W'
                          : e.series.slice(0, j + 1).filter((x) => !x.echauffement).length}
                      </span>
                      <span class="detail-serie__valeurs mono">
                        {s.reps} × {formatCharge(s.charge)}
                        <span class="detail-serie__unite">{f.leste ? 'lest' : 'kg'}</span>
                      </span>
                      {s.rpe !== undefined && <span class="detail-serie__rpe">RPE {s.rpe}</span>}
                      <span class="detail-serie__tonnage mono">
                        {s.echauffement || !produitTonnage(f.type)
                          ? '·'
                          : formatNombre(s.reps * s.charge)}
                      </span>
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section>
        <button
          type="button"
          class="bouton bouton--corail bouton--plein"
          onClick={() => {
            const texte =
              "Supprimer cette séance de l'historique ? Les comparaisons de tonnage en tiendront compte.";
            if (confirm(texte)) onSupprimer();
          }}
        >
          <Icone nom="corbeille" taille={16} />
          Supprimer cette séance
        </button>
      </Section>
    </Ecran>
  );
}
