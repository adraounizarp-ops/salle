import { useState } from 'preact/hooks';
import { formatNombre } from '../data/metriques';
import './courbe.css';

export interface Point {
  etiquette: string;
  valeur: number;
}

interface Props {
  titre: string;
  points: Point[];
  /** Moyenne mobile, tracée en retrait : la tendance sous le bruit. */
  tendance?: number[];
  unite?: string;
}

const L = 320;
const H = 150;
const MARGE = { haut: 14, bas: 22, gauche: 6, droite: 58 };

/**
 * Courbe d'évolution. Un seul axe des ordonnées — jamais deux échelles sur un
 * même graphique. Le dernier point est étiqueté directement : c'est le chiffre
 * qu'on vient chercher, il ne doit pas demander un survol.
 */
export function Courbe({ titre, points, tendance, unite = 'kg' }: Props) {
  const [survol, setSurvol] = useState<number | null>(null);

  const valeurs = points.map((p) => p.valeur);
  const bas = Math.min(...valeurs) * 0.94;
  const haut = Math.max(...valeurs) * 1.04;

  const x = (i: number) =>
    MARGE.gauche + (i / Math.max(1, points.length - 1)) * (L - MARGE.gauche - MARGE.droite);
  const y = (v: number) => MARGE.haut + (1 - (v - bas) / (haut - bas)) * (H - MARGE.haut - MARGE.bas);

  const chemin = (vs: number[]) => vs.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');

  const dernier = points.length - 1;
  const actif = survol ?? dernier;

  return (
    <figure class="courbe">
      <figcaption class="courbe__tete">
        <h3 class="courbe__titre">{titre}</h3>
        <ul class="courbe__legende">
          <li>
            <span class="courbe__puce" style={{ background: 'var(--serie-1)' }} /> Tonnage
          </li>
          {tendance && (
            <li>
              <span class="courbe__puce courbe__puce--tendance" /> Moyenne 3 séances
            </li>
          )}
        </ul>
      </figcaption>

      <svg
        viewBox={`0 0 ${L} ${H}`}
        class="courbe__toile"
        role="img"
        aria-label={`${titre} : de ${formatNombre(valeurs[0])} à ${formatNombre(valeurs[dernier])} ${unite}`}
        onPointerLeave={() => setSurvol(null)}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * L;
          let plus = 0;
          points.forEach((_, i) => {
            if (Math.abs(x(i) - px) < Math.abs(x(plus) - px)) plus = i;
          });
          setSurvol(plus);
        }}
      >
        <line class="courbe__base" x1={MARGE.gauche} x2={L - MARGE.droite} y1={H - MARGE.bas} y2={H - MARGE.bas} />

        {tendance && <path class="courbe__tendance" d={chemin(tendance)} />}
        <path class="courbe__trace" d={chemin(valeurs)} />

        <line class="courbe__reticule" x1={x(actif)} x2={x(actif)} y1={MARGE.haut - 6} y2={H - MARGE.bas} />
        <circle class="courbe__point" cx={x(actif)} cy={y(valeurs[actif])} r="5" />

        <text class="courbe__valeur donnee" x={L - MARGE.droite + 8} y={y(valeurs[actif]) + 4}>
          {formatNombre(valeurs[actif])}
        </text>
        <text class="courbe__abscisse" x={x(actif)} y={H - 6} text-anchor="middle">
          {points[actif].etiquette}
        </text>
      </svg>
    </figure>
  );
}
