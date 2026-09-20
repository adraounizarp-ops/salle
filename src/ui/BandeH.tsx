import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';

/**
 * La bande qui défile sur le côté.
 *
 * `overflow-x: auto` suffit au doigt, jamais au reste : une molette verticale
 * posée sur une bande horizontale ne produit rien, et un glissement pressé-tiré
 * à la souris ne fait défiler aucun conteneur. D'où ce crochet, qui branche les
 * deux gestes manquants et laisse le tactile au navigateur — c'est lui qui le
 * fait le mieux.
 *
 * Il pose aussi `data-bord`, dont la feuille de style tire le dégradé qui
 * annonce qu'il reste du contenu de ce côté-là.
 */

/** En deçà, c'est un tap qui tremble, pas un glissement. */
const SEUIL = 6;

/** Fenêtre pendant laquelle un clic est encore le résidu d'un glissement. */
const REMANENCE = 220;

function useBandeH(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const course = () => el.scrollWidth - el.clientWidth;

    const marquerLesBords = () => {
      const reste = course();
      if (reste <= 1) {
        delete el.dataset.bord;
        return;
      }
      const gauche = el.scrollLeft > 1;
      const droite = el.scrollLeft < reste - 1;
      el.dataset.bord = gauche && droite ? 'deux' : gauche ? 'gauche' : 'droite';
    };

    // --- La molette ----------------------------------------------------------

    const molette = (e: WheelEvent) => {
      if (course() <= 1) return;
      // Un geste déjà horizontal — trackpad, souris à molette inclinable — est
      // l'affaire du navigateur ; on ne s'occupe que du vertical.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const avant = el.scrollLeft;
      el.scrollLeft = avant + e.deltaY;
      // Si la bande est en butée, on rend le geste à la page : le doigt ne doit
      // pas rester coincé sur une bande qui ne bouge plus.
      if (el.scrollLeft !== avant) e.preventDefault();
    };

    // --- Le glissement -------------------------------------------------------

    let pointeur: number | null = null;
    let departX = 0;
    let departScroll = 0;
    let parcouru = 0;
    let finDuGlissement = 0;

    const prise = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      if (course() <= 1) return;
      pointeur = e.pointerId;
      departX = e.clientX;
      departScroll = el.scrollLeft;
      parcouru = 0;
    };

    const deplacement = (e: PointerEvent) => {
      if (pointeur !== e.pointerId) return;
      const dx = e.clientX - departX;
      parcouru = Math.max(parcouru, Math.abs(dx));
      if (parcouru < SEUIL) return;

      if (!el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
      el.scrollLeft = departScroll - dx;
      e.preventDefault();
    };

    const lacher = (e: PointerEvent) => {
      if (pointeur !== e.pointerId) return;
      pointeur = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      finDuGlissement = parcouru >= SEUIL ? performance.now() : 0;
      parcouru = 0;
    };

    // Tirer une carte favorite ne doit pas démarrer la séance : le clic que le
    // navigateur émet à la fin du glissement est avalé avant d'atteindre la
    // carte.
    const clicResiduel = (e: MouseEvent) => {
      if (performance.now() - finDuGlissement >= REMANENCE) return;
      e.stopPropagation();
      e.preventDefault();
    };

    el.addEventListener('wheel', molette, { passive: false });
    el.addEventListener('pointerdown', prise);
    el.addEventListener('click', clicResiduel, true);
    el.addEventListener('scroll', marquerLesBords, { passive: true });
    addEventListener('pointermove', deplacement);
    addEventListener('pointerup', lacher);
    addEventListener('pointercancel', lacher);

    // Le contenu arrive après coup — illustrations, séances relues — donc on
    // remesure plutôt que de croire la première mesure.
    const observateur = new ResizeObserver(marquerLesBords);
    observateur.observe(el);
    for (const enfant of el.children) observateur.observe(enfant);
    marquerLesBords();

    return () => {
      el.removeEventListener('wheel', molette);
      el.removeEventListener('pointerdown', prise);
      el.removeEventListener('click', clicResiduel, true);
      el.removeEventListener('scroll', marquerLesBords);
      removeEventListener('pointermove', deplacement);
      removeEventListener('pointerup', lacher);
      removeEventListener('pointercancel', lacher);
      observateur.disconnect();
    };
  }, [ref]);
}

interface Props {
  class?: string;
  /** Ouvre la bande sur sa fin : pour un bandeau chronologique. */
  aLaFin?: boolean;
  /** Renseignée, la bande devient un `nav` porteur de ce libellé. */
  etiquette?: string;
  children: ComponentChildren;
}

export function BandeH({ class: classe, aLaFin, etiquette, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useBandeH(ref);

  useEffect(() => {
    if (aLaFin && ref.current) ref.current.scrollLeft = ref.current.scrollWidth;
  }, [aLaFin, children]);

  const commun = {
    ref,
    class: classe ? `bande-h ${classe}` : 'bande-h',
    children,
  };

  return etiquette ? <nav {...commun} aria-label={etiquette} /> : <div {...commun} />;
}
