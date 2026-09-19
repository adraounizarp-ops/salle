import { useEffect, useRef, useState } from 'preact/hooks';
import './illustration.css';

interface Props {
  slug: string;
  /** Nom français, pour l'alternative textuelle. */
  nom: string;
  /** Le mouvement ne s'anime que sur l'exercice actif. Ailleurs : image 1 figée. */
  anime?: boolean;
  taille?: number;
}

/** Les SVG sont légers mais on ne les relit jamais deux fois. */
const cache = new Map<string, Promise<string>>();

function charger(slug: string, n: number): Promise<string> {
  const cle = `${slug}/${n}`;
  let p = cache.get(cle);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}ex/${slug}/${n}.svg`)
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');
    cache.set(cle, p);
  }
  return p;
}

/** Aller-retour 1 → 2 → 3 → 2 : un mouvement, pas un clignotement. */
const SEQUENCE = [0, 1, 2, 1];
const CADENCE = 600;

/**
 * Le petit visuel démonstratif. Les SVG sont injectés en ligne — et non posés
 * dans une balise image — pour qu'ils héritent de currentColor : l'illustration
 * prend la couleur du texte, donc du thème, et peut être teintée.
 */
export function Illustration({ slug, nom, anime = false, taille = 56 }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [pas, setPas] = useState(0);
  const vivant = useRef(true);

  useEffect(() => {
    vivant.current = true;
    const besoin = anime ? [1, 2, 3] : [1];
    Promise.all(besoin.map((n) => charger(slug, n))).then((svg) => {
      if (vivant.current) setImages(svg);
    });
    return () => {
      vivant.current = false;
    };
  }, [slug, anime]);

  useEffect(() => {
    if (!anime || images.length < 3) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setPas((p) => (p + 1) % SEQUENCE.length), CADENCE);
    return () => clearInterval(t);
  }, [anime, images.length]);

  const actif = images.length >= 3 ? SEQUENCE[pas] : 0;

  return (
    <div
      class="illu"
      style={{ '--cote': `${taille}px` }}
      role="img"
      aria-label={`Démonstration : ${nom}`}
    >
      {images.length === 0 && <span class="illu__attente" aria-hidden="true" />}
      {images.map((svg, i) => (
        <span
          key={i}
          class="illu__image"
          data-visible={i === actif}
          // Contenu généré par scripts/build-catalog.mjs, jamais saisi par l'utilisateur.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ))}
    </div>
  );
}
