/**
 * Dessine les icônes de l'application.
 *
 *   node scripts/build-icons.mjs
 *
 * Tout est fait à la main — rastérisation et encodage PNG — pour ne pas traîner
 * une dépendance de traitement d'image dans un projet qui n'en a pas d'autre
 * usage. La marque est une barre chargée : deux disques par côté, le gros à
 * l'intérieur, comme sur un vrai rack.
 *
 * Sortie : public/icons/
 */
import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = resolve(RACINE, 'public/icons');

const NOIR = [0x0b, 0x0b, 0x0c];
const VERT = [0xd3, 0xfb, 0x4f];

/** Suréchantillonnage : le lissage vient de la moyenne, pas d'un filtre. */
const SUR = 4;

// --- Rastérisation -----------------------------------------------------------

/**
 * Couverture d'un rectangle à coins arrondis pour un point donné.
 * Renvoie 1 dedans, 0 dehors — le lissage arrive au sous-échantillonnage.
 */
function dansRectArrondi(px, py, x, y, w, h, r) {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const rx = Math.min(r, w / 2);
  const ry = Math.min(r, h / 2);

  // Les quatre coins : on ne teste le cercle que dans leur carré.
  const gx = px < x + rx ? x + rx : px > x + w - rx ? x + w - rx : px;
  const gy = py < y + ry ? y + ry : py > y + h - ry ? y + h - ry : py;
  if (gx === px && gy === py) return true;

  const dx = (px - gx) / rx;
  const dy = (py - gy) / ry;
  return dx * dx + dy * dy <= 1;
}

function toile(cote) {
  const n = cote * SUR;
  return { n, cote, pixels: new Uint8ClampedArray(n * n * 4) };
}

function remplir(t, x, y, w, h, r, couleur) {
  const e = t.n / t.cote; // pixels suréchantillonnés par pixel final
  const [x0, y0, x1, y1] = [
    Math.max(0, Math.floor(x * e)),
    Math.max(0, Math.floor(y * e)),
    Math.min(t.n, Math.ceil((x + w) * e)),
    Math.min(t.n, Math.ceil((y + h) * e)),
  ];

  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      if (!dansRectArrondi((px + 0.5) / e, (py + 0.5) / e, x, y, w, h, r)) continue;
      const i = (py * t.n + px) * 4;
      t.pixels[i] = couleur[0];
      t.pixels[i + 1] = couleur[1];
      t.pixels[i + 2] = couleur[2];
      t.pixels[i + 3] = 255;
    }
  }
}

/** Moyenne des SUR × SUR sous-pixels : c'est là que naît le lissage. */
function reduire(t) {
  const sortie = new Uint8ClampedArray(t.cote * t.cote * 4);
  const aire = SUR * SUR;

  for (let y = 0; y < t.cote; y++) {
    for (let x = 0; x < t.cote; x++) {
      let r = 0;
      let v = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SUR; sy++) {
        for (let sx = 0; sx < SUR; sx++) {
          const i = ((y * SUR + sy) * t.n + (x * SUR + sx)) * 4;
          r += t.pixels[i];
          v += t.pixels[i + 1];
          b += t.pixels[i + 2];
          a += t.pixels[i + 3];
        }
      }
      const j = (y * t.cote + x) * 4;
      sortie[j] = r / aire;
      sortie[j + 1] = v / aire;
      sortie[j + 2] = b / aire;
      sortie[j + 3] = a / aire;
    }
  }
  return sortie;
}

// --- Encodage PNG ------------------------------------------------------------

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(octets) {
  let c = 0xffffffff;
  for (const o of octets) c = TABLE_CRC[(c ^ o) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function morceau(type, donnees) {
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), donnees]);
  const taille = Buffer.alloc(4);
  taille.writeUInt32BE(donnees.length);
  const somme = Buffer.alloc(4);
  somme.writeUInt32BE(crc32(corps));
  return Buffer.concat([taille, corps, somme]);
}

function encoderPng(pixels, cote) {
  const entete = Buffer.alloc(13);
  entete.writeUInt32BE(cote, 0);
  entete.writeUInt32BE(cote, 4);
  entete[8] = 8; // 8 bits par canal
  entete[9] = 6; // RVBA
  // Filtre 0 sur chaque ligne : l'image est plate, le gain d'un autre filtre
  // serait marginal et le code moins lisible.
  const lignes = Buffer.alloc(cote * (cote * 4 + 1));
  for (let y = 0; y < cote; y++) {
    lignes[y * (cote * 4 + 1)] = 0;
    Buffer.from(pixels.buffer, y * cote * 4, cote * 4).copy(
      lignes,
      y * (cote * 4 + 1) + 1,
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceau('IHDR', entete),
    morceau('IDAT', deflateSync(lignes, { level: 9 })),
    morceau('IEND', Buffer.alloc(0)),
  ]);
}

// --- La marque ---------------------------------------------------------------

/**
 * La barre chargée, en coordonnées unitaires. Les disques décroissent vers
 * l'extérieur : c'est ainsi qu'on charge une barre, gros disque contre le
 * collier.
 */
const BARRE = [
  // [x, y, largeur, hauteur, rayon]
  [0.1, 0.468, 0.8, 0.064, 0.032], // la barre
  [0.283, 0.25, 0.082, 0.5, 0.016], // disque 25, gauche
  [0.635, 0.25, 0.082, 0.5, 0.016], // disque 25, droite
  [0.188, 0.335, 0.066, 0.33, 0.013], // disque 20, gauche
  [0.746, 0.335, 0.066, 0.33, 0.013], // disque 20, droite
];

/**
 * @param cote      taille en pixels
 * @param fond      couleur de fond
 * @param marque    couleur de la barre
 * @param echelle   place occupée par la marque ; réduite pour une icône
 *                  masquable, dont les bords sont rognés par le système
 * @param rayonFond rayon des coins ; nul pour un fond à bord perdu
 */
function dessiner({ cote, fond, marque, echelle, rayonFond }) {
  const t = toile(cote);
  remplir(t, 0, 0, cote, cote, rayonFond, fond);

  const taille = cote * echelle;
  const decalage = (cote - taille) / 2;
  for (const [x, y, w, h, r] of BARRE) {
    remplir(t, decalage + x * taille, decalage + y * taille, w * taille, h * taille, r * taille, marque);
  }

  return encoderPng(reduire(t), cote);
}

// --- Programme ---------------------------------------------------------------

const ICONES = [
  // Icônes standard : fond sombre, marque verte. L'identité de l'app.
  { nom: 'icon-192.png', cote: 192, fond: NOIR, marque: VERT, echelle: 0.82, rayonFond: 42 },
  { nom: 'icon-512.png', cote: 512, fond: NOIR, marque: VERT, echelle: 0.82, rayonFond: 112 },
  // iOS arrondit lui-même : on lui donne un carré plein.
  { nom: 'apple-touch-icon.png', cote: 180, fond: NOIR, marque: VERT, echelle: 0.8, rayonFond: 0 },
  // Masquable : bord perdu et marque resserrée dans la zone sûre, parce que le
  // système peut rogner jusqu'à un cercle.
  { nom: 'icon-maskable-512.png', cote: 512, fond: VERT, marque: NOIR, echelle: 0.6, rayonFond: 0 },
];

await mkdir(SORTIE, { recursive: true });
for (const { nom, ...options } of ICONES) {
  const png = dessiner(options);
  await writeFile(resolve(SORTIE, nom), png);
  console.log(`  ${nom.padEnd(26)} ${options.cote}px  ${(png.length / 1024).toFixed(1)} ko`);
}
console.log(`\n→ ${SORTIE}`);
