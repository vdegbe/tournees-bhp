# Note de protection des données (à valider avec l'employeur)

Cette note décrit ce que fait l'application. Elle ne remplace pas l'avis du délégué à la protection des données de l'entreprise.

## Données traitées
| Donnée | Où elle va | Durée |
|---|---|---|
| Export twimm (adresses des logements, BI, consignes) | Lu dans le navigateur ; jamais envoyé à un serveur du projet | Liste importée : 48 h avec la dernière tournée |
| Adresses des logements | Envoyées au service d'adresses de l'État (api-adresse.data.gouv.fr) pour être placées sur la carte ; coordonnées envoyées à OSRM pour les temps de trajet | Mémoire locale des adresses localisées : 30 jours |
| Domicile du technicien | Même chemin que les adresses ; mémorisé dans son navigateur ; non écrit sur la fiche | Jusqu'à effacement par le technicien (onglet « Données ») |
| Avancement (fait / absent / impossible) | Navigateur seulement | 48 h avec la tournée |
| Bilan cumulé (kilomètres, minutes, nombre d'arrêts) | Navigateur seulement, sans adresse | Jusqu'à effacement |

## Ce que les techniciens doivent savoir
- Leur domicile est envoyé au service d'adresses de l'État pour être placé sur la carte, et sert de point de départ dans le lien Google Maps de la tournée complète.
- Ils peuvent tout effacer à tout moment : onglet « Données » → « Effacer toutes les données de cet appareil ».
- Les noms et téléphones des locataires ne sont jamais repris dans la fiche. La ligne « Contraintes » de twimm (contact gardien) l'est.

## Points à décider avec l'employeur
1. Dépôt GitHub en privé (code non public) et hébergeur avec dépôt privé gratuit (Cloudflare Pages ou Netlify).
2. Information écrite des techniciens et base légale (intérêt légitime de l'entreprise, ou accord du technicien pour le domicile).
3. Service de calcul d'itinéraires : le serveur public de démonstration d'OSRM n'est pas prévu pour un usage intensif. Pour un usage régulier, héberger son propre OSRM ou choisir un fournisseur sous contrat (adapter `OSRM` dans `src/js/20-map-core.js` et la politique de sécurité dans `src/template.html`).
4. Fond de carte : les tuiles OpenStreetMap conviennent à un usage interne léger ; au-delà, un fournisseur de tuiles dédié.
