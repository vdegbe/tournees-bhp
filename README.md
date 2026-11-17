# Tournées des techniciens (BHP)

Page web autonome et installable sur téléphone : à partir de l'export twimm du jour (ou d'adresses collées), elle répartit les interventions entre les techniciens, calcule l'ordre de passage depuis et vers leur domicile en respectant les créneaux, et produit une fiche (carte, heures d'arrivée, liens de navigation, mode terrain, agenda). Projet indépendant de l'application des certificats de non-infestation.

## Fonctions
- **Créneaux et horaires** : créneaux et technicien prévus lus dans l'export (« Passages prévus »), consignes horaires reconnues (« à partir de 10h00 », « avant 17h », « entre 9h et 12h »). Heures d'arrivée, attentes, retards et « départ conseillé » affichés.
- **Un arrêt par immeuble** : plusieurs logements à la même adresse, le même jour, pour le même technicien = un arrêt (étages dans l'ordre, durées additionnées).
- **Trajets réels** : temps et distances par la route (OSRM) ; si le service est indisponible, estimation signalée.
- **Répartition** : plusieurs techniciens (géographie et charge), plusieurs jours (on remplit le premier jour, le surplus passe au suivant), technicien et jour prévus par twimm respectés. Départ : domicile ou adresse commune. Fin : domicile, dernier arrêt ou adresse commune.
- **Sur le terrain** : application installable, fonctionne sans réseau (dernière tournée et tuiles déjà vues), mode « arrêt suivant » (fait / absent / impossible), compte rendu à partager, agenda `.ics`, fiche imprimable.
- **Bilan** : kilomètres et minutes économisés par rapport à l'ordre des lignes de l'export, cumul par mois, coût carburant et horaire selon des hypothèses saisies, export CSV. Mémorisé localement, sans adresse.
- **Fiabilité** : adresses douteuses listées avec correction mémorisée, effacement des données, politique de sécurité (CSP) restreinte aux trois services utilisés.

## Utilisation
1. Saisir le prénom et le domicile de chaque technicien (mémorisés dans le navigateur seulement).
2. Importer l'export twimm (.csv) et cocher les interventions, ou coller des adresses (« adresse code postal ville | note »).
3. « Calculer les tournées », puis corriger les adresses signalées si besoin.

## Données et vie privée
Voir `docs/RGPD.md`. En bref : le dépôt ne contient aucune donnée ; l'export twimm est lu dans le navigateur ; les adresses (et domiciles) sont envoyées au service d'adresses de l'État et à OSRM pour la carte et les trajets ; tout le reste reste dans le navigateur, effaçable à tout moment.

## Développement
- `src/js/10-twimm.js` lecture du CSV, adresse, étage/porte, créneaux, consignes horaires, noms ·
  `20-map-core.js` adresses, liens, matrice de trajets · `25-sched.js` visites, arrêts, répartition, ordre de passage ·
  `26-export.js` texte, agenda, bilan · `30…34` écrans de saisie, calcul, affichage · `40-field.js` mode terrain · `50-bilan.js`, `60-data.js`, `90-init.js`.
- `npm test` (Node ≥ 20) : 23 tests (lecture des exports, planification, exports, construction et sécurité).
- `npm run build` régénère `index.html`, `sw.js` (avec sa version) et recopie `public/` ; ne pas modifier ces fichiers à la main. Un test et l'intégration continue (`.github/workflows/test.yml`) vérifient qu'ils sont à jour.
- Leaflet 1.9.4 est inclus dans `vendor/` (licence BSD-2) ; le mettre à jour à la main.
- Pour publier : GitHub Pages sur la branche `master`, ou Cloudflare Pages / Netlify avec un dépôt privé.
