# Salle — carnet de tonnage

Suivi de séances de musculation pour iPhone. Application web installable (PWA) :
pas d'App Store, pas de compte, pas de serveur. Les données restent dans le
téléphone, l'hébergement est gratuit.

## Ce qui marche aujourd'hui (lot 0)

La direction visuelle et les composants qui la portent, avec des données de
démonstration. Trois écrans à regarder via la barre du bas :

| Onglet | Ce qu'il montre |
|---|---|
| **Séance** | L'écran d'exécution : saisie au pavé intégré, chrono, alerte de tonnage, chargement de barre, minuteur de repos |
| **Programmer** | La composition d'une séance et le sélecteur des 302 exercices illustrés |
| **Planche** | La planche de style : couleurs, typographie, la barre chargée, le graphique |

Le bouton **Clair / Sombre** bascule le thème.

## Développement

```bash
npm install
npm run dev      # http://localhost:5173/salle/
npm run build    # vérification des types puis build de production
```

Le dossier `public/ex/` (906 SVG, ~15 Mo) est versionné : l'application doit
fonctionner hors-ligne en salle. Pour le régénérer :

```bash
npm run catalog           # n'écrase pas l'existant
npm run catalog -- --force
npm run fonts             # re-télécharge et auto-héberge les polices
```

## Déploiement

Pousser sur `main` déclenche `.github/workflows/pages.yml`, qui construit et
publie sur GitHub Pages. Le chemin de base suit le nom du dépôt, donc rien à
configurer si le dépôt s'appelle autrement que `salle`.

Côté dépôt, une fois : **Settings → Pages → Source : GitHub Actions**.

## Installer sur l'iPhone

Ouvrir l'adresse dans **Safari** (pas Chrome), puis **Partager → Sur l'écran
d'accueil**. L'app s'ouvre alors en plein écran et fonctionne sans réseau.

Trois limites d'iOS, assumées :

1. **Les données vivent dans l'app installée.** Supprimer l'icône efface
   l'historique. D'où l'export `.json` prévu, et son rappel mensuel.
2. **Pas de vibration** : Safari n'implémente pas la Vibration API. Le retour de
   validation est visuel.
3. **Le minuteur de repos n'est fiable qu'au premier plan.** L'écran reste
   allumé pendant la séance ; si l'app passe en arrière-plan, le temps restant
   est recalculé depuis son horodatage au retour.

## Comment se calcule le tonnage

`Σ(répétitions × charge)` sur les **séries de travail** :

- l'échauffement est enregistré, marqué `W`, et exclu ;
- le poids du corps est exclu — sur une traction ou des dips lestés, seul le
  **lest** compte en kilos ; les répétitions sont comptées à part ;
- un exercice au poids du corps, en durée ou en distance ne produit pas de
  tonnage : il compte en répétitions et en séries dures.

Une seule définition, dans [`src/data/metriques.ts`](src/data/metriques.ts).

## Organisation

```
scripts/build-catalog.mjs   catalogue + illustrations (SVGO, currentColor, noms FR)
scripts/fetch-fonts.mjs     auto-hébergement des polices
src/ui/tokens.css           toute la direction visuelle
src/ui/BarreChargee.tsx     la signature : le tonnage se charge comme une barre
src/data/metriques.ts       tonnage, 1RM Epley, comparaisons, alertes
src/data/disques.ts         calculateur de chargement de barre
src/charts/                 graphiques faits main, sans librairie
```

Les données de démonstration sont isolées dans `src/data/demo.ts` et
disparaîtront au lot 1, quand IndexedDB prendra le relais.

Attributions des illustrations et des polices : [CREDITS.md](CREDITS.md).
