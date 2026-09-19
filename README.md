# Salle — carnet de tonnage

Suivi de séances de musculation pour iPhone. Application web installable (PWA) :
pas d'App Store, pas de compte, pas de serveur. Les données restent dans le
téléphone, l'hébergement est gratuit.

Cible : **iPhone 17 / 17 Pro** (402 × 874 pt), thème sombre uniquement.

## Les cinq écrans

| Onglet | Ce qu'on y fait |
|---|---|
| **Accueil** | Tonnage des 7 derniers jours, régularité du mois en points, raccourcis vers les séances favorites, volume par groupe, records récents |
| **Séances** | Gérer ses modèles : créer, composer, réordonner, mettre en favorite |
| **＋** | Feuille « Démarrer » : reprendre, une favorite, une autre séance, ou une séance libre |
| **Historique** | Bandeau de régularité sur quatre mois, séances par mois, détail série par série |
| **Progrès** | Courbe de tonnage par séance, 1RM estimé par exercice, séries dures par muscle contre la fourchette 10–20 |

Les **réglages** (barre, disques, règles de calcul, crédits) s'ouvrent depuis
l'engrenage de l'accueil.

Pendant une séance, la barre d'onglets disparaît : l'écran passe en mode
concentré et la place revient au pavé de saisie.

## Direction visuelle — « Noir & Fluo »

Deux couleurs portent tout le sens. Le **vert fluo** dit « action » et
« au-dessus », le **corail** dit « en dessous ». Tout le reste est noir, blanc et
gris — y compris dans les graphiques, où l'identité d'une série vient toujours
de son étiquette, jamais d'une teinte.

Tous les jetons sont dans [`src/ui/tokens.css`](src/ui/tokens.css). Typographie :
**Geist** pour l'interface et les grands chiffres, **Geist Mono** pour les
colonnes de saisie et les minuteurs. Icônes : tracés **Lucide** en ligne, sans
dépendance.

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

> Sur cette machine, `node` n'est pas dans le `PATH` système, ce qui casse les
> scripts npm lancés hors d'un terminal configuré. `.claude/launch.json` appelle
> `node.exe` par son chemin complet pour contourner le problème.

## État

Les cinq écrans tournent sur un **jeu de démonstration** engendré par
[`src/data/demo.ts`](src/data/demo.ts) : trois modèles et un trimestre de
séances, avec progression, bruit et semaine de décharge. Le parcours complet est
navigable, mais rien n'est encore enregistré — **IndexedDB est le prochain lot**,
et ne touchera que la coquille [`src/app/Shell.tsx`](src/app/Shell.tsx), qui tient
tout l'état.

## Déploiement

Pousser sur `main` déclenche `.github/workflows/pages.yml`, qui construit et
publie sur GitHub Pages. Le chemin de base suit le nom du dépôt.

Côté dépôt, une fois : **Settings → Pages → Source : GitHub Actions**.

## Installer sur l'iPhone

Ouvrir l'adresse dans **Safari** (pas Chrome), puis **Partager → Sur l'écran
d'accueil**. L'app s'ouvre en plein écran et fonctionne sans réseau.

Trois limites d'iOS, assumées :

1. **Les données vivent dans l'app installée.** Supprimer l'icône efface
   l'historique. D'où l'export `.json` prévu.
2. **Pas de vibration** : Safari n'implémente pas la Vibration API. Le retour de
   validation est visuel.
3. **Le minuteur de repos n'est fiable qu'au premier plan.** Le temps restant est
   recalculé depuis son horodatage au retour de l'arrière-plan.

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
src/app/            coquille, routeur (pushState), état de l'application
src/ui/             tokens, icônes, composants partagés
src/screens/        les neuf écrans
src/charts/         graphiques faits main, sans librairie
src/data/
  modele.ts         les formes de données
  metriques.ts      tonnage, 1RM Epley, comparaisons, alertes
  selection.ts      les questions que les écrans posent aux données
  disques.ts        calculateur de chargement de barre
  demo.ts           jeu de démonstration — à supprimer au lot suivant
scripts/            catalogue d'exercices et auto-hébergement des polices
```

Attributions des illustrations, polices et icônes : [CREDITS.md](CREDITS.md).
