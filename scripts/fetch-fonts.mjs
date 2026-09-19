/**
 * Télécharge les polices depuis Google Fonts et les auto-héberge.
 * L'app doit se charger hors-ligne : aucune requête vers fonts.gstatic.com
 * à l'exécution.
 *
 *   node scripts/fetch-fonts.mjs
 *
 * Sortie : src/ui/fonts/*.woff2 + src/ui/fonts.css
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE_POLICES = resolve(RACINE, 'src/ui/fonts');
const SORTIE_CSS = resolve(RACINE, 'src/ui/fonts.css');

// Chrome récent : indispensable pour obtenir du woff2 variable et non du ttf.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FAMILLES = [
  {
    nom: 'Martian Mono',
    fichier: 'martian-mono',
    // Chasse condensée (wdth 87.5) : les colonnes reps/kg tiennent sur un iPhone.
    requete: 'Martian+Mono:wdth,wght@87.5,300..700',
  },
  {
    nom: 'Instrument Sans',
    fichier: 'instrument-sans',
    requete: 'Instrument+Sans:wght@400..700',
  },
];

// On ne garde que le latin : le latin-ext et le reste sont du poids mort ici.
const SOUS_ENSEMBLES_GARDES = new Set(['latin']);

async function css(requete) {
  const url = `https://fonts.googleapis.com/css2?family=${requete}&display=swap`;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.text();
}

/** Découpe la feuille Google en blocs @font-face annotés par leur sous-ensemble. */
function blocs(feuille) {
  const out = [];
  let sousEnsemble = 'latin';
  const re = /\/\*\s*([a-z-]+)\s*\*\/|@font-face\s*\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(feuille))) {
    if (m[1]) sousEnsemble = m[1];
    else out.push({ sousEnsemble, corps: m[2] });
  }
  return out;
}

const champ = (corps, cle) => corps.match(new RegExp(`${cle}:\s*([^;]+);`))?.[1].trim();

async function main() {
  await mkdir(SORTIE_POLICES, { recursive: true });
  const morceaux = [
    '/* Polices auto-hébergées — généré par scripts/fetch-fonts.mjs, ne pas éditer. */',
    '/* Martian Mono & Instrument Sans — SIL Open Font License 1.1 */',
    '',
  ];

  for (const famille of FAMILLES) {
    const feuille = await css(famille.requete);
    let n = 0;

    for (const { sousEnsemble, corps } of blocs(feuille)) {
      if (!SOUS_ENSEMBLES_GARDES.has(sousEnsemble)) continue;

      const src = champ(corps, 'src');
      const urlDistante = src?.match(/url\(([^)]+)\)/)?.[1];
      if (!urlDistante) continue;

      const nomFichier = `${famille.fichier}-${sousEnsemble}.woff2`;
      const r = await fetch(urlDistante, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error(`${urlDistante} → HTTP ${r.status}`);
      const octets = Buffer.from(await r.arrayBuffer());
      await writeFile(resolve(SORTIE_POLICES, nomFichier), octets);
      console.log(`  ${nomFichier.padEnd(34)} ${(octets.length / 1024).toFixed(1)} ko`);

      const plage = champ(corps, 'unicode-range');
      morceaux.push(
        '@font-face {',
        `  font-family: '${famille.nom}';`,
        `  font-style: ${champ(corps, 'font-style') ?? 'normal'};`,
        `  font-weight: ${champ(corps, 'font-weight') ?? '400'};`,
        '  font-display: swap;',
        `  src: url('./fonts/${nomFichier}') format('woff2');`,
        ...(plage ? [`  unicode-range: ${plage};`] : []),
        '}',
        '',
      );
      n++;
    }
    if (n === 0) throw new Error(`Aucun woff2 latin trouvé pour ${famille.nom}`);
  }

  await writeFile(SORTIE_CSS, morceaux.join('\n'));
  console.log(`\n→ ${SORTIE_CSS}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
