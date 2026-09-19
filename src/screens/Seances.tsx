import { useState } from 'preact/hooks';
import type { Modele, SeanceFaite } from '../data/modele';
import { derniereDe, nombreDe, tonnageSeance } from '../data/selection';
import { LigneModele } from '../ui/CarteSeance';
import { Ecran, Section } from '../ui/Ecran';
import { Icone } from '../ui/Icone';
import './seances.css';

interface Props {
  modeles: Modele[];
  historique: SeanceFaite[];
  onOuvrir: (m: Modele) => void;
  onFavorite: (m: Modele) => void;
  onNouvelle: () => void;
}

type Filtre = 'toutes' | 'favorites';

export function Seances({ modeles, historique, onOuvrir, onFavorite, onNouvelle }: Props) {
  const [filtre, setFiltre] = useState<Filtre>('toutes');

  const visibles = filtre === 'favorites' ? modeles.filter((m) => m.favorite) : modeles;

  return (
    <Ecran
      titre="Séances"
      sous={`${modeles.length} modèles`}
      action={
        <button type="button" class="bouton-rond bouton-rond--vert" onClick={onNouvelle} aria-label="Nouvelle séance">
          <Icone nom="plus" taille={22} />
        </button>
      }
    >
      <div class="filtres" role="group" aria-label="Filtrer les séances">
        {(
          [
            ['toutes', 'Toutes'],
            ['favorites', 'Favorites'],
          ] as [Filtre, string][]
        ).map(([id, nom]) => (
          <button
            key={id}
            type="button"
            class="filtre"
            data-actif={filtre === id}
            aria-pressed={filtre === id}
            onClick={() => setFiltre(id)}
          >
            {nom}
          </button>
        ))}
      </div>

      <Section>
        {visibles.length === 0 ? (
          <div class="vide">
            <p class="vide__titre">Aucune séance en favorite</p>
            <p class="vide__texte">
              L'étoile d'une séance la remonte sur l'accueil, à portée de pouce.
            </p>
          </div>
        ) : (
          <ul class="liste-modeles">
            {visibles.map((m) => {
              const derniere = derniereDe(historique, m.id);
              return (
                <LigneModele
                  key={m.id}
                  modele={m}
                  dernierTonnage={derniere && tonnageSeance(derniere)}
                  derniereDate={derniere?.date}
                  nombreFois={nombreDe(historique, m.id)}
                  onOuvrir={() => onOuvrir(m)}
                  onFavorite={() => onFavorite(m)}
                />
              );
            })}
          </ul>
        )}
      </Section>

      <button type="button" class="ajouter" onClick={onNouvelle}>
        <Icone nom="plus" taille={18} />
        Créer une séance
      </button>
    </Ecran>
  );
}
