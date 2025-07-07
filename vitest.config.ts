import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Le plugin force la lecture et l'application du tsconfig.json
  plugins: [tsconfigPaths()],
  
  test: {
    // On réaffirme que les globales doivent être activées.
    // C'est la source des 'vi', 'describe', 'it', etc.
    globals: true,
    
    // On garde notre fichier de setup pour les variables d'environnement.
    setupFiles: ['vitest.setup.ts'],
    
    // On s'assure que l'environnement est bien Node.js.
    environment: 'node',
  },
});