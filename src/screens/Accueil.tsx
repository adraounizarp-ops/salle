import { formatDuree, formatNombre } from '../data/metriques';
import { MODELES, PRENOM } from '../data/demo';
import { fiche, type Modele, type SeanceEnCours, type SeanceFaite } from '../data/modele';
import {
  dateLongue,
  derniereDe,
  grilleDuMois,
  ilYA,
  nomMois,
  recordsRecents,
  seancesDuMois,
  tonnageFenetre,
  tonnageSeance,
  volumeParGroupe,
} from '../data/selection';
import { BarreChargee } from '../ui/BarreChargee';
import { CarteFavorite } from '../ui/CarteSeance';
import { Chiffre } from '../ui/Chiffre';
import { Ecran, Section } from '../ui/Ecran';
import { GrilleMois } from '../ui/GrillePoints';
import { Icone } from '../ui/Icone';
import './accueil.css';

interface Props {
  historique: SeanceFaite[];
  enCours: SeanceEnCours | null;
  onReglages: () => void;
  onReprendre: () => void;
  onDemarrer: (m: Modele) => void;
  onSeance: (s: SeanceFaite) => void;
  onToutesLesSeances: () => void;
  onHistorique: () => void;
}

export function Accueil({
  historique,
  enCours,
  onReglages,
  onReprendre,
  onDemarrer,
  onSeance,
  onToutesLesSeances,
  onHistorique,
}: Props) {
  const maintenant = new Date();

  // --- Tonnage des 7 derniers jours, contre les 7 jours d'avant
  const semaine = tonnageFenetre(historique, 7, 0);
  const semainePrecedente = tonnageFenetre(historique, 7, 1);

  // Un tronçon par séance de la semaine : on voit d'où vient le volume.
  const troncons = historique
    .filter((s) => s.date > Date.now() - 7 * 86_400_000)
    .sort((a, b) => a.date - b.date)
    .map((s) => ({ id: s.id, libelle: s.nom, tonnage: tonnageSeance(s) }));

  // --- Le mois en cours
  const cases = grilleDuMois(historique, maintenant.getFullYear(), maintenant.getMonth());
  const duMois = seancesDuMois(historique, maintenant.getFullYear(), maintenant.getMonth());

  const favorites = MODELES.filter((m) => m.favorite);
  const recents = recordsRecents(historique, 45).slice(0, 3);
  const volume = volumeParGroupe(historique, 7).slice(0, 4);
  const maxSeries = Math.max(1, ...volume.map((v) => v.series));

  return (
    <Ecran
      surtitre={dateLongue(maintenant)}
      titre={`Bonjour, ${PRENOM}`}
      action={
        <button type="button" class="bouton-rond" onClick={onReglages} aria-label="Réglages">
          <Icone nom="reglages" taille={20} />
        </button>
      }
    >
      {enCours && (
        <button type="button" class="reprendre" onClick={onReprendre}>
          <span class="reprendre__icone">
            <Icone nom="lecture" taille={18} pleine />
          </span>
          <span class="reprendre__texte">
            <span class="reprendre__nom">Reprendre {enCours.nom}</span>
            <span class="reprendre__meta">séance en cours</span>
          </span>
          <span class="reprendre__chrono mono">
            {formatDuree(Math.floor((Date.now() - enCours.debut) / 1000))}
          </span>
        </button>
      )}

      <Section titre="Tonnage · 7 derniers jours">
        <div class="carte carte--hero">
          <Chiffre
            valeur={semaine}
            ecart={semaine - semainePrecedente}
            reference="vs 7 jours avant"
          />
          <div class="carte__barre">
            <BarreChargee
              troncons={troncons}
              reference={semainePrecedente}
              libelleReference="semaine précédente"
            />
          </div>
        </div>
      </Section>

      <Section
        titre={nomMois(maintenant.getMonth())}
        suffixe={
          <span class="section__compte donnee">
            {duMois.length} séance{duMois.length > 1 ? 's' : ''}
          </span>
        }
      >
        <div class="carte">
          <GrilleMois cases={cases} onJour={(j) => onSeance(j.seances[0])} />
        </div>
      </Section>

      <Section
        titre="Séances favorites"
        plein
        suffixe={
          <button type="button" class="lien" onClick={onToutesLesSeances}>
            Toutes
            <Icone nom="chevron-droit" taille={14} />
          </button>
        }
      >
        <div class="favorites">
          {favorites.map((m) => {
            const derniere = derniereDe(historique, m.id);
            return (
              <CarteFavorite
                key={m.id}
                modele={m}
                dernierTonnage={derniere && tonnageSeance(derniere)}
                derniereDate={derniere?.date}
                onOuvrir={() => onDemarrer(m)}
              />
            );
          })}
        </div>
      </Section>

      <Section titre="Volume par groupe · 7 jours">
        <div class="carte">
          <ul class="volume">
            {volume.map((v) => (
              <li key={v.groupe} class="volume__ligne">
                <span class="volume__nom">{v.nom || v.groupe}</span>
                <span class="volume__piste">
                  <span class="volume__barre" style={{ width: `${(v.series / maxSeries) * 100}%` }} />
                </span>
                <span class="volume__valeur donnee">{v.series} séries</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {recents.length > 0 && (
        <Section
          titre="Records récents"
          suffixe={
            <button type="button" class="lien" onClick={onHistorique}>
              Historique
              <Icone nom="chevron-droit" taille={14} />
            </button>
          }
        >
          <ul class="records">
            {recents.map((r) => (
              <li key={r.slug} class="records__ligne">
                <span class="records__fleche">
                  <Icone nom="fleche-haut" taille={14} />
                </span>
                <span class="records__nom">{fiche(r.slug).nomFr}</span>
                <span class="records__valeur donnee">
                  {formatNombre(r.charge)} kg × {r.reps}
                </span>
                <span class="records__quand">{ilYA(r.date)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Ecran>
  );
}
