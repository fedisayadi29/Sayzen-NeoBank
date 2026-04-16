# Frontend - Neobank

Application React pour la néobanque.

## Structure

- `src/` : code source principal
  - `api/` : configuration Axios
  - `components/` : composants réutilisables
  - `context/` : gestion de l'authentification
  - `pages/` : pages de l'application (utilisateur et admin)
- `public/` : fichiers statiques et point d'entrée HTML
- `build/` : sortie de production générée par `npm run build`

## Commandes

- `npm install`
- `npm start` : lance l'application en mode développement
- `npm run build` : génère le bundle de production

## Configuration

- `REACT_APP_API_URL` : URL de l'API backend

Le frontend se connecte au backend via Axios et utilise React Router pour la navigation.
