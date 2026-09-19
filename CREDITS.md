# Crédits

## Illustrations d'exercices

Les 906 illustrations de `public/ex/` proviennent de
[**workout-guide**](https://github.com/bryllim/workout-guide) de Bryl Lim,
lui-même dérivé du fonds ouvert [**Everkinetic**](https://github.com/everkinetic/data)
créé par Greg Priday.

**Licence : [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)**

Modifications apportées par `scripts/build-catalog.mjs` :

- optimisation SVGO à précision de chemin réduite ;
- remplacement de `fill="#fff"` par `fill="currentColor"`, pour que
  l'illustration prenne la couleur du texte et fonctionne en thème clair comme
  en thème sombre.

La clause *ShareAlike* s'applique : ces images, y compris modifiées, restent
sous CC BY-SA 4.0 et doivent être redistribuées sous la même licence, avec la
présente attribution.

## Polices

- [**Martian Mono**](https://fonts.google.com/specimen/Martian+Mono) — Roboto Mono
  Project Authors / Mikhail Sharanda — [SIL Open Font License 1.1](https://openfontlicense.org/)
- [**Instrument Sans**](https://fonts.google.com/specimen/Instrument+Sans) — Rodrigo Fuenzalida,
  Jordan Egstad — [SIL Open Font License 1.1](https://openfontlicense.org/)

Les deux sont auto-hébergées dans `src/ui/fonts/` pour que l'application
fonctionne hors-ligne.

## Code couleur des disques

Le code couleur employé pour les statuts (rouge 25 kg, bleu 20 kg, jaune 15 kg,
vert 10 kg) reprend celui des disques olympiques normalisés par l'IWF.
