import { useRef, useState } from 'preact/hooks';
import type { Reglages as Jeu } from '../data/base';
import { DISQUES_PAR_DEFAUT, resumerChargement } from '../data/disques';
import { Ecran, Section } from '../ui/Ecran';
import { Icone } from '../ui/Icone';
import { Reglette } from '../ui/Reglette';
import './reglages.css';

interface Props {
  reglages: Jeu;
  nombreSeances: number;
  onModifier: (modif: Partial<Jeu>) => Promise<void>;
  onExporter: () => Promise<Blob>;
  onImporter: (texte: string) => Promise<{ modeles: number; seances: number }>;
  onDemonstration: () => Promise<void>;
  onRemiseAZero: () => Promise<void>;
  onRetour: () => void;
}

/** Charges d'exemple pour vérifier le réglage d'un coup d'œil. */
const EXEMPLES = [60, 80, 100];

const horodatage = () => new Date().toISOString().slice(0, 10);

export function Reglages({
  reglages,
  nombreSeances,
  onModifier,
  onExporter,
  onImporter,
  onDemonstration,
  onRemiseAZero,
  onRetour,
}: Props) {
  const [message, setMessage] = useState<{ ton: 'ok' | 'erreur'; texte: string } | null>(null);
  const fichier = useRef<HTMLInputElement>(null);

  const disques = reglages.disques.length ? reglages.disques : [...DISQUES_PAR_DEFAUT];

  const exporter = async () => {
    const blob = await onExporter();
    const nom = `salle-${horodatage()}.json`;
    const f = new File([blob], nom, { type: 'application/json' });

    // Sur iPhone, la feuille de partage envoie le fichier vers iCloud Drive,
    // Fichiers ou un mail. Ailleurs, on retombe sur un téléchargement.
    if (navigator.canShare?.({ files: [f] })) {
      try {
        await navigator.share({ files: [f], title: nom });
        setMessage({ ton: 'ok', texte: 'Sauvegarde envoyée.' });
        return;
      } catch {
        // Partage refusé ou annulé : on continue avec le téléchargement.
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ ton: 'ok', texte: `Fichier ${nom} enregistré.` });
  };

  const importer = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const bilan = await onImporter(await f.text());
      setMessage({
        ton: 'ok',
        texte: `${bilan.seances} séances et ${bilan.modeles} modèles restaurés.`,
      });
    } catch (erreur) {
      setMessage({ ton: 'erreur', texte: (erreur as Error).message });
    }
    (e.target as HTMLInputElement).value = '';
  };

  return (
    <Ecran titre="Réglages" onRetour={onRetour}>
      <Section titre="Toi">
        <div class="carte">
          <label class="champ">
            <span class="etiquette">Prénom</span>
            <input
              class="champ__saisie"
              value={reglages.prenom}
              placeholder="Ton prénom"
              onInput={(e) => void onModifier({ prenom: (e.target as HTMLInputElement).value })}
            />
          </label>
        </div>
      </Section>

      <Section titre="Matériel">
        <div class="carte">
          <Reglette
            nom="Poids de la barre"
            unite="kg"
            valeur={reglages.barre}
            pas={2.5}
            min={5}
            max={30}
            onChange={(v) => void onModifier({ barre: v })}
          />

          <div class="disques">
            <p class="etiquette disques__titre">Disques disponibles dans ta salle</p>
            <div class="disques__jetons">
              {DISQUES_PAR_DEFAUT.map((d) => {
                const actif = disques.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    class="filtre"
                    data-actif={actif}
                    aria-pressed={actif}
                    onClick={() =>
                      void onModifier({
                        disques: actif
                          ? disques.filter((x) => x !== d)
                          : [...disques, d].sort((a, b) => b - a),
                      })
                    }
                  >
                    {d.toString().replace('.', ',')}
                  </button>
                );
              })}
            </div>
          </div>

          <ul class="exemples">
            {EXEMPLES.map((c) => (
              <li key={c} class="exemples__ligne">
                <span class="donnee exemples__charge">{c} kg</span>
                <span class="exemples__plan">{resumerChargement(c, reglages.barre, disques)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section titre="Sauvegarde">
        <div class="carte">
          <p class="prose">
            Les données vivent dans l'app installée. Supprimer l'icône de l'écran d'accueil efface
            l'historique — l'export est le seul filet.
          </p>
          <p class="prose prose--note">
            {reglages.dernierExport
              ? `Dernier export le ${new Date(reglages.dernierExport).toLocaleDateString('fr-FR')}.`
              : 'Jamais exporté.'}
          </p>

          <div class="reglages__actions">
            <button type="button" class="bouton bouton--vert" onClick={exporter}>
              <Icone nom="fleche-haut" taille={16} />
              Exporter
            </button>
            <button
              type="button"
              class="bouton bouton--fantome"
              onClick={() => fichier.current?.click()}
            >
              Importer
            </button>
          </div>

          <input
            ref={fichier}
            type="file"
            accept="application/json,.json"
            class="reglages__fichier"
            onChange={importer}
          />

          <p class="prose prose--note">
            L'import remplace tout le contenu. Fusionner deux historiques inventerait des séances en
            double, ce qui fausserait chaque comparaison de tonnage.
          </p>

          {message && (
            <p class="reglages__message" data-ton={message.ton}>
              {message.texte}
            </p>
          )}
        </div>
      </Section>

      <Section titre="Comment se calcule le tonnage">
        <div class="carte">
          <p class="prose">
            Tonnage = somme des <strong>répétitions × charge</strong> sur les séries de travail.
          </p>
          <ul class="regles">
            <li>L'échauffement est enregistré, marqué W, et exclu.</li>
            <li>Le poids du corps est exclu : sur une traction lestée, seul le lest compte en kilos.</li>
            <li>
              Un exercice au poids du corps, en durée ou en distance ne produit pas de tonnage — il
              compte en répétitions et en séries dures.
            </li>
          </ul>
        </div>
      </Section>

      <Section titre="Données">
        <div class="carte">
          {nombreSeances === 0 && (
            <>
              <p class="prose">
                Pour voir les écrans avec du contenu, tu peux verser un trimestre de séances
                fictives. À effacer avant de commencer pour de vrai.
              </p>
              <button
                type="button"
                class="bouton bouton--fantome bouton--plein reglages__espace"
                onClick={() => void onDemonstration()}
              >
                Charger un jeu de démonstration
              </button>
            </>
          )}

          <button
            type="button"
            class="bouton bouton--corail bouton--plein reglages__espace"
            onClick={() => {
              const texte =
                nombreSeances > 0
                  ? `Effacer ${nombreSeances} séances et revenir aux trois modèles de départ ? Exporte d'abord si tu veux les garder.`
                  : 'Revenir aux trois modèles de départ ?';
              if (confirm(texte)) void onRemiseAZero();
            }}
          >
            <Icone nom="corbeille" taille={16} />
            Tout effacer
          </button>
        </div>
      </Section>

      <Section titre="Crédits">
        <div class="carte">
          <p class="prose">
            Les 906 illustrations d'exercices viennent de <strong>workout-guide</strong> de Bryl Lim,
            dérivé du fonds ouvert <strong>Everkinetic</strong> de Greg Priday, sous licence
            CC BY-SA 4.0. Elles ont été optimisées et recolorées pour suivre le thème.
          </p>
          <p class="prose">
            Polices <strong>Geist</strong> et <strong>Geist Mono</strong>, SIL Open Font License 1.1.
            Icônes <strong>Lucide</strong>, licence ISC.
          </p>
        </div>
      </Section>
    </Ecran>
  );
}
