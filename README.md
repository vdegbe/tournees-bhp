# Tournées des techniciens (BHP)

Page web autonome : à partir de l'export twimm du jour (ou d'adresses collées), elle place les logements sur une carte,
calcule un ordre de passage depuis et vers le domicile du technicien, et produit une fiche imprimable avec les liens « Y aller » (Google Maps, Waze).
Projet indépendant de l'application des certificats de non-infestation.

## Utilisation
1. Ouvrir `index.html` (ou l'adresse publiée), saisir le prénom du technicien et son domicile.
2. Importer l'export twimm (.csv) et cocher les interventions de la tournée, ou coller des adresses (« adresse code postal ville | note »).
3. « Calculer la tournée » → carte, fiche arrêt par arrêt, liens de navigation, impression / PDF depuis le navigateur.

## Données et vie privée
- Le dépôt ne contient aucune donnée : l'export twimm est lu dans le navigateur et n'est jamais envoyé nulle part.
- Le domicile est mémorisé dans le navigateur du technicien seulement ; il n'apparaît pas sur la fiche.
- Services externes appelés depuis le navigateur : Base Adresse Nationale (api-adresse.data.gouv.fr, adresses seules) et tuiles OpenStreetMap (fond de carte). Les liens Google Maps / Waze contiennent des coordonnées, dont celles du domicile pour la tournée complète.
- Les téléphones des locataires ne sont jamais repris ; la ligne « Contraintes » (contact gardien) l'est.
- Les tuiles OpenStreetMap conviennent à un usage interne léger ; au-delà, prévoir un fournisseur de tuiles dédié.

## Développement
- `src/js/10-twimm.js` : lecture du CSV twimm, adresse du logement, étage et porte.
- `src/js/20-map-core.js` : adresses, ordre de passage (plus proche voisin + 2-opt), liens (fonctions pures, testées).
- `src/js/30-map-ui.js` : écran, carte Leaflet, fiche.
- `npm test` (Node ≥ 20) ; `npm run build` régénère `index.html` (ne pas le modifier à la main).
- Leaflet 1.9.4 est inclus dans `vendor/` (licence BSD-2).
