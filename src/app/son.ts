/**
 * Le signal de fin de repos.
 *
 * iOS n'implémente pas l'API de vibration : le seul rappel non visuel possible
 * est un son. Il passe par la voie sonnerie, donc le bouton silencieux de
 * l'iPhone le coupe — c'est une limite du système, pas un bug.
 *
 * Le contexte audio ne peut naître que d'un geste de l'utilisateur. On le crée
 * donc au moment où l'on valide une série, geste qui précède toujours le repos.
 */

let contexte: AudioContext | null = null;

/** À appeler depuis un gestionnaire d'événement, sinon le navigateur refuse. */
export function reveillerLeSon(): void {
  try {
    contexte ??= new AudioContext();
    if (contexte.state === 'suspended') void contexte.resume();
  } catch {
    // Pas d'audio disponible : l'anneau vert suffira.
  }
}

function note(depart: number, frequence: number, duree: number): void {
  if (!contexte) return;

  const oscillateur = contexte.createOscillator();
  const gain = contexte.createGain();

  oscillateur.type = 'sine';
  oscillateur.frequency.value = frequence;

  // Attaque et extinction douces : un créneau brut claque désagréablement.
  gain.gain.setValueAtTime(0, depart);
  gain.gain.linearRampToValueAtTime(0.25, depart + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, depart + duree);

  oscillateur.connect(gain).connect(contexte.destination);
  oscillateur.start(depart);
  oscillateur.stop(depart + duree + 0.02);
}

/** Deux notes montantes, brèves : « c'est reparti », pas une alarme. */
export function bipFinDeRepos(): void {
  if (!contexte || contexte.state !== 'running') return;
  const t = contexte.currentTime;
  note(t, 660, 0.14);
  note(t + 0.16, 880, 0.2);
}
