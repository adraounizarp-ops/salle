import { Courbe } from '../charts/Courbe';
import { BarreChargee } from '../ui/BarreChargee';
import { Illustration } from '../ui/Illustration';
import { HISTORIQUE_PUSH_A } from '../data/demo';
import { resumerChargement } from '../data/disques';
import './planche.css';

const DISQUES = [
  { kg: '25', nom: 'Rouge', jeton: '--disque-25', role: 'Action, critique' },
  { kg: '20', nom: 'Bleu', jeton: '--disque-20', role: 'Sélection, info' },
  { kg: '15', nom: 'Jaune', jeton: '--disque-15', role: 'Tonnage en baisse' },
  { kg: '10', nom: 'Vert', jeton: '--disque-10', role: 'Record, au-dessus' },
];

const SERIES = [
  { jeton: '--serie-1', nom: 'Pectoraux' },
  { jeton: '--serie-2', nom: 'Dos' },
  { jeton: '--serie-3', nom: 'Jambes' },
  { jeton: '--serie-4', nom: 'Épaules' },
  { jeton: '--serie-5', nom: 'Bras' },
  { jeton: '--serie-6', nom: 'Tronc' },
];

const TRONCONS = [
  { id: 'a', libelle: 'Développé couché', tonnage: 2560, groupe: 'pectoraux' },
  { id: 'b', libelle: 'Développé incliné', tonnage: 2016, groupe: 'pectoraux' },
  { id: 'c', libelle: 'Développé épaules', tonnage: 1620, groupe: 'epaules' },
  { id: 'd', libelle: 'Élévation latérale', tonnage: 600, groupe: 'epaules' },
  { id: 'e', libelle: 'Extension triceps', tonnage: 1260, groupe: 'bras' },
];

const moyenneMobile = (v: number[], n: number) =>
  v.map((_, i) => {
    const tranche = v.slice(Math.max(0, i - n + 1), i + 1);
    return tranche.reduce((s, x) => s + x, 0) / tranche.length;
  });

/** Planche de style — lot 0. Elle n'existe que pour valider la direction. */
export function Planche() {
  return (
    <div class="planche">
      <header class="planche__entete">
        <p class="etiquette">Direction visuelle</p>
        <h1 class="planche__titre">Fonte &amp; Magnésie</h1>
        <p class="planche__intro">
          Le vocabulaire vient de l'objet : le code couleur officiel des disques olympiques, la
          magnésie, les chiffres estampés sur la fonte.
        </p>
      </header>

      <section class="planche__bloc">
        <h2 class="planche__h2">La barre chargée</h2>
        <p class="planche__note">
          Le tonnage se charge comme une barre. Un tronçon par exercice, sa largeur son tonnage, sa
          couleur son groupe. Le repère pointillé est la séance précédente.
        </p>
        <div class="planche__cadre">
          <BarreChargee troncons={TRONCONS} reference={7600} />
        </div>
        <div class="planche__cadre planche__cadre--serre">
          <p class="etiquette">Version rail, partout ailleurs</p>
          <BarreChargee troncons={TRONCONS} reference={7600} taille="rail" />
        </div>
      </section>

      <section class="planche__bloc">
        <h2 class="planche__h2">Les disques, réservés au statut</h2>
        <ul class="disques">
          {DISQUES.map((d) => (
            <li key={d.kg} class="disque">
              <span class="disque__pastille" style={{ background: `var(${d.jeton})` }}>
                <span class="donnee">{d.kg}</span>
              </span>
              <span class="disque__nom">{d.nom}</span>
              <span class="disque__role">{d.role}</span>
            </li>
          ))}
        </ul>
        <p class="planche__note">
          Ces quatre couleurs ne servent jamais de série de graphique. C'est ce qui rend une alerte
          lisible d'un coup d'œil.
        </p>
      </section>

      <section class="planche__bloc">
        <h2 class="planche__h2">Les séries de graphique</h2>
        <ul class="series-demo">
          {SERIES.map((s) => (
            <li key={s.jeton}>
              <span class="series-demo__trait" style={{ background: `var(${s.jeton})` }} />
              {s.nom}
            </li>
          ))}
        </ul>
        <p class="planche__note">
          Ordre fixe, jamais recyclé. Validé pour le daltonisme protan et deutan, en clair comme en
          sombre.
        </p>
      </section>

      <section class="planche__bloc">
        <h2 class="planche__h2">Typographie</h2>
        <div class="type">
          <p class="type__exemple hero-nombre">12 480</p>
          <p class="etiquette">Martian Mono · chiffres tabulaires</p>
        </div>
        <div class="type">
          <p class="type__exemple type__exemple--ui">Développé couché</p>
          <p class="etiquette">Instrument Sans · interface</p>
        </div>
        <div class="type type__echelle donnee">
          <span>8 × 80</span>
          <span>11 × 27,5</span>
          <span>15 × 10</span>
          <span>6 × 100</span>
        </div>
      </section>

      <section class="planche__bloc">
        <h2 class="planche__h2">Le mouvement</h2>
        <div class="illus">
          <figure>
            <Illustration slug="bench-press" nom="Développé couché" anime taille={92} />
            <figcaption class="etiquette">Actif · 3 images</figcaption>
          </figure>
          <figure>
            <Illustration slug="deadlift" nom="Soulevé de terre" taille={92} />
            <figcaption class="etiquette">Au repos · figé</figcaption>
          </figure>
          <figure>
            <Illustration slug="pull-up" nom="Traction" taille={92} />
            <figcaption class="etiquette">Au repos · figé</figcaption>
          </figure>
        </div>
        <p class="planche__note">
          906 illustrations, recolorées en <code>currentColor</code> : elles suivent le thème et
          peuvent être teintées.
        </p>
      </section>

      <section class="planche__bloc">
        <h2 class="planche__h2">Graphique</h2>
        <div class="planche__cadre">
          <Courbe
            titre="Push A — tonnage par séance"
            points={HISTORIQUE_PUSH_A.map((v, i) => ({ etiquette: `S${i + 1}`, valeur: v }))}
            tendance={moyenneMobile(HISTORIQUE_PUSH_A, 3)}
          />
        </div>
      </section>

      <section class="planche__bloc">
        <h2 class="planche__h2">Chargement de barre</h2>
        <ul class="chargements">
          {[60, 80, 102.5, 140].map((c) => (
            <li key={c} class="donnee">
              <strong>{c.toString().replace('.', ',')} kg</strong> — {resumerChargement(c)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
