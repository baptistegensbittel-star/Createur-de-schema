# Créateur de schéma électrique

Application web simple pour dessiner des schémas de circuits électriques (pile, lampe, interrupteur, générateur, moteur, diode, DEL, résistance) en plaçant des composants sur un canevas et en les reliant par des fils, comme sur un schéma de manuel scolaire.

## Utilisation

Ouvre `index.html` dans un navigateur, ou sers le dossier avec un petit serveur local :

```bash
python3 -m http.server 8000
```

puis va sur `http://localhost:8000`.

- **Glisser-déposer** un composant depuis la palette de gauche vers le canevas.
- **Cliquer sur une borne** (petit rond) d'un composant puis sur une autre borne pour tracer un fil.
- **Cliquer sur un composant ou un fil** pour le sélectionner, puis utiliser les boutons *Pivoter* / *Supprimer*.
- **Enregistrer / Charger** sauvegardent le schéma dans le navigateur (localStorage).
- **Exporter PNG** télécharge une image du schéma.

## État actuel

Les icônes des composants sont pour l'instant des symboles vectoriels de remplacement (dessinés en SVG), en attendant les vraies images. Pour utiliser une image réelle pour un composant :

1. Dépose le fichier image dans `assets/images/` (ex : `assets/images/pile.png`).
2. Dans `app.js`, renseigne le chemin dans `imageSrc` pour ce composant, dans l'objet `COMPONENT_TYPES`.

Le placeholder disparaît automatiquement dès qu'une image est renseignée — aucune autre modification n'est nécessaire.
