import { useEffect, useState } from 'preact/hooks';
import * as magasin from '../data/magasin';
import { enCours, historique, mesures, modeles, pret, reglages } from '../data/magasin';
import type { Modele } from '../data/modele';
import { Ecran } from '../ui/Ecran';
import { feuillesOuvertes } from '../ui/Feuille';
import { FeuilleDepart } from '../ui/FeuilleDepart';
import { Onglets } from '../ui/Onglets';
import { Accueil } from '../screens/Accueil';
import { Execution } from '../screens/Execution';
import { Historique } from '../screens/Historique';
import { HistoriqueDetail } from '../screens/HistoriqueDetail';
import { Progres } from '../screens/Progres';
import { Reglages } from '../screens/Reglages';
import { Seances } from '../screens/Seances';
import { SeanceDetail } from '../screens/SeanceDetail';
import { SeanceEditeur } from '../screens/SeanceEditeur';
import { aller, allerOnglet, apparier, chemin, ongletDe, remplacer, retour } from './routeur';
import './shell.css';

/**
 * La coquille : elle choisit l'écran et relaie les actions vers le magasin.
 *
 * Elle ne tient plus d'état métier — tout vient des signaux de `magasin.ts`,
 * seul module à parler à la base.
 */
export function Shell() {
  const [depart, setDepart] = useState(false);

  useEffect(() => {
    void magasin.demarrer();

    // Si l'app passe en arrière-plan en pleine série, on écrit sans attendre le
    // délai : iOS peut la suspendre à tout moment.
    const sortie = () => {
      if (document.visibilityState === 'hidden') void magasin.viderLeDiffere();
    };
    document.addEventListener('visibilitychange', sortie);
    return () => document.removeEventListener('visibilitychange', sortie);
  }, []);

  const route = chemin.value;

  // Pendant une séance, la barre d'onglets disparaît : l'écran est en mode
  // concentré, et ces 58 px reviennent au pavé de saisie.
  //
  // L'éditeur la perd pour une autre raison : il tient des modifications non
  // enregistrées, et un doigt qui touchait un onglet les jetait sans un mot.
  // On sort par « ‹ » ou par « Enregistrer », pas par accident.
  //
  // Une feuille ouverte la fait disparaître aussi : son bouton d'action tombe
  // dans la même bande de pixels, et laisser les deux se superposer revient à
  // parier sur l'ordre d'empilement du navigateur.
  const pleinEcran = Boolean(
    apparier('/execution') || apparier('/seances/nouvelle') || apparier('/seances/:id/modifier'),
  );

  const sansOnglets = pleinEcran || feuillesOuvertes.value > 0;

  const demarrer = (m: Modele) => {
    setDepart(false);
    magasin.majEnCours(magasin.preparer(m));
    aller('/execution');
  };

  const terminer = async (note?: string) => {
    const faite = await magasin.terminer(note);
    // On atterrit sur le bilan de la séance qu'on vient de faire, pas sur une
    // liste où il faudrait la retrouver.
    if (faite) remplacer(`/historique/${faite.id}`);
    else allerOnglet('/');
  };

  if (!pret.value) {
    return (
      <div class="shell">
        <div class="shell__ecran">
          <Ecran titre="Salle">
            <p class="chantier">Ouverture du carnet…</p>
          </Ecran>
        </div>
      </div>
    );
  }

  const ecran = () => {
    if (apparier('/')) {
      return (
        <Accueil
          prenom={reglages.value.prenom}
          modeles={modeles.value}
          historique={historique.value}
          enCours={enCours.value}
          rappelExport={magasin.exportDepasse()}
          onReglages={() => aller('/reglages')}
          onReprendre={() => aller('/execution')}
          onDemarrer={demarrer}
          onSeance={(s) => aller(`/historique/${s.id}`)}
          onToutesLesSeances={() => allerOnglet('/seances')}
          onHistorique={() => allerOnglet('/historique')}
          onNouvelle={() => aller('/seances/nouvelle')}
        />
      );
    }

    if (apparier('/seances')) {
      return (
        <Seances
          modeles={modeles.value}
          historique={historique.value}
          onOuvrir={(m) => aller(`/seances/${m.id}`)}
          onFavorite={(m) => void magasin.basculerFavorite(m.id)}
          onNouvelle={() => aller('/seances/nouvelle')}
        />
      );
    }

    if (apparier('/seances/nouvelle')) {
      return (
        <SeanceEditeur
          modele={{ id: `m${Date.now()}`, nom: '', favorite: false, lignes: [] }}
          historique={historique.value}
          modeles={modeles.value}
          nouvelle
          onAnnuler={retour}
          onEnregistrer={async (m) => {
            await magasin.enregistrerModele(m);
            remplacer(`/seances/${m.id}`);
          }}
        />
      );
    }

    const edition = apparier('/seances/:id/modifier');
    if (edition) {
      const m = modeles.value.find((x) => x.id === edition.id);
      if (!m) return <Introuvable />;
      return (
        <SeanceEditeur
          modele={m}
          historique={historique.value}
          modeles={modeles.value}
          onAnnuler={retour}
          onEnregistrer={async (suivant) => {
            await magasin.enregistrerModele(suivant);
            retour();
          }}
          onSupprimer={async () => {
            await magasin.supprimerModele(m.id);
            allerOnglet('/seances');
          }}
        />
      );
    }

    const detail = apparier('/seances/:id');
    if (detail) {
      const m = modeles.value.find((x) => x.id === detail.id);
      if (!m) return <Introuvable />;
      return (
        <SeanceDetail
          modele={m}
          historique={historique.value}
          onRetour={retour}
          onFavorite={() => void magasin.basculerFavorite(m.id)}
          onModifier={() => aller(`/seances/${m.id}/modifier`)}
          onDemarrer={() => demarrer(m)}
          onSupprimer={async () => {
            await magasin.supprimerModele(m.id);
            allerOnglet('/seances');
          }}
        />
      );
    }

    if (apparier('/execution')) {
      const s = enCours.value;
      if (!s) return <Introuvable />;
      return (
        <Execution
          seance={s}
          onChangement={magasin.majEnCours}
          onQuitter={() => allerOnglet('/')}
          onAbandonner={async () => {
            await magasin.abandonner();
            allerOnglet('/');
          }}
          onTerminer={terminer}
          avecSon={reglages.value.sonRepos}
        />
      );
    }

    const passee = apparier('/historique/:id');
    if (passee) {
      const s = historique.value.find((x) => x.id === passee.id);
      if (!s) return <Introuvable />;
      return (
        <HistoriqueDetail
          seance={s}
          historique={historique.value}
          onRetour={() => allerOnglet('/historique')}
          onRefaire={() => {
            const m = s.modeleId ? modeles.value.find((x) => x.id === s.modeleId) : undefined;
            if (m) demarrer(m);
          }}
          onSupprimer={async () => {
            await magasin.supprimerSeance(s.id);
            allerOnglet('/historique');
          }}
        />
      );
    }

    if (apparier('/historique')) {
      return (
        <Historique
          historique={historique.value}
          onOuvrir={(s) => aller(`/historique/${s.id}`)}
          onDemarrer={() => setDepart(true)}
        />
      );
    }

    if (apparier('/progres')) {
      return (
        <Progres
          modeles={modeles.value}
          historique={historique.value}
          mesures={mesures.value}
          onMesure={magasin.enregistrerMesure}
          onSupprimerMesure={magasin.supprimerMesure}
        />
      );
    }

    if (apparier('/reglages')) {
      return (
        <Reglages
          reglages={reglages.value}
          nombreSeances={historique.value.length}
          onModifier={magasin.majReglages}
          onExporter={magasin.exporter}
          onImporter={magasin.importer}
          onDemonstration={magasin.chargerDemonstration}
          onRemiseAZero={magasin.remiseAZero}
          onRetour={retour}
        />
      );
    }

    return <Introuvable />;
  };

  return (
    <div class="shell" data-plein={pleinEcran ? 'true' : undefined}>
      <div class="shell__ecran">{ecran()}</div>

      {!sansOnglets && (
        <Onglets actif={ongletDe(route)} onOnglet={allerOnglet} onDemarrer={() => setDepart(true)} />
      )}

      {depart && (
        <FeuilleDepart
          modeles={modeles.value}
          historique={historique.value}
          enCours={enCours.value}
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
