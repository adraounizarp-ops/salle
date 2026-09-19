import { BARRE_PAR_DEFAUT, DISQUES_PAR_DEFAUT, resumerChargement } from '../data/disques';
import { Ecran, Section } from '../ui/Ecran';
import { Reglette } from '../ui/Reglette';
import './reglages.css';

interface Props {
  barre: number;
  disques: number[];
  onBarre: (v: number) => void;
  onDisque: (poids: number) => void;
  onRetour: () => void;
}

/** Charges d'exemple pour vérifier le réglage d'un coup d'œil. */
const EXEMPLES = [60, 80, 100];

export function Reglages({ barre, disques, onBarre, onDisque, onRetour }: Props) {
  return (
    <Ecran titre="Réglages" onRetour={onRetour}>
      <Section titre="Matériel">
        <div class="carte">
          <Reglette
            nom="Poids de la barre"
            unite="kg"
            valeur={barre}
            pas={2.5}
            min={5}
            max={30}
            onChange={onBarre}
          />

          <div class="disques">
            <p class="etiquette disques__titre">Disques disponibles dans ta salle</p>
            <div class="disques__jetons">
              {DISQUES_PAR_DEFAUT.map((d) => (
                <button
                  key={d}
                  type="button"
                  class="filtre"
                  data-actif={disques.includes(d)}
                  aria-pressed={disques.includes(d)}
                  onClick={() => onDisque(d)}
                >
                  {d.toString().replace('.', ',')}
                </button>
              ))}
            </div>
          </div>

          <ul class="exemples">
            {EXEMPLES.map((c) => (
              <li key={c} class="exemples__ligne">
                <span class="donnee exemples__charge">{c} kg</span>
                <span class="exemples__plan">
                  {resumerChargement(c, barre, disques.length ? disques : DISQUES_PAR_DEFAUT)}
                </span>
              </li>
            ))}
          </ul>
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

      <Section titre="Sauvegarde">
        <div class="carte">
          <p class="prose">
            Les données vivent dans l'app installée. Supprimer l'icône de l'écran d'accueil efface
            l'historique — d'où l'export.
          </p>
          <div class="reglages__actions">
            <button type="button" class="bouton bouton--fantome" disabled>
              Exporter .json
            </button>
            <button type="button" class="bouton bouton--fantome" disabled>
              Importer
            </button>
          </div>
          <p class="prose prose--note">Disponible quand le stockage local sera branché.</p>
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
          </p>
        </div>
      </Section>
    </Ecran>
  );
}

export { BARRE_PAR_DEFAUT };
