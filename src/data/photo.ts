/**
 * La photo de suivi, réduite avant d'être gardée.
 *
 * Une photo d'iPhone pèse 3 à 5 Mo. Douze relevés par an, et la sauvegarde
 * exportée — du JSON, donc du base64, donc un tiers de plus — devient
 * intransportable par courriel. Réduite à 1080 px sur le grand côté en JPEG
 * 0,7, la même photo tient dans ~150 ko et reste largement assez nette pour
 * comparer deux silhouettes à trois mois d'écart.
 */

/** Grand côté, en pixels. */
const COTE = 1080;

const QUALITE = 0.7;

export async function reduirePhoto(fichier: File): Promise<string> {
  const source = await chargerImage(fichier);

  const facteur = Math.min(1, COTE / Math.max(source.width, source.height));
  const l = Math.round(source.width * facteur);
  const h = Math.round(source.height * facteur);

  const toile = document.createElement('canvas');
  toile.width = l;
  toile.height = h;

  const ctx = toile.getContext('2d');
  if (!ctx) throw new Error("Cette photo n'a pas pu être préparée.");
  ctx.drawImage(source, 0, 0, l, h);

  if ('close' in source) source.close();

  return toile.toDataURL('image/jpeg', QUALITE);
}

/**
 * `createImageBitmap` applique l'orientation EXIF, ce qu'un `<img>` ne fait pas
 * toujours : sans elle, une photo prise en portrait ressort couchée.
 */
async function chargerImage(fichier: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(fichier, { imageOrientation: 'from-image' });
    } catch {
      // Format refusé par le décodeur rapide : on retombe sur la balise.
    }
  }

  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Poids approximatif d'une data URL, en kilo-octets. */
export const poidsKo = (dataUrl: string) => Math.round((dataUrl.length * 3) / 4 / 1024);
