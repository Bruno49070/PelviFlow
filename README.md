# PelviFlow

PelviFlow est une application web progressive (PWA) minimaliste qui guide une routine d’exercices du plancher pelvien : Kegels, Reverse Kegels et alternance.

## Fonctionnalités

- jauge verticale et bulle animée pour visualiser l’intensité demandée ;
- routine guidée en six phases ;
- compteurs de répétitions et minuteries précises ;
- pause, reprise et passage à la phase suivante ;
- durées personnalisables ;
- sons et vibrations optionnels ;
- historique des séances conservé localement sur l’appareil ;
- installation comme application et fonctionnement hors ligne après le premier chargement.

## Utiliser l’application

La version publiée est accessible à l’adresse suivante :

[Ouvrir PelviFlow](https://pelviflow.bruno49070.chatgpt.site)

## Lancer le projet localement

Prérequis : Node.js 22.13 ou version ultérieure.

```bash
npm install
npm run dev
```

L’application est ensuite disponible sur l’adresse indiquée dans le terminal.

## Données personnelles

Les préférences et l’historique sont enregistrés uniquement dans le stockage local du navigateur. Aucun compte utilisateur ni base de données distante ne sont utilisés.

## Structure principale

- `app/page.tsx` : logique de la routine et interface ;
- `app/globals.css` : identité visuelle et mise en page adaptative ;
- `app/manifest.ts` : configuration PWA ;
- `public/sw.js` : fonctionnement hors ligne.
