# Publier l'application et l'installer sur les téléphones

Les chemins du projet sont relatifs : l'application fonctionne aussi bien à la racine d'un domaine que dans un sous-dossier (`https://compte.github.io/tournees-bhp/`).

## Option A : GitHub Pages (le plus rapide, dépôt public)
1. github.com → **New repository** → nom `tournees-bhp` → Public → ne rien cocher → Create.
2. Dans le dossier du projet (dézippé) :
   ```
   git remote add origin https://github.com/VOTRE-COMPTE/tournees-bhp.git
   git push -u origin master
   ```
3. Dépôt → **Settings → Pages** → Source : *Deploy from a branch* → branche `master`, dossier `/ (root)` → Save.
4. Après 1 à 2 minutes : `https://VOTRE-COMPTE.github.io/tournees-bhp/`.

Le dépôt ne contient aucune donnée (ni export twimm, ni adresse), seulement le code.

## Option B : Cloudflare Pages (dépôt privé gratuit)
1. Créer le dépôt GitHub en **Private** et pousser comme ci-dessus.
2. dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** → choisir le dépôt.
3. Build command : *(vide)* ; Build output directory : `/` → Save and Deploy.
4. Adresse obtenue : `https://tournees-bhp.pages.dev`.

## Installer sur le téléphone
- **Android (Chrome)** : ouvrir l'adresse → menu ⋮ → *Installer l'application*.
- **iPhone (Safari uniquement)** : ouvrir l'adresse → bouton Partager → *Sur l'écran d'accueil*.

Premier lancement : ouvrir l'application une fois avec du réseau (pour qu'elle se mémorise), saisir son prénom et son domicile, importer l'export twimm, calculer.

## Mettre à jour
Modifier le code, `npm run build`, `git commit`, `git push`. Les téléphones récupèrent la nouvelle version à la prochaine ouverture avec du réseau.
