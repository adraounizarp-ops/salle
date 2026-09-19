import { useState } from 'preact/hooks';
import { HISTORIQUE, MODELES, seanceEnCoursDemo } from '../data/demo';
import type { Modele, SeanceEnCours, SeanceFaite } from '../data/modele';
import { Ecran } from '../ui/Ecran';
import { Onglets } from '../ui/Onglets';
import { FeuilleDepart } from '../ui/FeuilleDepart';
import { Accueil } from '../screens/Accueil';
import { Execution } from '../screens/Execution';
import { Historique } from '../screens/Historique';
import { HistoriqueDetail } from '../screens/HistoriqueDetail';
import { Progres } from '../screens/Progres';
import { Reglages } from '../screens/Reglages';
import { Seances } from '../screens/Seances';
import { SeanceDetail } from '../screens/SeanceDetail';
import { SeanceEditeur } from '../screens/SeanceEditeur';
import { BARRE_PAR_DEFAUT, DISQUES_PAR_DEFAUT } from '../data/disques';
import { derniereDe, tonnageExerciceFait, tonnageSeance } from '../data/selection';
import { aller, allerOnglet, apparier, chemin, ongletDe, retour } from './routeur';
import './shell.css';

/**
 * La coquille : elle tient l'état de l'application et choisit l'écran.
 *
 * L'état vit ici plutôt que dans un magasin global : tant que les données sont
 * de démonstration, `useState` suffit, et le jour où IndexedDB arrive c'est le
 * seul endroit à brancher.
 */
export function Shell() {
  const [historique] = useState<SeanceFaite[]>(HISTORIQUE);
  const [modeles, setModeles] = useState<Modele[]>(MODELES);
  const [enCours, setEnCours] = useState<SeanceEnCours | null>(() => seanceEnCoursDemo());
  const [depart, setDepart] = useState(false);
  const [barre, setBarre] = useState(BARRE_PAR_DEFAUT);
  const [disques, setDisques] = useState<number[]>([...DISQUES_PAR_DEFAUT]);

  const route = chemin.value;

  // Pendant une séance, la barre d'onglets disparaît : l'écran est en mode
  // concentré, et ces 58 px reviennent au pavé de saisie.
  const pleinEcran = Boolean(apparier('/execution'));

  const modeleDe = (id: string) => modeles.find((m) => m.id === id);

  const basculerFavorite = (m: Modele) =>
    setModeles((ms) => ms.map((x) => (x.id === m.id ? { ...x, favorite: !x.favorite } : x)));

  const enregistrer = (m: Modele) => {
    setModeles((ms) => (ms.some((x) => x.id === m.id) ? ms.map((x) => (x.id === m.id ? m : x)) : [...ms, m]));
    retour();
  };

  /** Déplie un modèle en séance saisissable, avec ses références de tonnage. */
  const demarrer = (m: Modele) => {
    setDepart(false);

    const derniere = derniereDe(historique, m.id);
    const referenceExercice: Record<string, number> = {};
    for (const e of derniere?.exercices ?? []) referenceExercice[e.slug] = tonnageExerciceFait(e);

    setEnCours({
      modeleId: m.id,
      nom: m.nom,
      debut: Date.now(),
      exercices: m.lignes.map((l) => ({
        slug: l.slug,
        // Préremplies au haut de la fourchette et à la charge du modèle : un
        // tap sur « Valider » suffit quand la séance se passe comme prévu.
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
    });
    aller('/execution');
  };

  const ecran = () => {
    if (apparier('/')) {
      return (
        <Accueil
          historique={historique}
          enCours={enCours}
          onReglages={() => aller('/reglages')}
          onReprendre={() => aller('/execution')}
          onDemarrer={demarrer}
          onSeance={(s) => aller(`/historique/${s.id}`)}
          onToutesLesSeances={() => allerOnglet('/seances')}
          onHistorique={() => allerOnglet('/historique')}
        />
      );
    }

    if (apparier('/seances')) {
      return (
        <Seances
          modeles={modeles}
          historique={historique}
          onOuvrir={(m) => aller(`/seances/${m.id}`)}
          onFavorite={basculerFavorite}
          onNouvelle={() => aller('/seances/nouvelle')}
        />
      );
    }

    if (apparier('/seances/nouvelle')) {
      return (
        <SeanceEditeur
          modele={{ id: `m${Date.now()}`, nom: '', favorite: false, lignes: [] }}
          historique={historique}
          nouvelle
          onAnnuler={retour}
          onEnregistrer={enregistrer}
        />
      );
    }

    const edition = apparier('/seances/:id/modifier');
    if (edition) {
      const m = modeleDe(edition.id);
      if (!m) return <Introuvable />;
      return (
        <SeanceEditeur modele={m} historique={historique} onAnnuler={retour} onEnregistrer={enregistrer} />
      );
    }

    const detail = apparier('/seances/:id');
    if (detail) {
      const m = modeleDe(detail.id);
      if (!m) return <Introuvable />;
      return (
        <SeanceDetail
          modele={m}
          historique={historique}
          onRetour={retour}
          onFavorite={() => basculerFavorite(m)}
          onModifier={() => aller(`/seances/${m.id}/modifier`)}
          onDemarrer={() => demarrer(m)}
        />
      );
    }

    if (apparier('/execution')) {
      if (!enCours) return <Introuvable />;
      return (
        <Execution
          seance={enCours}
          onChangement={setEnCours}
          onQuitter={() => allerOnglet('/')}
          onTerminer={() => {
            // L'enregistrement dans l'historique arrive avec IndexedDB.
            setEnCours(null);
            allerOnglet('/historique');
          }}
        />
      );
    }

    const passee = apparier('/historique/:id');
    if (passee) {
      const s = historique.find((x) => x.id === passee.id);
      if (!s) return <Introuvable />;
      return (
        <HistoriqueDetail
          seance={s}
          historique={historique}
          onRetour={retour}
          onRefaire={() => {
            const m = s.modeleId ? modeleDe(s.modeleId) : undefined;
            if (m) demarrer(m);
          }}
        />
      );
    }

    if (apparier('/historique')) {
      return <Historique historique={historique} onOuvrir={(s) => aller(`/historique/${s.id}`)} />;
    }

    if (apparier('/progres')) return <Progres modeles={modeles} historique={historique} />;

    if (apparier('/reglages')) {
      return (
        <Reglages
          barre={barre}
          disques={disques}
          onBarre={setBarre}
          onDisque={(d) =>
            setDisques((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort((a, b) => b - a)))
          }
          onRetour={retour}
        />
      );
    }

    return <Introuvable />;
  };

  return (
    <div class="shell" data-plein={pleinEcran ? 'true' : undefined}>
      <div class="shell__ecran">{ecran()}</div>

      {!pleinEcran && (
        <Onglets actif={ongletDe(route)} onOnglet={allerOnglet} onDemarrer={() => setDepart(true)} />
      )}

      {depart && (
        <FeuilleDepart
          modeles={modeles}
          historique={historique}
          enCours={enCours}
          onReprendre={() => {
            setDepart(false);
            aller('/execution');
          }}
          onDemarrer={demarrer}
          onLibre={() => {
            setDepart(false);
            aller('/seances/nouvelle');
          }}
          onFermer={() => setDepart(false)}
        />
      )}
    </div>
  );
}

function Introuvable() {
  return (
    <Ecran titre="Écran introuvable" onRetour={() => allerOnglet('/')}>
      <p class="chantier">Ce lien ne mène nulle part. Retour à l'accueil.</p>
    </Ecran>
  );
}
